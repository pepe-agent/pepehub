import { env } from 'cloudflare:workers';
import { createExecutionContext } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { GET as versionsGet, POST as publishPost } from '../src/pages/api/v1/packages/[owner]/[pkg]/versions';
import { publishForm, sessionTokenFor } from './helpers';

function ctx(url: string, params: Record<string, string>, init?: RequestInit) {
  return { request: new Request(url, init), params, locals: { cfContext: createExecutionContext() } } as any;
}

async function publishRequest(
  owner: string,
  pkg: string,
  token: string | null,
  manifest: Record<string, unknown>,
  artifactContent = 'conteudo-do-artefato',
) {
  const form = publishForm(manifest, { content: artifactContent });
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  return publishPost(
    ctx(`http://test/api/v1/packages/${owner}/${pkg}/versions`, { owner, pkg }, {
      method: 'POST',
      body: form,
      headers,
    }),
  );
}

describe('POST /api/v1/packages/<name>/versions', () => {
  it('retorna 401 sem sessão e não grava nada', async () => {
    const res = await publishRequest('@alice', 'algo', null, {
      kind: 'plugin',
      version: '1.0.0',
      category: 'tool',
    });
    expect(res.status).toBe(401);

    const listRes = await versionsGet(ctx('http://test/api/v1/packages/@alice/algo/versions', { owner: '@alice', pkg: 'algo' }));
    expect(listRes.status).toBe(404);
  });

  it('retorna 403 quando o namespace não bate com quem está publicando', async () => {
    const token = await sessionTokenFor('alice');
    const res = await publishRequest('@bob', 'algo', token, {
      kind: 'plugin',
      version: '1.0.0',
      category: 'tool',
    });
    expect(res.status).toBe(403);

    const listRes = await versionsGet(ctx('http://test/api/v1/packages/@bob/algo/versions', { owner: '@bob', pkg: 'algo' }));
    expect(listRes.status).toBe(404);
  });

  it('publica com sucesso quando o handle bate, criando o pacote implicitamente', async () => {
    const token = await sessionTokenFor('carol');
    const res = await publishRequest('@carol', 'novo-pacote', token, {
      kind: 'plugin',
      version: '1.0.0',
      category: 'tool',
      summary: 'um pacote novo',
    });
    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.name).toBe('@carol/novo-pacote');
    expect(body.version.version).toBe('1.0.0');
    expect(body.version.sha256).toHaveLength(64);

    const stored = await env.ARTIFACTS.get('packages/carol/novo-pacote/1.0.0.tgz');
    expect(stored).not.toBeNull();

    const pkgRow = await env.DB.prepare('SELECT official FROM packages WHERE name = ?')
      .bind('@carol/novo-pacote')
      .first<{ official: number }>();
    expect(pkgRow?.official).toBe(0);
  });

  it('retorna 400 quando a categoria não existe na lista fixa', async () => {
    const token = await sessionTokenFor('dave');
    const res = await publishRequest('@dave', 'algo', token, {
      kind: 'plugin',
      version: '1.0.0',
      category: 'not-a-real-category',
    });
    expect(res.status).toBe(400);
  });

  it('retorna 400 quando a categoria está ausente', async () => {
    const token = await sessionTokenFor('erin');
    const res = await publishRequest('@erin', 'algo', token, {
      kind: 'plugin',
      version: '1.0.0',
    });
    expect(res.status).toBe(400);
  });

  it('grava requires verbatim quando o manifesto declara, e aceita a ausência normalmente', async () => {
    const token = await sessionTokenFor('gina');
    const res = await publishRequest('@gina', 'com-requires', token, {
      kind: 'plugin',
      version: '1.0.0',
      category: 'tool',
      requires: { env: ['TODOIST_API_KEY'], bins: ['curl'] },
    });
    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.version.requires).toEqual({ env: ['TODOIST_API_KEY'], bins: ['curl'] });

    const withoutReqRes = await publishRequest('@gina', 'sem-requires', token, {
      kind: 'plugin',
      version: '1.0.0',
      category: 'tool',
    });
    expect(withoutReqRes.status).toBe(201);
    const withoutReqBody: any = await withoutReqRes.json();
    expect(withoutReqBody.version.requires).toBeNull();
  });

  it('recusa artefato cujos bytes não batem com o kind declarado', async () => {
    const token = await sessionTokenFor('helen');
    const form = new FormData();
    form.set('manifest', JSON.stringify({ kind: 'plugin', version: '1.0.0', category: 'tool' }));
    // Kind "plugin" espera gzip (1f 8b); manda bytes de zip (PK) de propósito.
    form.set('artifact', new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00])], 'artifact'));

    const res = await publishPost(
      ctx('http://test/api/v1/packages/@helen/errado/versions', { owner: '@helen', pkg: 'errado' }, {
        method: 'POST',
        body: form,
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error).toBe('invalid_artifact_format');

    const listRes = await versionsGet(ctx('http://test/api/v1/packages/@helen/errado/versions', { owner: '@helen', pkg: 'errado' }));
    expect(listRes.status).toBe(404);
  });

  it('retorna 409 e não sobrescreve ao tentar publicar uma versão já existente', async () => {
    const token = await sessionTokenFor('frank');
    const manifest = { kind: 'plugin', version: '1.0.0', category: 'tool' };

    const first = await publishRequest('@frank', 'dup', token, manifest, 'conteudo-original');
    expect(first.status).toBe(201);

    const second = await publishRequest('@frank', 'dup', token, manifest, 'conteudo-diferente');
    expect(second.status).toBe(409);

    const stored = await env.ARTIFACTS.get('packages/frank/dup/1.0.0.tgz');
    const storedText = await stored?.text();
    expect(storedText).toContain('conteudo-original');
    expect(storedText).not.toContain('conteudo-diferente');

    const versions = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM package_versions pv JOIN packages p ON p.id = pv.package_id WHERE p.name = ?',
    )
      .bind('@frank/dup')
      .first<{ count: number }>();
    expect(versions?.count).toBe(1);
  });
});
