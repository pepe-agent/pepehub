import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { findOwnerByHandle } from '../../../../lib/db';
import { errorResponse, json } from '../../../../lib/http';
import { isOperator } from '../../../../lib/moderation';
import { reserveName } from '../../../../lib/platformAdmin';
import { requireSession } from '../../../../lib/session';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const { DB: db, SESSION_SECRET: sessionSecret } = env;

  const session = await requireSession(request, sessionSecret);
  if (!session) {
    return errorResponse(401, 'unauthorized', 'Sessão ausente, inválida ou expirada.');
  }
  if (!(await isOperator(db, session.ownerId))) {
    return errorResponse(403, 'forbidden', 'Só um operador pode reservar um nome.');
  }

  let body: { name?: unknown; forHandle?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'invalid_body', 'Corpo precisa ser JSON.');
  }
  if (typeof body.name !== 'string' || !/^@[^/\s]+\/[^/\s]+$/.test(body.name)) {
    return errorResponse(400, 'invalid_body', 'name precisa ser "@handle/nome".');
  }

  let reservedForOwnerId: number | null = null;
  if (typeof body.forHandle === 'string' && body.forHandle.trim()) {
    const target = await findOwnerByHandle(db, body.forHandle.toLowerCase());
    if (!target) {
      return errorResponse(400, 'unknown_handle', `"${body.forHandle}" nunca fez login no PepeHub.`);
    }
    reservedForOwnerId = target.id;
  }

  await reserveName(db, {
    name: body.name,
    reservedByOwnerId: session.ownerId,
    reservedForOwnerId,
    reason: typeof body.reason === 'string' ? body.reason : null,
  });

  return json({ name: body.name, reservedFor: reservedForOwnerId ? body.forHandle : null }, { status: 201 });
};
