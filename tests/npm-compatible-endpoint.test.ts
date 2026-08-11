import { describe, expect, it } from 'vitest';
import { GET as npmGet } from '../src/pages/api/npm/[...name]';
import { sriFromHex } from '../src/lib/hash';
import { seedPackage, seedVersion } from './helpers';

function ctx(url: string, name: string) {
  return { request: new Request(url), params: { name } } as any;
}

describe('GET /api/npm/<name>', () => {
  it('retorna dist-tags e versões com dist.tarball/integrity/shasum pra um plugin', async () => {
    const { packageId, name } = await seedPackage({ ownerHandle: 'npm-owner', pkgSlug: 'npm-pkg', kind: 'plugin' });
    const { sha256 } = await seedVersion({ packageId, version: '1.0.0', r2Key: 'packages/npm-owner/npm-pkg/1.0.0.tgz' });

    const res = await npmGet(ctx(`http://test/api/npm/${name}`, name));
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.name).toBe(name);
    expect(body['dist-tags'].latest).toBe('1.0.0');
    const version = body.versions['1.0.0'];
    expect(version.dist.tarball).toContain(`/api/v1/packages/${name}/versions/1.0.0/download`);
    expect(version.dist.integrity).toBe(sriFromHex('sha256', sha256));
    expect(typeof version.dist.shasum).toBe('string');
  });

  it('retorna 404 pra uma skill (não é plugin)', async () => {
    const { name } = await seedPackage({ ownerHandle: 'npm-owner-2', pkgSlug: 'a-skill', kind: 'skill' });
    const res = await npmGet(ctx(`http://test/api/npm/${name}`, name));
    expect(res.status).toBe(404);
  });

  it('retorna 404 pra um pacote inexistente', async () => {
    const res = await npmGet(ctx('http://test/api/npm/@nobody/nothing', '@nobody/nothing'));
    expect(res.status).toBe(404);
  });
});
