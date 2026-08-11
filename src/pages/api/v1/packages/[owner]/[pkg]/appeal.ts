import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { findPackageByName } from '../../../../../../lib/db';
import { errorResponse, json } from '../../../../../../lib/http';
import { APPEAL_REASON_PREFIX, createReport } from '../../../../../../lib/moderation';
import { requireSession } from '../../../../../../lib/session';

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
  const { DB: db, SESSION_SECRET: sessionSecret } = env;

  const session = await requireSession(request, sessionSecret);
  if (!session) {
    return errorResponse(401, 'unauthorized', 'Sessão ausente, inválida ou expirada.');
  }

  const name = `${params.owner}/${params.pkg}`;
  const pkg = await findPackageByName(db, name);
  if (!pkg) {
    return errorResponse(404, 'not_found', `Pacote "${name}" não encontrado.`);
  }
  if (pkg.owner_id !== session.ownerId) {
    return errorResponse(403, 'forbidden', 'Só o dono do pacote pode apelar.');
  }

  let body: { justification?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'invalid_body', 'Corpo precisa ser JSON.');
  }
  if (typeof body.justification !== 'string' || !body.justification.trim()) {
    return errorResponse(400, 'invalid_body', 'justification é obrigatório.');
  }

  const report = await createReport(db, {
    packageId: pkg.id,
    packageVersionId: null,
    reporterOwnerId: session.ownerId,
    reason: `${APPEAL_REASON_PREFIX}${body.justification}`,
  });

  return json({ id: report.id, status: report.status, createdAt: report.created_at }, { status: 201 });
};
