// O PepeHub não duplica a documentação do formato do manifesto, ela mora no
// site do Pepe (ver proposal.md e specs/browse-site/spec.md).
export const PEPE_SKILLS_DOCS_URL = 'https://pepe-agent.com/pt-br/docs/skills';
export const PEPE_PLUGINS_DOCS_URL = 'https://pepe-agent.com/pt-br/docs/plugins';

export const CATEGORY_LABELS: Record<string, string> = {
  channel: 'Canal',
  tool: 'Ferramenta',
  integration: 'Integração',
  model: 'Modelo',
  automation: 'Automação',
  other: 'Outro',
};

export const HOME_SORT_LABELS = {
  trending: 'Trending',
  featured: 'Featured',
  official: 'Official',
  new: 'New',
} as const;
