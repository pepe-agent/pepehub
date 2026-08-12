import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { buildAuthorizeUrl } from '../lib/github';
import { SITE_URL } from '../lib/constants';
import { OAUTH_STATE_COOKIE_NAME, cookieHeader } from '../lib/session';

export const prerender = false;

export const GET: APIRoute = async () => {
  const state = crypto.randomUUID();
  const redirectUri = new URL('/api/v1/auth/github/callback', SITE_URL).toString();
  const authorizeUrl = buildAuthorizeUrl(env.GITHUB_OAUTH_CLIENT_ID, redirectUri, state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl,
      'Set-Cookie': cookieHeader(OAUTH_STATE_COOKIE_NAME, state, 300),
    },
  });
};
