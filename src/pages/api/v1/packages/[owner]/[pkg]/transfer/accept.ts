import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { acceptOwnerTransfer, findPackageByName } from '../../../../../../../lib/db';
import { errorResponse, json } from '../../../../../../../lib/http';
import { requireSession } from '../../../../../../../lib/session';

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
  if (pkg.transfer_pending_to_owner_id !== session.ownerId) {
    return errorResponse(403, 'forbidden', 'Não há transferência pendente pra você nesse pacote.');
  }

  const slug = pkg.name.split('/').slice(1).join('/');
  const newName = `@${session.handle}/${slug}`;

  await acceptOwnerTransfer(db, pkg.id, session.ownerId, newName, pkg.name);
  return json({ name: newName, owner: session.handle });
};
