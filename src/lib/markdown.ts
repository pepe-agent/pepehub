import { marked, type Tokens } from 'marked';

const ESCAPE_MAP: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}

const SAFE_LINK_SCHEME = /^(https?:|mailto:)/i;
const SAFE_IMAGE_SCHEME = /^https?:/i;

// O markdown vem de um artefato publicado por qualquer pessoa (SKILL.md de
// um skill, README de um plugin), então é conteúdo não confiável por
// definição. sanitize-html (a opção óbvia) depende de postcss, que não roda
// no runtime de Workers (erro de require em tempo de import), então a
// defesa aqui é via os hooks de renderer do próprio marked, não um
// sanitizador de HTML à parte:
// - html(): qualquer HTML embutido no markdown original (bloco ou inline,
//   ambos passam por aqui) nunca é executado, só escapado e mostrado como
//   texto. É o único vetor real de <script>/onerror/<iframe> nesse pipeline,
//   já que markdown puro não tem como gerar essas tags sozinho.
// - link()/image(): só http(s)/mailto passam como href/src de verdade;
//   qualquer outro esquema (javascript:, data: etc.) vira texto puro.
const renderer = {
  html(token: Tokens.HTML | Tokens.Tag) {
    return escapeHtml(token.text);
  },
  link(this: { parser: { parseInline(tokens: Tokens.Link['tokens']): string } }, token: Tokens.Link) {
    const text = this.parser.parseInline(token.tokens);
    if (!SAFE_LINK_SCHEME.test(token.href)) return text;
    const title = token.title ? ` title="${escapeHtml(token.title)}"` : '';
    return `<a href="${escapeHtml(token.href)}" rel="noopener noreferrer" target="_blank"${title}>${text}</a>`;
  },
  image(token: Tokens.Image) {
    const alt = escapeHtml(token.text ?? '');
    if (!SAFE_IMAGE_SCHEME.test(token.href)) return alt;
    const title = token.title ? ` title="${escapeHtml(token.title)}"` : '';
    return `<img src="${escapeHtml(token.href)}" alt="${alt}"${title}>`;
  },
};

marked.use({ renderer });

export function renderMarkdownSafe(source: string): string {
  return marked.parse(source, { async: false, gfm: true, breaks: false }) as string;
}
