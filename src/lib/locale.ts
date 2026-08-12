import { DEFAULT_LOCALE, isLocale, type Locale } from '../i18n/locales';
import { readCookie } from './session';

export const LOCALE_COOKIE_NAME = 'pepehub_locale';

// Parseia um Accept-Language ("es-MX,es;q=0.9,pt;q=0.7") e escolhe o
// primeiro idioma suportado, por q-value. "pt" puro (sem região) vira
// pt-br (variante default do site pra português); uma região de português
// que não seja BR (pt-mz, pt-ao etc.) vira pt-pt, mais perto do português
// europeu que do brasileiro.
export function resolveLocaleFromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;

  const tags = header
    .split(',')
    .map((part) => {
      const [rawTag, ...params] = part.trim().split(';');
      const qParam = params.find((p) => p.trim().startsWith('q='));
      const q = qParam ? parseFloat(qParam.trim().slice(2)) : 1;
      return { tag: rawTag.trim().toLowerCase(), q: Number.isNaN(q) ? 1 : q };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of tags) {
    if (isLocale(tag)) return tag;
    if (tag === 'pt') return 'pt-br';
    if (tag === 'es') return 'es';
    if (tag === 'en') return 'en';
    if (tag.startsWith('pt-') && tag !== 'pt-br') return 'pt-pt';
    if (tag.startsWith('es-')) return 'es';
    if (tag.startsWith('en-')) return 'en';
  }

  return null;
}

// Cookie (escolha explícita) vence o Accept-Language, que vence o default
// do site. Nunca lança: uma sessão sem cookie e sem header reconhecível
// sempre cai no idioma default.
export function resolveLocale(request: Request): Locale {
  const cookieValue = readCookie(request, LOCALE_COOKIE_NAME);
  if (cookieValue && isLocale(cookieValue)) return cookieValue;
  return resolveLocaleFromAcceptLanguage(request.headers.get('Accept-Language')) ?? DEFAULT_LOCALE;
}
