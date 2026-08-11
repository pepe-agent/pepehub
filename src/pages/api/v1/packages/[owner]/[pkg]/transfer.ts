import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { findOwnerByHandle, findPackageByName, requestOwnerTransfer } from '../../../../../../lib/db';
import { errorResponse, json } from '../../../../../../lib/http';
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
    return errorResponse(403, 'forbidden', 'Só o dono do pacote pode transferi-lo.');
  }

  let body: { toHandle?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'invalid_body', 'Corpo precisa ser JSON.');
  }
  if (typeof body.toHandle !== 'string' || !body.toHandle.trim()) {
    return errorResponse(400, 'invalid_body', 'toHandle é obrigatório.');
  }

  const targetOwner = await findOwnerByHandle(db, body.toHandle.toLowerCase());
  if (!targetOwner) {
    return errorResponse(400, 'unknown_handle', `"${body.toHandle}" nunca fez login no PepeHub.`);
  }

  await requestOwnerTransfer(db, pkg.id, targetOwner.id);
  return json({ name, transferPendingTo: targetOwner.handle }, { status: 202 });
};
