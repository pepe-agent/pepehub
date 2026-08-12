import { zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { GET as filesListGet } from '../src/pages/api/v1/packages/[owner]/[pkg]/versions/[version]/files';
import { GET as fileContentGet } from '../src/pages/api/v1/packages/[owner]/[pkg]/versions/[version]/files/[...path]';
import { seedPackage, seedVersion } from './helpers';

function listCtx(owner: string, pkg: string, version: string) {
  return {
    request: new Request(`http://test/api/v1/packages/${owner}/${pkg}/versions/${version}/files`),
    params: { owner, pkg, version },
  } as any;
}

function fileCtx(owner: string, pkg: string, version: string, path: string) {
  return {
    request: new Request(`http://test/api/v1/packages/${owner}/${pkg}/versions/${version}/files/${path}`),
    params: { owner, pkg, version, path },
  } as any;
}

describe('GET /api/v1/packages/<name>/versions/<version>/files', () => {
  it('lista os arquivos com path e tamanho', async () => {
    const { packageId, name } = await seedPackage({ ownerHandle: 'files-owner', pkgSlug: 'lista', kind: 'skill' });
    const zipped = zipSync({
      'lista.md': new TextEncoder().encode('# Lista'),
      'extra.txt': new TextEncoder().encode('mais um arquivo'),
    });
    await seedVersion({ packageId, version: '1.0.0', content: zipped, r2Key: `test/${name}/1.0.0.zip` });

    const [owner, pkg] = name.split('/');
    const res = await filesListGet(listCtx(owner, pkg, '1.0.0'));
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.items.map((i: any) => i.path).sort()).toEqual(['extra.txt', 'lista.md']);
    expect(body.items.find((i: any) => i.path === 'lista.md').sizeBytes).toBeGreaterThan(0);
  });

  it('retorna 404 pra versão inexistente', async () => {
    const { name } = await seedPackage({ ownerHandle: 'files-owner-404', pkgSlug: 'sem-versao', kind: 'skill' });
    const [owner, pkg] = name.split('/');
    const res = await filesListGet(listCtx(owner, pkg, '9.9.9'));
    expect(res.status).toBe(404);
  });
});

describe('GET /api/v1/packages/<name>/versions/<version>/files/<path>', () => {
  it('retorna o conteúdo de um arquivo texto', async () => {
    const { packageId, name } = await seedPackage({ ownerHandle: 'file-content-owner', pkgSlug: 'conteudo', kind: 'skill' });
    const zipped = zipSync({ 'conteudo.md': new TextEncoder().encode('# Título\n\nCorpo do texto.') });
    await seedVersion({ packageId, version: '1.0.0', content: zipped, r2Key: `test/${name}/1.0.0.zip` });

    const [owner, pkg] = name.split('/');
    const res = await fileContentGet(fileCtx(owner, pkg, '1.0.0', 'conteudo.md'));
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.isBinary).toBe(false);
    expect(body.content).toContain('Corpo do texto.');
  });

  it('identifica arquivo binário e não devolve o conteúdo', async () => {
    const { packageId, name } = await seedPackage({ ownerHandle: 'file-binary-owner', pkgSlug: 'binario', kind: 'skill' });
    const binaryBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0x0d, 0x0a, 0x1a, 0x0a]);
    const zipped = zipSync({ 'logo.png': binaryBytes, 'placeholder.md': new TextEncoder().encode('# placeholder') });
    await seedVersion({ packageId, version: '1.0.0', content: zipped, r2Key: `test/${name}/1.0.0.zip` });

    const [owner, pkg] = name.split('/');
    const res = await fileContentGet(fileCtx(owner, pkg, '1.0.0', 'logo.png'));
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.isBinary).toBe(true);
    expect(body.content).toBeNull();
  });

  it('trunca arquivo texto grande demais', async () => {
    const { packageId, name } = await seedPackage({ ownerHandle: 'file-big-owner', pkgSlug: 'grande', kind: 'skill' });
    const bigText = 'a'.repeat(600 * 1024);
    const zipped = zipSync({ 'grande.md': new TextEncoder().encode(bigText) });
    await seedVersion({ packageId, version: '1.0.0', content: zipped, r2Key: `test/${name}/1.0.0.zip` });

    const [owner, pkg] = name.split('/');
    const res = await fileContentGet(fileCtx(owner, pkg, '1.0.0', 'grande.md'));
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.truncated).toBe(true);
    expect(body.content).toBeNull();
    expect(body.sizeBytes).toBe(600 * 1024);
  });

  it('retorna 404 pra arquivo inexistente na versão', async () => {
    const { packageId, name } = await seedPackage({ ownerHandle: 'file-404-owner', pkgSlug: 'sem-arquivo', kind: 'skill' });
    const zipped = zipSync({ 'sem-arquivo.md': new TextEncoder().encode('# x') });
    await seedVersion({ packageId, version: '1.0.0', content: zipped, r2Key: `test/${name}/1.0.0.zip` });

    const [owner, pkg] = name.split('/');
    const res = await fileContentGet(fileCtx(owner, pkg, '1.0.0', 'nao-existe.md'));
    expect(res.status).toBe(404);
  });
});
