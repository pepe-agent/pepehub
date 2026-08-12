import { gunzipSync, unzipSync } from 'fflate';

export interface ArchiveFile {
  path: string;
  content: Uint8Array;
}

function readString(bytes: Uint8Array, offset: number, length: number): string {
  const slice = bytes.subarray(offset, offset + length);
  const nullIndex = slice.indexOf(0);
  const usable = nullIndex === -1 ? slice : slice.subarray(0, nullIndex);
  return new TextDecoder().decode(usable);
}

function readOctal(bytes: Uint8Array, offset: number, length: number): number {
  const str = readString(bytes, offset, length).trim();
  return str ? parseInt(str, 8) : 0;
}

// Parser mínimo de tar (blocos de 512 bytes, ustar). Só extrai entradas
// typeflag '0'/'\0' (arquivo regular); diretórios e blocos especiais
// (GNU longname 'L', pax 'x'/'g' etc.) são pulados, não interpretados como
// arquivo. Pacotes de plugin são pequenos (manifest.json + poucos .exs),
// então nomes longos via 'L'/'x' nunca chegaram a ser necessários aqui.
function parseTar(bytes: Uint8Array): ArchiveFile[] {
  const files: ArchiveFile[] = [];
  let offset = 0;

  while (offset + 512 <= bytes.length) {
    const header = bytes.subarray(offset, offset + 512);
    if (header.every((b) => b === 0)) break;

    const name = readString(header, 0, 100);
    const size = readOctal(header, 124, 12);
    const typeflag = String.fromCharCode(header[156]);
    const prefix = readString(header, 345, 155);
    const fullPath = prefix ? `${prefix}/${name}` : name;

    offset += 512;
    if ((typeflag === '0' || typeflag === '\0') && !fullPath.endsWith('/') && fullPath) {
      files.push({ path: fullPath, content: bytes.slice(offset, offset + size) });
    }
    offset += Math.ceil(size / 512) * 512;
  }

  return files;
}

export function extractZip(buffer: ArrayBuffer): ArchiveFile[] {
  const entries = unzipSync(new Uint8Array(buffer));
  return Object.entries(entries)
    .filter(([path]) => !path.endsWith('/'))
    .map(([path, content]) => ({ path, content }));
}

export function extractTarGz(buffer: ArrayBuffer): ArchiveFile[] {
  const tarBytes = gunzipSync(new Uint8Array(buffer));
  return parseTar(tarBytes);
}

// plugin = .tgz (tar+gzip), skill = .zip. Mesma convenção usada em
// sourcePublish.ts (tarball pra plugin, zipball pra skill).
// Confere a assinatura de bytes (PK\x03\x04 pra zip, 1f 8b pra gzip) contra
// o kind declarado, antes de gravar qualquer coisa. Sem isso, um publish com
// o kind errado (ex.: "Skill" selecionado no formulário do navegador com um
// .tgz de plugin escolhido) grava silenciosamente um pacote cujo kind nunca
// mais bate com o conteúdo real do artefato, já que kind é imutável depois
// da primeira versão (ver versions.ts).
export function matchesArchiveFormat(buffer: ArrayBuffer, kind: 'plugin' | 'skill'): boolean {
  const bytes = new Uint8Array(buffer.slice(0, 4));
  if (kind === 'plugin') return bytes[0] === 0x1f && bytes[1] === 0x8b;
  return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

// Ruído de arquivamento do macOS (AppleDouble "._arquivo", .DS_Store,
// pasta __MACOSX de zip), nunca conteúdo real do pacote. `tar`/`zip` do
// macOS grava isso automaticamente sem o usuário pedir.
function isArchivingNoise(path: string): boolean {
  const basename = path.split('/').pop() ?? path;
  return basename.startsWith('._') || basename === '.DS_Store' || path.startsWith('__MACOSX/');
}

export function extractPackageFiles(buffer: ArrayBuffer, kind: 'plugin' | 'skill'): ArchiveFile[] {
  try {
    const files = kind === 'plugin' ? extractTarGz(buffer) : extractZip(buffer);
    return files.filter((f) => !isArchivingNoise(f.path));
  } catch (err) {
    console.error('extractPackageFiles falhou', err);
    return [];
  }
}
