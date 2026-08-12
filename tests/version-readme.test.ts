import { zipSync, gzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { GET as readmeGet } from '../src/pages/api/v1/packages/[owner]/[pkg]/versions/[version]/readme';
import { seedPackage, seedVersion } from './helpers';

function ctx(owner: string, pkg: string, version: string) {
  return {
    request: new Request(`http://test/api/v1/packages/${owner}/${pkg}/versions/${version}/readme`),
    params: { owner, pkg, version },
  } as any;
}

function buildTarEntry(path: string, content: Uint8Array): Uint8Array {
  const header = new Uint8Array(512);
  const encoder = new TextEncoder();
  header.set(encoder.encode(path), 0);
  header.set(encoder.encode('0000644'), 100);
  header.set(encoder.encode('0000000'), 108);
  header.set(encoder.encode('0000000'), 116);
  header.set(encoder.encode(content.length.toString(8).padStart(11, '0')), 124);
  header.set(encoder.encode('00000000000'), 136);
  header[156] = '0'.charCodeAt(0);
  header.set(encoder.encode('ustar'), 257);
  header.set(new Uint8Array(8).fill(32), 148);
  let sum = 0;
  for (const b of header) sum += b;
  header.set(encoder.encode(sum.toString(8).padStart(6, '0') + '\0 '), 148);
  const paddedContentLength = Math.ceil(content.length / 512) * 512;
  const block = new Uint8Array(512 + paddedContentLength);
  block.set(header, 0);
  block.set(content, 512);
  return block;
}

function buildTarGz(files: { path: string; content: string }[]): Uint8Array {
  const encoder = new TextEncoder();
  const parts = files.map((f) => buildTarEntry(f.path, encoder.encode(f.content)));
  const totalSize = parts.reduce((sum, p) => sum + p.length, 0) + 1024;
  const tar = new Uint8Array(totalSize);
  let offset = 0;
  for (const part of parts) {
    tar.set(part, offset);
    offset += part.length;
  }
  return gzipSync(tar);
}

describe('GET /api/v1/packages/<name>/versions/<version>/readme', () => {
  it('encontra e renderiza o .md de uma skill', async () => {
    const { packageId, name } = await seedPackage({ ownerHandle: 'readme-skill-owner', pkgSlug: 'minha-skill', kind: 'skill' });
    const zipped = zipSync({ 'minha-skill.md': new TextEncoder().encode('# Minha skill\n\nUse quando precisar.') });
    await seedVersion({ packageId, version: '1.0.0', content: zipped, r2Key: `test/${name}/1.0.0.zip` });

    const [owner, pkg] = name.split('/');
    const res = await readmeGet(ctx(owner, pkg, '1.0.0'));
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.found).toBe(true);
    expect(body.sourcePath).toBe('minha-skill.md');
    expect(body.html).toContain('<h1>Minha skill</h1>');
  });

  it('encontra README.md de um plugin quando existe', async () => {
    const { packageId, name } = await seedPackage({ ownerHandle: 'readme-plugin-owner', pkgSlug: 'meu-plugin', kind: 'plugin' });
    const tarGz = buildTarGz([
      { path: 'manifest.json', content: '{"name":"meu-plugin"}' },
      { path: 'README.md', content: '# Meu plugin\n\nDescrição.' },
    ]);
    await seedVersion({ packageId, version: '1.0.0', content: tarGz, r2Key: `test/${name}/1.0.0.tgz` });

    const [owner, pkg] = name.split('/');
    const res = await readmeGet(ctx(owner, pkg, '1.0.0'));
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.found).toBe(true);
    expect(body.html).toContain('Meu plugin');
  });

  it('retorna found:false quando o plugin não tem README', async () => {
    const { packageId, name } = await seedPackage({ ownerHandle: 'readme-sem-owner', pkgSlug: 'sem-readme', kind: 'plugin' });
    const tarGz = buildTarGz([{ path: 'manifest.json', content: '{}' }]);
    await seedVersion({ packageId, version: '1.0.0', content: tarGz, r2Key: `test/${name}/1.0.0.tgz` });

    const [owner, pkg] = name.split('/');
    const res = await readmeGet(ctx(owner, pkg, '1.0.0'));
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body).toEqual({ found: false, html: null, sourcePath: null });
  });

  it('retorna 404 pra pacote inexistente', async () => {
    const res = await readmeGet(ctx('@ninguem', 'nada', '1.0.0'));
    expect(res.status).toBe(404);
  });
});
