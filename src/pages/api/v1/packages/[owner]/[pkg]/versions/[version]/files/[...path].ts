import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { extractPackageFiles } from '../../../../../../../../../lib/archive';
import { errorResponse, json } from '../../../../../../../../../lib/http';
import { loadVersionArtifact } from '../../../../../../../../../lib/packageArtifact';

export const prerender = false;

const MAX_TEXT_SIZE = 512 * 1024;

function isBinary(bytes: Uint8Array): boolean {
  const sampleSize = Math.min(bytes.length, 8000);
  for (let i = 0; i < sampleSize; i++) {
    if (bytes[i] === 0) return true;
  }
  return false;
}

export const GET: APIRoute = async ({ params }) => {
  const name = `${params.owner}/${params.pkg}`;
  const loaded = await loadVersionArtifact(env.DB, env.ARTIFACTS, name, params.version!);
  if ('error' in loaded) return loaded.error;
  const { pkg, buffer } = loaded;

  const files = extractPackageFiles(buffer, pkg.kind);
  const file = files.find((f) => f.path === params.path);
  if (!file) {
    return errorResponse(404, 'not_found', `Arquivo "${params.path}" não encontrado nessa versão.`);
  }

  const binary = isBinary(file.content);
  const oversized = !binary && file.content.byteLength > MAX_TEXT_SIZE;

  return json({
    path: file.path,
    sizeBytes: file.content.byteLength,
    isBinary: binary,
    truncated: oversized,
    content: binary || oversized ? null : new TextDecoder().decode(file.content),
  });
};
