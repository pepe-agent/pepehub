import { describe, expect, it } from 'vitest';
import { renderMarkdownSafe } from '../src/lib/markdown';

describe('renderMarkdownSafe', () => {
  it('renderiza markdown normal (headers, código, links, listas)', () => {
    const html = renderMarkdownSafe(
      '# Título\n\nUm parágrafo com `código` e [um link](https://example.com).\n\n- item 1\n- item 2\n\n```js\nconst x = 1;\n```',
    );
    expect(html).toContain('<h1>Título</h1>');
    expect(html).toContain('<code>código</code>');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('<li>item 1</li>');
    expect(html).toContain('<pre>');
  });

  it('neutraliza <script> embutido no markdown, sem deixar a tag viva', () => {
    const html = renderMarkdownSafe('# Oi\n\n<script>alert(document.cookie)</script>\n\nresto do texto');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('neutraliza atributo de evento tipo onerror, sem deixar a tag viva', () => {
    const html = renderMarkdownSafe('<img src="x.png" onerror="alert(1)">');
    expect(html).not.toMatch(/<img[^>]*onerror/);
    expect(html).toContain('&lt;img');
  });

  it('bloqueia esquema javascript: em link', () => {
    const html = renderMarkdownSafe('[clique aqui](javascript:alert(1))');
    expect(html).not.toContain('javascript:');
  });

  it('bloqueia esquema data: em imagem', () => {
    const html = renderMarkdownSafe('![x](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)');
    expect(html).not.toContain('data:');
  });

  it('remove iframe embutido', () => {
    const html = renderMarkdownSafe('<iframe src="https://evil.example"></iframe>');
    expect(html).not.toContain('<iframe');
  });

  it('links ganham rel=noopener e target=_blank', () => {
    const html = renderMarkdownSafe('[site](https://example.com)');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });

  it('escapa conteúdo de bloco de código, mesmo parecendo HTML perigoso', () => {
    const html = renderMarkdownSafe('```html\n<script>alert(1)</script>\n```');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('mantém tabelas GFM', () => {
    const html = renderMarkdownSafe('| a | b |\n| - | - |\n| 1 | 2 |');
    expect(html).toContain('<table>');
    expect(html).toContain('<td>1</td>');
  });
});
