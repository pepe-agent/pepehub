import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { extractPackageFiles } from '../../../../../../../../lib/archive';
import { json } from '../../../../../../../../lib/http';
import { renderMarkdownSafe } from '../../../../../../../../lib/markdown';
import { loadVersionArtifact } from '../../../../../../../../lib/packageArtifact';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const name = `${params.owner}/${params.pkg}`;
  const loaded = await loadVersionArtifact(env.DB, env.ARTIFACTS, name, params.version!);
  if ('error' in loaded) return loaded.error;
  const { pkg, buffer } = loaded;

  const files = extractPackageFiles(buffer, pkg.kind);

  // Skill: ou um único <nome>.md solto na raiz do zip, ou uma pasta
  // <nome>/ com SKILL.md dentro (ver docs de skills: "lido exatamente como
  // um <nome>.md solto"), possivelmente ao lado de scripts/ ou outras
  // subpastas (references/, etc.) que não contam como o doc de entrada.
  // Plugin: um README.md (case-insensitive) na raiz do tarball, se existir;
  // nem sempre existe (manifest.json + .exs bastam).
  const readmeFile =
    pkg.kind === 'skill'
      ? (files.find((f) => !f.path.includes('/') && /\.md$/i.test(f.path)) ??
        files.find((f) => {
          const parts = f.path.split('/');
          return parts.length === 2 && parts[1].toLowerCase() === 'skill.md';
        }))
      : files.find((f) => !f.path.includes('/') && f.path.toLowerCase() === 'readme.md');

  if (!readmeFile) {
    return json({ found: false, html: null, sourcePath: null });
  }

  const source = new TextDecoder().decode(readmeFile.content);
  return json({ found: true, html: renderMarkdownSafe(source), sourcePath: readmeFile.path });
};
