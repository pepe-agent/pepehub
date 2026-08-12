import { gzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { extractPackageFiles, extractTarGz, extractZip } from '../src/lib/archive';

function buildTarEntry(path: string, content: Uint8Array): Uint8Array {
  const header = new Uint8Array(512);
  const encoder = new TextEncoder();
  header.set(encoder.encode(path), 0);
  header.set(encoder.encode('0000644'), 100); // mode
  header.set(encoder.encode('0000000'), 108); // uid
  header.set(encoder.encode('0000000'), 116); // gid
  header.set(encoder.encode(content.length.toString(8).padStart(11, '0')), 124); // size (octal)
  header.set(encoder.encode('00000000000'), 136); // mtime
  header[156] = '0'.charCodeAt(0); // typeflag: arquivo regular
  header.set(encoder.encode('ustar'), 257);

  // Checksum: soma dos bytes do header com o campo de checksum em branco (espaços).
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

function buildTar(files: { path: string; content: string }[]): Uint8Array {
  const encoder = new TextEncoder();
  const parts = files.map((f) => buildTarEntry(f.path, encoder.encode(f.content)));
  const totalSize = parts.reduce((sum, p) => sum + p.length, 0) + 1024; // + 2 blocos zero de fim
  const tar = new Uint8Array(totalSize);
  let offset = 0;
  for (const part of parts) {
    tar.set(part, offset);
    offset += part.length;
  }
  return tar;
}

describe('extractZip', () => {
  it('extrai os arquivos de um zip, ignorando entradas de diretório', () => {
    const zipped = zipSync({
      'meu-skill.md': new TextEncoder().encode('# Minha skill\n\nUse quando...'),
      'dir/': new Uint8Array(0),
    });
    const files = extractZip(zipped.buffer as ArrayBuffer);
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('meu-skill.md');
    expect(new TextDecoder().decode(files[0].content)).toContain('Minha skill');
  });
});

describe('extractTarGz', () => {
  it('extrai os arquivos de um tar.gz montado à mão', () => {
    const tar = buildTar([
      { path: 'manifest.json', content: '{"name":"chatwoot"}' },
      { path: 'chatwoot.exs', content: 'defmodule Pepe.Plugins.Chatwoot do\nend\n' },
    ]);
    const gz = gzipSync(tar);
    const files = extractTarGz(gz.buffer as ArrayBuffer);

    expect(files).toHaveLength(2);
    const byPath = Object.fromEntries(files.map((f) => [f.path, new TextDecoder().decode(f.content)]));
    expect(byPath['manifest.json']).toBe('{"name":"chatwoot"}');
    expect(byPath['chatwoot.exs']).toContain('defmodule');
  });

  it('lida com conteúdo vazio', () => {
    const tar = buildTar([{ path: 'vazio.txt', content: '' }]);
    const gz = gzipSync(tar);
    const files = extractTarGz(gz.buffer as ArrayBuffer);
    expect(files).toHaveLength(1);
    expect(files[0].content.length).toBe(0);
  });
});

describe('extractPackageFiles filtra ruído de macOS', () => {
  it('remove AppleDouble (._arquivo), .DS_Store e __MACOSX/', () => {
    const zipped = zipSync({
      'meu-skill.md': new TextEncoder().encode('# Skill'),
      '._meu-skill.md': new Uint8Array([0, 5, 22, 7]),
      '.DS_Store': new Uint8Array([1, 2, 3]),
      '__MACOSX/._meu-skill.md': new Uint8Array([0, 5, 22, 7]),
    });
    const files = extractPackageFiles(zipped.buffer as ArrayBuffer, 'skill');
    expect(files.map((f) => f.path)).toEqual(['meu-skill.md']);
  });
});

describe('extractPackageFiles', () => {
  it('usa zip pra skill e tar.gz pra plugin', () => {
    const zipped = zipSync({ 'a.md': new TextEncoder().encode('conteudo') });
    const skillFiles = extractPackageFiles(zipped.buffer as ArrayBuffer, 'skill');
    expect(skillFiles.map((f) => f.path)).toEqual(['a.md']);

    const tar = buildTar([{ path: 'manifest.json', content: '{}' }]);
    const gz = gzipSync(tar);
    const pluginFiles = extractPackageFiles(gz.buffer as ArrayBuffer, 'plugin');
    expect(pluginFiles.map((f) => f.path)).toEqual(['manifest.json']);
  });

  it('retorna lista vazia pra bytes corrompidos, sem lançar erro', () => {
    const garbage = new Uint8Array([1, 2, 3, 4, 5]);
    expect(extractPackageFiles(garbage.buffer as ArrayBuffer, 'plugin')).toEqual([]);
    expect(extractPackageFiles(garbage.buffer as ArrayBuffer, 'skill')).toEqual([]);
  });
});
