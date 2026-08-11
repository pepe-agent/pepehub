import type { MiddlewareHandler } from 'astro';
import { env } from 'cloudflare:workers';
import { categoryForMethod, rateLimitConfigFor, rateLimitHeaders } from './lib/rateLimit';
import { SESSION_COOKIE_NAME, bearerToken, readCookie, verifySessionToken } from './lib/session';

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { request, locals } = context;
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/v1/')) {
    // Sessão via cookie é só pra renderizar estado de login nas páginas
    // (Base.astro). API continua exigindo Bearer explícito, nunca cookie
    // ambiente, pra não abrir CSRF nos endpoints de mutação (checkOrigin
    // está desligado pro resto do site).
    const cookieToken = readCookie(request, SESSION_COOKIE_NAME);
    locals.session = cookieToken ? await verifySessionToken(cookieToken, env.SESSION_SECRET) : null;
    return next();
  }

  locals.session = null;
  const token = bearerToken(request);
  const session = token ? await verifySessionToken(token, env.SESSION_SECRET) : null;

  const category = categoryForMethod(request.method);
  const identity = session ? 'auth' : 'anon';
  const key = session ? `session:${session.ownerId}` : `ip:${request.headers.get('cf-connecting-ip') ?? 'unknown'}`;
  const config = rateLimitConfigFor(category, identity);

  const { success } = await env[config.binding].limit({ key });
  const headers = rateLimitHeaders(config, success);

  if (!success) {
    return new Response(
      JSON.stringify({ error: 'rate_limited', message: 'Limite de taxa excedido, tente de novo em instantes.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
          ...headers,
        },
      },
    );
  }

  const response = await next();
  for (const [name, value] of Object.entries(headers)) {
    response.headers.set(name, value);
  }
  return response;
};
