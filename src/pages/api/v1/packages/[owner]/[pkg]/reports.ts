import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { findPackageByName, findVersion } from '../../../../../../lib/db';
import { errorResponse, json } from '../../../../../../lib/http';
import { createReport } from '../../../../../../lib/moderation';
import { resolveMutationSession } from '../../../../../../lib/session';

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
  const { DB: db, SESSION_SECRET: sessionSecret } = env;

  const session = await resolveMutationSession(request, sessionSecret);
  if (!session) {
    return errorResponse(401, 'unauthorized', 'Sessão ausente, inválida ou expirada.');
  }

  const name = `${params.owner}/${params.pkg}`;
  const pkg = await findPackageByName(db, name);
  if (!pkg) {
    return errorResponse(404, 'not_found', `Pacote "${name}" não encontrado.`);
  }

  let body: { reason?: unknown; version?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'invalid_body', 'Corpo precisa ser JSON.');
  }
  if (typeof body.reason !== 'string' || !body.reason.trim()) {
    return errorResponse(400, 'invalid_body', 'reason é obrigatório.');
  }

  let packageVersionId: number | null = null;
  if (typeof body.version === 'string') {
    const version = await findVersion(db, pkg.id, body.version);
    if (!version) {
      return errorResponse(400, 'invalid_body', `Versão "${body.version}" não encontrada para "${name}".`);
    }
    packageVersionId = version.id;
  }

  const report = await createReport(db, {
    packageId: pkg.id,
    packageVersionId,
    reporterOwnerId: session.ownerId,
    reason: body.reason,
  });

  return json({ id: report.id, status: report.status, createdAt: report.created_at }, { status: 201 });
};
