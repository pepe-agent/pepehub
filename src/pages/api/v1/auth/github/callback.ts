import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { upsertOwner } from '../../../../../lib/db';
import { SITE_URL } from '../../../../../lib/constants';
import { exchangeCodeForAccessToken, fetchGithubUser } from '../../../../../lib/github';
import {
  OAUTH_STATE_COOKIE_NAME,
  clearCookie,
  createSessionToken,
  readCookie,
  sessionCookie,
} from '../../../../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expectedState = readCookie(request, OAUTH_STATE_COOKIE_NAME);
  const clearState = clearCookie(OAUTH_STATE_COOKIE_NAME);

  if (!code || !state || !expectedState || state !== expectedState) {
    return new Response('Login inválido ou expirado, tente de novo.', {
      status: 400,
      headers: { 'Set-Cookie': clearState },
    });
  }

  const {
    GITHUB_OAUTH_CLIENT_ID: clientId,
    GITHUB_OAUTH_CLIENT_SECRET: clientSecret,
    SESSION_SECRET: sessionSecret,
    DB: db,
  } = env;

  const redirectUri = new URL('/api/v1/auth/github/callback', SITE_URL).toString();
  const accessToken = await exchangeCodeForAccessToken(clientId, clientSecret, code, redirectUri);
  const githubUser = await fetchGithubUser(accessToken);
  const owner = await upsertOwner(db, githubUser.id, githubUser.login.toLowerCase(), githubUser.name);
  const token = await createSessionToken(
    { ownerId: owner.id, githubId: owner.github_id, handle: owner.handle },
    sessionSecret,
  );

  const headers = new Headers({ Location: '/' });
  headers.append('Set-Cookie', clearState);
  headers.append('Set-Cookie', sessionCookie(token));

  return new Response(null, { status: 302, headers });
};
