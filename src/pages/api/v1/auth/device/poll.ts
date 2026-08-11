import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { upsertOwner } from '../../../../../lib/db';
import { fetchGithubUser, pollDeviceFlow } from '../../../../../lib/github';
import { errorResponse, json } from '../../../../../lib/http';
import { createSessionToken } from '../../../../../lib/session';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const {
    GITHUB_OAUTH_CLIENT_ID: clientId,
    GITHUB_OAUTH_CLIENT_SECRET: clientSecret,
    SESSION_SECRET: sessionSecret,
    DB: db,
  } = env;

  let body: { deviceCode?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'invalid_body', 'Corpo precisa ser JSON.');
  }

  if (typeof body.deviceCode !== 'string' || !body.deviceCode) {
    return errorResponse(400, 'invalid_body', 'deviceCode é obrigatório.');
  }

  const result = await pollDeviceFlow(clientId, clientSecret, body.deviceCode);

  switch (result.status) {
    case 'pending':
      return json({ status: 'pending' });
    case 'expired':
      return errorResponse(400, 'expired', 'O código expirou, inicie o login novamente.');
    case 'denied':
      return errorResponse(400, 'access_denied', 'O login foi negado no GitHub.');
    case 'success': {
      const githubUser = await fetchGithubUser(result.accessToken);
      const owner = await upsertOwner(db, githubUser.id, githubUser.login.toLowerCase(), githubUser.name);
      const token = await createSessionToken(
        { ownerId: owner.id, githubId: owner.github_id, handle: owner.handle },
        sessionSecret,
      );
      return json({ status: 'approved', token });
    }
  }
};
