import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { diffLines } from 'diff';
import { extractPackageFiles, type ArchiveFile } from '../../../../../../lib/archive';
import { errorResponse, json } from '../../../../../../lib/http';
import { loadVersionArtifact } from '../../../../../../lib/packageArtifact';

export const prerender = false;

function isBinary(bytes: Uint8Array): boolean {
  const sampleSize = Math.min(bytes.length, 8000);
  for (let i = 0; i < sampleSize; i++) {
    if (bytes[i] === 0) return true;
  }
  return false;
}

function byPath(files: ArchiveFile[]): Map<string, ArchiveFile> {
  return new Map(files.map((f) => [f.path, f]));
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  for (let i = 0; i < a.byteLength; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export const GET: APIRoute = async ({ params, url }) => {
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  if (!from || !to) {
    return errorResponse(400, 'invalid_query', 'from e to são obrigatórios (versões a comparar).');
  }

  const name = `${params.owner}/${params.pkg}`;
  const [loadedFrom, loadedTo] = await Promise.all([
    loadVersionArtifact(env.DB, env.ARTIFACTS, name, from),
    loadVersionArtifact(env.DB, env.ARTIFACTS, name, to),
  ]);
  if ('error' in loadedFrom) return loadedFrom.error;
  if ('error' in loadedTo) return loadedTo.error;

  const fromFiles = byPath(extractPackageFiles(loadedFrom.buffer, loadedFrom.pkg.kind));
  const toFiles = byPath(extractPackageFiles(loadedTo.buffer, loadedTo.pkg.kind));

  const allPaths = new Set([...fromFiles.keys(), ...toFiles.keys()]);
  const files: Array<{
    path: string;
    status: 'added' | 'removed' | 'modified' | 'binary';
    hunks?: { value: string; added?: boolean; removed?: boolean }[];
  }> = [];

  for (const path of [...allPaths].sort()) {
    const fromFile = fromFiles.get(path);
    const toFile = toFiles.get(path);

    if (!fromFile) {
      files.push({ path, status: 'added' });
      continue;
    }
    if (!toFile) {
      files.push({ path, status: 'removed' });
      continue;
    }
    if (sameBytes(fromFile.content, toFile.content)) continue;

    if (isBinary(fromFile.content) || isBinary(toFile.content)) {
      files.push({ path, status: 'binary' });
      continue;
    }

    const hunks = diffLines(
      new TextDecoder().decode(fromFile.content),
      new TextDecoder().decode(toFile.content),
    ).map((h) => ({ value: h.value, added: h.added, removed: h.removed }));
    files.push({ path, status: 'modified', hunks });
  }

  return json({ from, to, files });
};
