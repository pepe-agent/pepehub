import { createExecutionContext } from 'cloudflare:test';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST as publishPost } from '../src/pages/api/v1/packages/[owner]/[pkg]/versions';
import { POST as trustedPublisherPost } from '../src/pages/api/v1/packages/[owner]/[pkg]/trusted-publisher';
import { publishForm, sessionTokenFor } from './helpers';

function ctx(url: string, params: Record<string, string> = {}, init?: RequestInit) {
  return { request: new Request(url, init), params, locals: { cfContext: createExecutionContext() } } as any;
}

function auth(token: string): RequestInit {
  return { headers: { Authorization: `Bearer ${token}` } };
}

const ISSUER = 'https://token.actions.githubusercontent.com';
const AUDIENCE = 'pepehub';

// jose's createRemoteJWKSet caches fetched keys by kid at module scope (a
// deliberate prod optimization in src/lib/trustedPublisher.ts, so publish
// doesn't refetch GitHub's JWKS on every request). A unique kid per test
// forces a fresh fetch instead of silently reusing another test's key.
async function setUpOidc() {
  const kid = crypto.randomUUID();
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = await exportJWK(publicKey);
  jwk.kid = kid;
  jwk.alg = 'RS256';
  jwk.use = 'sig';

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('token.actions.githubusercontent.com/.well-known/jwks')) {
        return new Response(JSON.stringify({ keys: [jwk] }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`unexpected fetch in oidc test: ${url}`);
    }),
  );

  return { privateKey, kid };
}

async function signToken(
  privateKey: CryptoKey,
  kid: string,
  claims: { repository: string; job_workflow_ref: string; environment?: string },
) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(privateKey);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('POST /api/v1/packages/<name>/trusted-publisher', () => {
  it('só o dono pode registrar', async () => {
    const ownerToken = await sessionTokenFor('tp-owner');
    const publishRes = await publishPost(
      ctx('http://test/api/v1/packages/@tp-owner/tp-pkg/versions', { owner: '@tp-owner', pkg: 'tp-pkg' }, {
        method: 'POST',
        body: publishForm({ kind: 'plugin', version: '1.0.0', category: 'tool' }, { content: 'x' }),
        ...auth(ownerToken),
      }),
    );
    expect(publishRes.status).toBe(201);

    const strangerToken = await sessionTokenFor('tp-stranger');
    const res = await trustedPublisherPost(
      ctx('http://test/api/v1/packages/@tp-owner/tp-pkg/trusted-publisher', { owner: '@tp-owner', pkg: 'tp-pkg' }, {
        method: 'POST',
        body: JSON.stringify({ repository: 'tp-owner/repo', workflowFilename: 'publish.yml' }),
        ...auth(strangerToken),
      }),
    );
    expect(res.status).toBe(403);
  });
});

describe('publish via token OIDC do GitHub Actions', () => {
  it('aceita um token OIDC válido cujo repo/workflow batem com o publisher confiável registrado', async () => {
    const ownerToken = await sessionTokenFor('oidc-owner');
    await publishPost(
      ctx('http://test/api/v1/packages/@oidc-owner/oidc-pkg/versions', { owner: '@oidc-owner', pkg: 'oidc-pkg' }, {
        method: 'POST',
        body: publishForm({ kind: 'plugin', version: '1.0.0', category: 'tool' }, { content: 'x' }),
        ...auth(ownerToken),
      }),
    );
    const register = await trustedPublisherPost(
      ctx('http://test/api/v1/packages/@oidc-owner/oidc-pkg/trusted-publisher', { owner: '@oidc-owner', pkg: 'oidc-pkg' }, {
        method: 'POST',
        body: JSON.stringify({ repository: 'oidc-owner/ci-repo', workflowFilename: 'publish.yml' }),
        ...auth(ownerToken),
      }),
    );
    expect(register.status).toBe(201);

    const { privateKey, kid } = await setUpOidc();
    const oidcToken = await signToken(privateKey, kid, {
      repository: 'oidc-owner/ci-repo',
      job_workflow_ref: 'oidc-owner/ci-repo/.github/workflows/publish.yml@refs/heads/main',
    });

    const publishViaOidc = await publishPost(
      ctx('http://test/api/v1/packages/@oidc-owner/oidc-pkg/versions', { owner: '@oidc-owner', pkg: 'oidc-pkg' }, {
        method: 'POST',
        body: publishForm({ kind: 'plugin', version: '2.0.0', category: 'tool' }, { content: 'from-ci' }),
        ...auth(oidcToken),
      }),
    );
    expect(publishViaOidc.status).toBe(201);
    const body: any = await publishViaOidc.json();
    expect(body.version.version).toBe('2.0.0');
  });

  it('recusa um token OIDC de um repositório diferente do registrado', async () => {
    const ownerToken = await sessionTokenFor('oidc-owner-2');
    await publishPost(
      ctx('http://test/api/v1/packages/@oidc-owner-2/oidc-pkg-2/versions', { owner: '@oidc-owner-2', pkg: 'oidc-pkg-2' }, {
        method: 'POST',
        body: publishForm({ kind: 'plugin', version: '1.0.0', category: 'tool' }, { content: 'x' }),
        ...auth(ownerToken),
      }),
    );
    await trustedPublisherPost(
      ctx(
        'http://test/api/v1/packages/@oidc-owner-2/oidc-pkg-2/trusted-publisher',
        { owner: '@oidc-owner-2', pkg: 'oidc-pkg-2' },
        {
          method: 'POST',
          body: JSON.stringify({ repository: 'oidc-owner-2/the-real-repo', workflowFilename: 'publish.yml' }),
          ...auth(ownerToken),
        },
      ),
    );

    const { privateKey, kid } = await setUpOidc();
    const oidcToken = await signToken(privateKey, kid, {
      repository: 'someone-else/a-different-repo',
      job_workflow_ref: 'someone-else/a-different-repo/.github/workflows/publish.yml@refs/heads/main',
    });

    const res = await publishPost(
      ctx(
        'http://test/api/v1/packages/@oidc-owner-2/oidc-pkg-2/versions',
        { owner: '@oidc-owner-2', pkg: 'oidc-pkg-2' },
        {
          method: 'POST',
          body: publishForm({ kind: 'plugin', version: '2.0.0', category: 'tool' }, { content: 'x' }),
          ...auth(oidcToken),
        },
      ),
    );
    expect(res.status).toBe(403);
    const body: any = await res.json();
    expect(body.error).toBe('oidc_mismatch');
  });

  it('recusa OIDC pra um pacote que ainda não existe (sem publisher confiável possível)', async () => {
    const { privateKey, kid } = await setUpOidc();
    const oidcToken = await signToken(privateKey, kid, {
      repository: 'nobody/repo',
      job_workflow_ref: 'nobody/repo/.github/workflows/publish.yml@refs/heads/main',
    });

    const res = await publishPost(
      ctx('http://test/api/v1/packages/@nobody/never-published/versions', { owner: '@nobody', pkg: 'never-published' }, {
        method: 'POST',
        body: publishForm({ kind: 'plugin', version: '1.0.0', category: 'tool' }, { content: 'x' }),
        ...auth(oidcToken),
      }),
    );
    expect(res.status).toBe(403);
    const body: any = await res.json();
    expect(body.error).toBe('trusted_publisher_required');
  });
});
