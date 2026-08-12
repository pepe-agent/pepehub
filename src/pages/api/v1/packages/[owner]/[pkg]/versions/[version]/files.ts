import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { extractPackageFiles } from '../../../../../../../../lib/archive';
import { json } from '../../../../../../../../lib/http';
import { loadVersionArtifact } from '../../../../../../../../lib/packageArtifact';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const name = `${params.owner}/${params.pkg}`;
  const loaded = await loadVersionArtifact(env.DB, env.ARTIFACTS, name, params.version!);
  if ('error' in loaded) return loaded.error;
  const { pkg, buffer } = loaded;

  const files = extractPackageFiles(buffer, pkg.kind);
  const items = files
    .map((f) => ({ path: f.path, sizeBytes: f.content.byteLength }))
    .sort((a, b) => a.path.localeCompare(b.path));

  return json({ items });
};
