import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { findPackageByName } from '../../../../../../lib/db';
import { errorResponse, json } from '../../../../../../lib/http';
import { requireSession } from '../../../../../../lib/session';
import { setTrustedPublisher } from '../../../../../../lib/trustedPublisher';

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
    return errorResponse(403, 'forbidden', 'Só o dono do pacote pode registrar um publisher confiável nele.');
  }

  let body: { repository?: unknown; workflowFilename?: unknown; environment?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'invalid_body', 'Corpo precisa ser JSON.');
  }
  if (typeof body.repository !== 'string' || !/^[^/]+\/[^/]+$/.test(body.repository)) {
    return errorResponse(400, 'invalid_body', 'repository precisa ser "owner/repo".');
  }
  if (typeof body.workflowFilename !== 'string' || !body.workflowFilename.trim()) {
    return errorResponse(400, 'invalid_body', 'workflowFilename é obrigatório (ex.: "publish.yml").');
  }

  await setTrustedPublisher(db, pkg.id, {
    repository: body.repository,
    workflowFilename: body.workflowFilename,
    environment: typeof body.environment === 'string' ? body.environment : null,
  });

  return json({ name, repository: body.repository, workflowFilename: body.workflowFilename }, { status: 201 });
};
