import { createExecutionContext } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { POST as publishPost } from '../src/pages/api/v1/packages/[owner]/[pkg]/versions';
import { publishForm, sessionTokenFor } from './helpers';

function ctx(url: string, params: Record<string, string>, init?: RequestInit) {
  return { request: new Request(url, init), params, locals: { cfContext: createExecutionContext() } } as any;
}

async function browserPublishRequest(
  owner: string,
  pkg: string,
  token: string | null,
  manifest: Record<string, unknown>,
  opts: { secFetchSite?: string } = {},
) {
  const form = publishForm(manifest, { content: 'conteudo-do-artefato' });
  const headers: Record<string, string> = {};
  if (token) headers.Cookie = `pepehub_session=${token}`;
  if (opts.secFetchSite !== null) headers['Sec-Fetch-Site'] = opts.secFetchSite ?? 'same-origin';

  return publishPost(
    ctx(`http://test/api/v1/packages/${owner}/${pkg}/versions`, { owner, pkg }, {
      method: 'POST',
      body: form,
      headers,
    }),
  );
}

describe('POST /api/v1/packages/<name>/versions via cookie (upload no navegador)', () => {
  it('publica com o cookie de sessão quando Sec-Fetch-Site é same-origin', async () => {
    const token = await sessionTokenFor('dave');
    const res = await browserPublishRequest('@dave', 'skill-via-upload', token, {
      kind: 'skill',
      version: '1.0.0',
      category: 'tool',
    });
    expect(res.status).toBe(201);
  });

  it('recusa o cookie quando Sec-Fetch-Site é cross-site', async () => {
    const token = await sessionTokenFor('erin');
    const res = await browserPublishRequest(
      '@erin',
      'algo',
      token,
      { kind: 'skill', version: '1.0.0', category: 'tool' },
      { secFetchSite: 'cross-site' },
    );
    expect(res.status).toBe(401);
  });

  it('recusa o cookie quando o header Sec-Fetch-Site está ausente', async () => {
    const token = await sessionTokenFor('frank');
    const res = await browserPublishRequest(
      '@frank',
      'algo',
      token,
      { kind: 'skill', version: '1.0.0', category: 'tool' },
      { secFetchSite: null as unknown as string },
    );
    expect(res.status).toBe(401);
  });

  it('continua exigindo o namespace bater com o handle da sessão do cookie', async () => {
    const token = await sessionTokenFor('grace');
    const res = await browserPublishRequest('@henry', 'algo', token, {
      kind: 'skill',
      version: '1.0.0',
      category: 'tool',
    });
    expect(res.status).toBe(403);
  });
});
