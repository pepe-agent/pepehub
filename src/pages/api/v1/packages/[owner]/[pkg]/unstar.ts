import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { findPackageByName } from '../../../../../../lib/db';
import { errorResponse, json } from '../../../../../../lib/http';
import { resolveMutationSession } from '../../../../../../lib/session';
import { getStarsCount, unstar } from '../../../../../../lib/stars';

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

  await unstar(db, pkg.id, session.ownerId);
  const starsCount = await getStarsCount(db, pkg.id);
  return json({ name, starred: false, starsCount });
};
