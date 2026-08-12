import { DEFAULT_LOCALE, type Locale } from './locales';
import { ui, type UiDictionary } from './ui';

export function useTranslations(locale: Locale): UiDictionary {
  // Todo locale suportado tem entrada completa em ui.ts (garantido pelo tipo
  // Record<Locale, UiDictionary>); o fallback é só uma rede de segurança
  // caso um locale inválido escape da validação em resolveLocale.
  return ui[locale] ?? ui[DEFAULT_LOCALE];
}
