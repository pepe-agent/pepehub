import { env } from 'cloudflare:workers';
import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { GET as downloadGet } from '../src/pages/api/v1/packages/[owner]/[pkg]/versions/[version]/download';
import { GET as packageGet } from '../src/pages/api/v1/packages/[owner]/[pkg]/index';
import { GET as versionsGet } from '../src/pages/api/v1/packages/[owner]/[pkg]/versions';
import { GET as searchGet } from '../src/pages/api/v1/search';
import { seedPackage, seedVersion } from './helpers';

function ctx(url: string, params: Record<string, string> = {}) {
  const cfContext = createExecutionContext();
  return { request: new Request(url), params, locals: { cfContext }, cfContext } as any;
}

describe('GET /api/v1/search', () => {
  it('retorna itens que casam com o termo', async () => {
    await seedPackage({ ownerHandle: 'alice', pkgSlug: 'findable-thing', summary: 'um resumo qualquer' });
    const res = await searchGet(ctx('http://test/api/v1/search?q=findable'));
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.items.some((i: any) => i.name === '@alice/findable-thing')).toBe(true);
    expect(body.items[0]).toMatchObject({ kind: 'plugin', official: false });
  });

  it('retorna lista vazia com 200 quando nada casa', async () => {
    const res = await searchGet(ctx('http://test/api/v1/search?q=termo-que-nao-existe-em-lugar-nenhum'));
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.items).toEqual([]);
  });

  it('filtra por categoria válida', async () => {
    await seedPackage({ ownerHandle: 'bob', pkgSlug: 'chan-thing', category: 'channel' });
    const res = await searchGet(ctx('http://test/api/v1/search?category=channel'));
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.items.every((i: any) => i.category === 'channel')).toBe(true);
  });

  it('retorna 400 pra categoria inexistente', async () => {
    const res = await searchGet(ctx('http://test/api/v1/search?category=not-a-category'));
    expect(res.status).toBe(400);
  });

  it('funciona sem header Authorization', async () => {
    const res = await searchGet(ctx('http://test/api/v1/search'));
    expect(res.status).not.toBe(401);
  });
});

describe('GET /api/v1/packages/<name>', () => {
  it('retorna a metadata quando o pacote existe', async () => {
    const { packageId } = await seedPackage({ ownerHandle: 'carol', pkgSlug: 'exists', category: 'tool' });
    await seedVersion({ packageId, version: '1.0.0', r2Key: 'packages/carol/exists/1.0.0.tgz' });

    const res = await packageGet(ctx('http://test/api/v1/packages/@carol/exists', { owner: '@carol', pkg: 'exists' }));
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body).toMatchObject({
      name: '@carol/exists',
      kind: 'plugin',
      category: 'tool',
      owner: 'carol',
      official: false,
      latestVersion: '1.0.0',
    });
  });

  it('retorna 404 quando o pacote não existe', async () => {
    const res = await packageGet(
      ctx('http://test/api/v1/packages/@nobody/nothing', { owner: '@nobody', pkg: 'nothing' }),
    );
    expect(res.status).toBe(404);
  });
});

describe('GET /api/v1/packages/<name>/versions', () => {
  it('lista as versões da mais recente pra mais antiga', async () => {
    const { packageId } = await seedPackage({ ownerHandle: 'dave', pkgSlug: 'multi' });
    await seedVersion({ packageId, version: '1.0.0', r2Key: 'packages/dave/multi/1.0.0.tgz' });
    await seedVersion({ packageId, version: '2.0.0', r2Key: 'packages/dave/multi/2.0.0.tgz' });

    const res = await versionsGet(
      ctx('http://test/api/v1/packages/@dave/multi/versions', { owner: '@dave', pkg: 'multi' }),
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.items.map((v: any) => v.version)).toEqual(['2.0.0', '1.0.0']);
  });

  it('retorna requires quando declarado, e null quando não', async () => {
    const { packageId } = await seedPackage({ ownerHandle: 'gina', pkgSlug: 'reqs' });
    await seedVersion({
      packageId,
      version: '1.0.0',
      r2Key: 'packages/gina/reqs/1.0.0.tgz',
      requires: { env: ['TODOIST_API_KEY'], bins: ['curl'] },
    });
    await seedVersion({ packageId, version: '2.0.0', r2Key: 'packages/gina/reqs/2.0.0.tgz' });

    const res = await versionsGet(
      ctx('http://test/api/v1/packages/@gina/reqs/versions', { owner: '@gina', pkg: 'reqs' }),
    );
    const body: any = await res.json();
    const v1 = body.items.find((v: any) => v.version === '1.0.0');
    const v2 = body.items.find((v: any) => v.version === '2.0.0');
    expect(v1.requires).toEqual({ env: ['TODOIST_API_KEY'], bins: ['curl'] });
    expect(v2.requires).toBeNull();
  });
});

describe('GET /api/v1/packages/<name>/versions/<version>/download', () => {
  it('baixa o artefato com os headers de integridade', async () => {
    const { packageId } = await seedPackage({ ownerHandle: 'erin', pkgSlug: 'downloadable' });
    const { sha256, sizeBytes } = await seedVersion({
      packageId,
      version: '1.0.0',
      r2Key: 'packages/erin/downloadable/1.0.0.tgz',
      content: 'conteudo-do-artefato',
    });

    const requestCtx = ctx('http://test/api/v1/packages/@erin/downloadable/versions/1.0.0/download', {
      owner: '@erin',
      pkg: 'downloadable',
      version: '1.0.0',
    });
    const res = await downloadGet(requestCtx);
    expect(res.status).toBe(200);
    expect(res.headers.get('X-PepeHub-Sha256')).toBe(sha256);
    expect(res.headers.get('Content-Length')).toBe(String(sizeBytes));
    expect(await res.text()).toBe('conteudo-do-artefato');

    await waitOnExecutionContext(requestCtx.cfContext);
    const pkgRow = await env.DB.prepare('SELECT downloads_count FROM packages WHERE name = ?')
      .bind('@erin/downloadable')
      .first<{ downloads_count: number }>();
    expect(pkgRow?.downloads_count).toBe(1);
  });

  it('retorna 404 pra versão inexistente', async () => {
    await seedPackage({ ownerHandle: 'frank', pkgSlug: 'exists-but-no-version' });
    const res = await downloadGet(
      ctx('http://test/api/v1/packages/@frank/exists-but-no-version/versions/9.9.9/download', {
        owner: '@frank',
        pkg: 'exists-but-no-version',
        version: '9.9.9',
      }),
    );
    expect(res.status).toBe(404);
  });
});
