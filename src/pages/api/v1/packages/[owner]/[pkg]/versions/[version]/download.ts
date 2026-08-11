import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { findPackageByName, findVersion, incrementDownloadCount } from '../../../../../../../../lib/db';
import { errorResponse } from '../../../../../../../../lib/http';

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  const name = `${params.owner}/${params.pkg}`;
  const db = env.DB;
  const r2 = env.ARTIFACTS;

  const pkg = await findPackageByName(db, name);
  if (!pkg) {
    return errorResponse(404, 'not_found', `Pacote "${name}" não encontrado.`);
  }

  const version = await findVersion(db, pkg.id, params.version!);
  if (!version) {
    return errorResponse(404, 'not_found', `Versão "${params.version}" não encontrada para "${name}".`);
  }

  if (version.scan_status === 'malicious') {
    return errorResponse(403, 'malicious', 'Essa versão foi sinalizada como maliciosa pela varredura de segurança.');
  }

  const object = await r2.get(version.r2_key);
  if (!object) {
    return errorResponse(404, 'not_found', 'Artefato não encontrado no armazenamento.');
  }

  // Nunca bloqueia a resposta do download com uma escrita síncrona no D1 (ver
  // design.md "Risks/Trade-offs"). O incremento roda depois da resposta já
  // ter sido enviada.
  locals.cfContext.waitUntil(incrementDownloadCount(db, pkg.id));

  return new Response(object.body, {
    status: 200,
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'Content-Length': String(version.size_bytes),
      'X-PepeHub-Sha256': version.sha256,
    },
  });
};
