import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { errorResponse, json } from '../../../../lib/http';
import { isOperator, listReports, type ReportStatus } from '../../../../lib/moderation';
import { requireSession } from '../../../../lib/session';

export const prerender = false;

const VALID_STATUSES: readonly ReportStatus[] = ['open', 'confirmed', 'dismissed'];

export const GET: APIRoute = async ({ request }) => {
  const { DB: db, SESSION_SECRET: sessionSecret } = env;

  const session = await requireSession(request, sessionSecret);
  if (!session) {
    return errorResponse(401, 'unauthorized', 'Sessão ausente, inválida ou expirada.');
  }
  if (!(await isOperator(db, session.ownerId))) {
    return errorResponse(403, 'forbidden', 'Só um operador pode ver a fila de moderação.');
  }

  const statusParam = new URL(request.url).searchParams.get('status');
  if (statusParam && !VALID_STATUSES.includes(statusParam as ReportStatus)) {
    return errorResponse(400, 'invalid_status', `status precisa ser um de: ${VALID_STATUSES.join(', ')}.`);
  }

  const reports = await listReports(db, (statusParam as ReportStatus) ?? null);
  return json({
    items: reports.map((r) => ({
      id: r.id,
      packageId: r.package_id,
      packageVersionId: r.package_version_id,
      reporterOwnerId: r.reporter_owner_id,
      reason: r.reason,
      status: r.status,
      createdAt: r.created_at,
    })),
  });
};
