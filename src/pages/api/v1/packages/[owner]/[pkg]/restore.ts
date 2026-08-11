import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { findPackageByNameIncludingDeleted, restorePackage } from '../../../../../../lib/db';
import { errorResponse, json } from '../../../../../../lib/http';
import { isOperator } from '../../../../../../lib/moderation';
import { requireSession } from '../../../../../../lib/session';

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
  const { DB: db, SESSION_SECRET: sessionSecret } = env;

  const session = await requireSession(request, sessionSecret);
  if (!session) {
    return errorResponse(401, 'unauthorized', 'Sessão ausente, inválida ou expirada.');
  }

  const name = `${params.owner}/${params.pkg}`;
  const pkg = await findPackageByNameIncludingDeleted(db, name);
  if (!pkg) {
    return errorResponse(404, 'not_found', `Pacote "${name}" não encontrado.`);
  }
  if (pkg.owner_id !== session.ownerId && !(await isOperator(db, session.ownerId))) {
    return errorResponse(403, 'forbidden', 'Só o dono do pacote ou um operador pode restaurá-lo.');
  }

  await restorePackage(db, pkg.id);
  return json({ name, deleted: false });
};
