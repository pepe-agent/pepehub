import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isCategory } from '../../../lib/categories';
import { searchPackages } from '../../../lib/db';
import { errorResponse, json } from '../../../lib/http';
import { serializeSearchItem } from '../../../lib/serialize';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const q = url.searchParams.get('q');
  const category = url.searchParams.get('category');
  const kind = url.searchParams.get('kind');
  const cursorParam = url.searchParams.get('cursor');

  if (category && !isCategory(category)) {
    return errorResponse(400, 'invalid_category', `Categoria "${category}" não existe.`);
  }
  if (kind && kind !== 'plugin' && kind !== 'skill') {
    return errorResponse(400, 'invalid_kind', `kind "${kind}" inválido, use "plugin" ou "skill".`);
  }

  const cursor = cursorParam ? Number.parseInt(cursorParam, 10) : null;
  if (cursorParam && (cursor === null || Number.isNaN(cursor))) {
    return errorResponse(400, 'invalid_cursor', 'cursor inválido.');
  }

  const { items, nextCursor } = await searchPackages(env.DB, {
    q,
    category,
    kind: (kind as 'plugin' | 'skill' | null) ?? null,
    cursor,
    limit: 20,
  });

  return json({
    items: items.map(serializeSearchItem),
    nextCursor,
  });
};
