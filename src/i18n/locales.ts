export const LOCALES = ['pt-br', 'pt-pt', 'es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

// pt-br porque é o idioma em que o site já existia antes do seletor.
export const DEFAULT_LOCALE: Locale = 'pt-br';

export const LOCALE_LABELS: Record<Locale, string> = {
  'pt-br': 'Português (Brasil)',
  'pt-pt': 'Português (Portugal)',
  es: 'Español',
  en: 'English',
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
