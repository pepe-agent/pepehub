// TODO: apontar pro domínio real do site do Pepe quando ele existir — o
// PepeHub não deve duplicar a documentação do formato do manifesto (ver
// proposal.md e specs/browse-site/spec.md).
export const PEPE_MANIFEST_DOCS_URL = 'https://pepe.dev/docs/manifest';

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
