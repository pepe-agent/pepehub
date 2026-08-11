import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { findOwnerByHandle } from '../../../../../../lib/db';
import { errorResponse, json } from '../../../../../../lib/http';
import { isOperator } from '../../../../../../lib/moderation';
import { unbanPublisher } from '../../../../../../lib/platformAdmin';
import { requireSession } from '../../../../../../lib/session';

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
  const { DB: db, SESSION_SECRET: sessionSecret } = env;

  const session = await requireSession(request, sessionSecret);
  if (!session) {
    return errorResponse(401, 'unauthorized', 'Sessão ausente, inválida ou expirada.');
  }
  if (!(await isOperator(db, session.ownerId))) {
    return errorResponse(403, 'forbidden', 'Só um operador pode desbanir um publisher.');
  }

  const handle = params.handle!.replace(/^@/, '').toLowerCase();
  const target = await findOwnerByHandle(db, handle);
  if (!target) {
    return errorResponse(404, 'not_found', `Publisher "@${handle}" não encontrado.`);
  }

  await unbanPublisher(db, target.id);
  return json({ handle: target.handle, banned: false });
};
