import { zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { GET as diffGet } from '../src/pages/api/v1/packages/[owner]/[pkg]/diff';
import { seedPackage, seedVersion } from './helpers';

function ctx(owner: string, pkg: string, from: string, to: string) {
  return {
    request: new Request(`http://test/api/v1/packages/${owner}/${pkg}/diff?from=${from}&to=${to}`),
    params: { owner, pkg },
    url: new URL(`http://test/api/v1/packages/${owner}/${pkg}/diff?from=${from}&to=${to}`),
  } as any;
}

describe('GET /api/v1/packages/<name>/diff', () => {
  it('classifica arquivo adicionado, removido, modificado e inalterado', async () => {
    const { packageId, name } = await seedPackage({ ownerHandle: 'diff-owner', pkgSlug: 'algo', kind: 'skill' });
    const [owner, pkg] = name.split('/');

    const v1 = zipSync({
      'algo.md': new TextEncoder().encode('linha 1\nlinha 2\n'),
      'removido.md': new TextEncoder().encode('vai sumir'),
      'igual.md': new TextEncoder().encode('não muda'),
    });
    await seedVersion({ packageId, version: '1.0.0', content: v1, r2Key: `test/${name}/1.0.0.zip` });

    const v2 = zipSync({
      'algo.md': new TextEncoder().encode('linha 1\nlinha 2 mudou\n'),
      'novo.md': new TextEncoder().encode('arquivo novo'),
      'igual.md': new TextEncoder().encode('não muda'),
    });
    await seedVersion({ packageId, version: '2.0.0', content: v2, r2Key: `test/${name}/2.0.0.zip` });

    const res = await diffGet(ctx(owner, pkg, '1.0.0', '2.0.0'));
    expect(res.status).toBe(200);
    const body: any = await res.json();

    const byPath = Object.fromEntries(body.files.map((f: any) => [f.path, f]));
    expect(byPath['novo.md'].status).toBe('added');
    expect(byPath['removido.md'].status).toBe('removed');
    expect(byPath['algo.md'].status).toBe('modified');
    expect(byPath['algo.md'].hunks.length).toBeGreaterThan(0);
    expect(byPath['igual.md']).toBeUndefined();
  });

  it('classifica arquivo binário como binary, sem hunks de texto', async () => {
    const { packageId, name } = await seedPackage({ ownerHandle: 'diff-bin-owner', pkgSlug: 'bin', kind: 'skill' });
    const [owner, pkg] = name.split('/');

    const v1 = zipSync({ 'img.png': new Uint8Array([0x89, 0x50, 0x4e, 0x00, 0x01]) });
    await seedVersion({ packageId, version: '1.0.0', content: v1, r2Key: `test/${name}/1.0.0.zip` });
    const v2 = zipSync({ 'img.png': new Uint8Array([0x89, 0x50, 0x4e, 0x00, 0x02]) });
    await seedVersion({ packageId, version: '2.0.0', content: v2, r2Key: `test/${name}/2.0.0.zip` });

    const res = await diffGet(ctx(owner, pkg, '1.0.0', '2.0.0'));
    const body: any = await res.json();
    expect(body.files).toEqual([{ path: 'img.png', status: 'binary' }]);
  });

  it('retorna 400 quando from ou to estão ausentes', async () => {
    const res = await diffGet({
      request: new Request('http://test/api/v1/packages/@a/b/diff?from=1.0.0'),
      params: { owner: '@a', pkg: 'b' },
      url: new URL('http://test/api/v1/packages/@a/b/diff?from=1.0.0'),
    } as any);
    expect(res.status).toBe(400);
  });

  it('retorna 404 quando uma das versões não existe', async () => {
    const { packageId, name } = await seedPackage({ ownerHandle: 'diff-404-owner', pkgSlug: 'x', kind: 'skill' });
    const [owner, pkg] = name.split('/');
    const v1 = zipSync({ 'x.md': new TextEncoder().encode('a') });
    await seedVersion({ packageId, version: '1.0.0', content: v1, r2Key: `test/${name}/1.0.0.zip` });

    const res = await diffGet(ctx(owner, pkg, '1.0.0', '9.9.9'));
    expect(res.status).toBe(404);
  });
});
