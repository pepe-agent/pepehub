import type { APIRoute } from 'astro';
import { isLocale } from '../i18n/locales';
import { LOCALE_COOKIE_NAME } from '../lib/locale';
import { cookieHeader } from '../lib/session';

export const prerender = false;

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

export const GET: APIRoute = async ({ url }) => {
  const locale = url.searchParams.get('locale');
  if (!locale || !isLocale(locale)) {
    return new Response('Idioma inválido.', { status: 400 });
  }

  // Só redireciona pra um caminho relativo do próprio site: um redirect
  // param apontando pra outro domínio seria um open redirect (um link
  // .../set-locale?redirect=https://golpe.example pareceria confiável por
  // vir do nosso domínio).
  const redirectParam = url.searchParams.get('redirect') ?? '/';
  const safeRedirect = redirectParam.startsWith('/') && !redirectParam.startsWith('//') ? redirectParam : '/';

  return new Response(null, {
    status: 302,
    headers: {
      Location: safeRedirect,
      'Set-Cookie': cookieHeader(LOCALE_COOKIE_NAME, locale, ONE_YEAR_SECONDS),
    },
  });
};
