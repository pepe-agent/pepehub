import type { APIRoute } from 'astro';
import { SESSION_COOKIE_NAME, clearCookie } from '../lib/session';

export const prerender = false;

export const GET: APIRoute = async () => {
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/',
      'Set-Cookie': clearCookie(SESSION_COOKIE_NAME),
    },
  });
};
