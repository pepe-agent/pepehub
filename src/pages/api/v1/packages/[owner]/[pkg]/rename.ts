import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { findPackageByName, renamePackage } from '../../../../../../lib/db';
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
    return errorResponse(403, 'forbidden', 'Só o dono do pacote pode renomeá-lo.');
  }

  let body: { name?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'invalid_body', 'Corpo precisa ser JSON.');
  }

  const newName = body.name;
  const requiredPrefix = `@${session.handle}/`;
  if (typeof newName !== 'string' || !newName.toLowerCase().startsWith(requiredPrefix.toLowerCase()) || newName.length <= requiredPrefix.length) {
    return errorResponse(400, 'invalid_body', `name precisa começar com "${requiredPrefix}".`);
  }

  const taken = await findPackageByName(db, newName);
  if (taken) {
    return errorResponse(409, 'name_taken', `"${newName}" já está em uso.`);
  }

  await renamePackage(db, pkg.id, newName, name);
  return json({ name: newName, renamedFrom: name });
};
