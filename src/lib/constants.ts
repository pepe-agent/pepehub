import type { Locale } from '../i18n/locales';
import { ui } from '../i18n/ui';

// O PepeHub não duplica a documentação do formato do manifesto, ela mora no
// site do Pepe (ver proposal.md e specs/browse-site/spec.md).
export const PEPE_SKILLS_DOCS_URL = 'https://pepe-agent.com/pt-br/docs/skills';
export const PEPE_PLUGINS_DOCS_URL = 'https://pepe-agent.com/pt-br/docs/plugins';

// Rótulos de categoria por idioma vivem no dicionário de i18n (src/i18n/ui.ts)
// pra não duplicar tradução em dois lugares; essa função só reexpõe como o
// Record<string, string> que o resto do código já espera.
export function categoryLabels(locale: Locale): Record<string, string> {
  return ui[locale].category;
}
