import type { Locale } from '../i18n/locales';
import { ui } from '../i18n/ui';

// O PepeHub não duplica a documentação do formato do manifesto, ela mora no
// site do Pepe (ver proposal.md e specs/browse-site/spec.md).
export const PEPE_SKILLS_DOCS_URL = 'https://pepe-agent.com/pt-br/docs/skills';
export const PEPE_PLUGINS_DOCS_URL = 'https://pepe-agent.com/pt-br/docs/plugins';

// Domínio canônico de produção. O redirect_uri do OAuth do GitHub precisa
// bater exatamente com o que está cadastrado no GitHub OAuth App (só o
// domínio custom, nunca o *.workers.dev). Derivar isso de request.url
// quebra o login pra quem acessa pelo domínio de preview da Cloudflare.
export const SITE_URL = 'https://hub.pepe-agent.com';

// Rótulos de categoria por idioma vivem no dicionário de i18n (src/i18n/ui.ts)
// pra não duplicar tradução em dois lugares; essa função só reexpõe como o
// Record<string, string> que o resto do código já espera.
export function categoryLabels(locale: Locale): Record<string, string> {
  return ui[locale].category;
}
