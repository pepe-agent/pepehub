import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { findPackageByName } from '../../../../../../lib/db';
import { errorResponse, json } from '../../../../../../lib/http';
import { isOperator, setModerationState, type ModerationState } from '../../../../../../lib/moderation';
import { requireSession } from '../../../../../../lib/session';

export const prerender = false;

const VALID_STATES: readonly ModerationState[] = ['visible', 'held', 'hidden', 'blocked'];

export const POST: APIRoute = async ({ params, request }) => {
  const { DB: db, SESSION_SECRET: sessionSecret } = env;

  const session = await requireSession(request, sessionSecret);
  if (!session) {
    return errorResponse(401, 'unauthorized', 'Sessão ausente, inválida ou expirada.');
  }
  if (!(await isOperator(db, session.ownerId))) {
    return errorResponse(403, 'forbidden', 'Só um operador pode mudar o estado de moderação.');
  }

  const name = `${params.owner}/${params.pkg}`;
  const pkg = await findPackageByName(db, name);
  if (!pkg) {
    return errorResponse(404, 'not_found', `Pacote "${name}" não encontrado.`);
  }

  let body: { state?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'invalid_body', 'Corpo precisa ser JSON.');
  }
  if (typeof body.state !== 'string' || !VALID_STATES.includes(body.state as ModerationState)) {
    return errorResponse(400, 'invalid_body', `state precisa ser um de: ${VALID_STATES.join(', ')}.`);
  }

  await setModerationState(
    db,
    pkg.id,
    body.state as ModerationState,
    typeof body.reason === 'string' ? body.reason : null,
    session.ownerId,
  );

  return json({ name, state: body.state });
};
