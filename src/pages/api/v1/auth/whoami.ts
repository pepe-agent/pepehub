import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { errorResponse, json } from '../../../../lib/http';
import { requireSession } from '../../../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const session = await requireSession(request, env.SESSION_SECRET);
  if (!session) {
    return errorResponse(401, 'unauthorized', 'Sessão ausente, inválida ou expirada.');
  }

  return json({ handle: session.handle, githubId: session.githubId });
};
