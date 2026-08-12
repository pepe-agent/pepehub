import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { findPackageByName, updatePackageMetadata } from '../../../../../../lib/db';
import { isCategory } from '../../../../../../lib/categories';
import { errorResponse, json } from '../../../../../../lib/http';
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
  if (pkg.owner_id !== session.ownerId) {
    return errorResponse(403, 'forbidden', 'Só o dono do pacote pode editar a metadata.');
  }

  let body: { summary?: unknown; category?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'invalid_body', 'Corpo precisa ser JSON.');
  }

  if (!isCategory(body.category)) {
    return errorResponse(400, 'invalid_category', 'category ausente ou fora da lista fixa.');
  }
  if (body.summary !== null && typeof body.summary !== 'string') {
    return errorResponse(400, 'invalid_summary', 'summary precisa ser string ou null.');
  }

  await updatePackageMetadata(db, pkg.id, { summary: body.summary ?? null, category: body.category });

  return json({ name, summary: body.summary ?? null, category: body.category });
};
