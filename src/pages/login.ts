import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { buildAuthorizeUrl } from '../lib/github';
import { OAUTH_STATE_COOKIE_NAME, cookieHeader } from '../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const state = crypto.randomUUID();
  const redirectUri = new URL('/api/v1/auth/github/callback', request.url).toString();
  const authorizeUrl = buildAuthorizeUrl(env.GITHUB_OAUTH_CLIENT_ID, redirectUri, state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl,
      'Set-Cookie': cookieHeader(OAUTH_STATE_COOKIE_NAME, state, 300),
    },
  });
};
