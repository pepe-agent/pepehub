import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { findPackageByName, getDistTag, listVersions } from '../../../lib/db';
import { errorResponse, json } from '../../../lib/http';
import { sriFromHex } from '../../../lib/hash';

export const prerender = false;

// Packument compatível com npm/pnpm/yarn (npm-compatible-endpoint/spec.md).
// Só existe pra kind = plugin (já empacotado como tarball no pepehub-mvp);
// somente leitura, casca fina sobre o schema já existente, não um registro
// npm completo (ver design.md).
export const GET: APIRoute = async ({ params, request }) => {
  const name = params.name!;
  const db = env.DB;

  const pkg = await findPackageByName(db, name);
  if (!pkg || pkg.kind !== 'plugin') {
    return errorResponse(404, 'not_found', `Nenhum plugin "${name}" encontrado.`);
  }

  const versions = await listVersions(db, pkg.id);
  const latest = await getDistTag(db, pkg.id, 'latest');
  const origin = new URL(request.url).origin;

  const versionsObject: Record<string, unknown> = {};
  for (const v of versions) {
    versionsObject[v.version] = {
      name: pkg.name,
      version: v.version,
      dist: {
        tarball: `${origin}/api/v1/packages/${pkg.name}/versions/${v.version}/download`,
        // shasum é o legado sha1 do protocolo do npm; integrity (SRI) é o
        // sha256 real que o resto do PepeHub usa pra garantir integridade.
        shasum: v.sha1 ?? v.sha256,
        integrity: sriFromHex('sha256', v.sha256),
      },
    };
  }

  return json({
    name: pkg.name,
    'dist-tags': latest ? { latest } : {},
    versions: versionsObject,
  });
};
