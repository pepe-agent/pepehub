import { createExecutionContext } from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST as publishPost } from '../src/pages/api/v1/packages/[owner]/[pkg]/versions';
import { sessionTokenFor } from './helpers';

function ctx(url: string, params: Record<string, string> = {}, init?: RequestInit) {
  return { request: new Request(url, init), params, locals: { cfContext: createExecutionContext() } } as any;
}

function auth(token: string): RequestInit {
  return { headers: { Authorization: `Bearer ${token}` } };
}

function publishFormWithSource(manifest: Record<string, unknown>) {
  const form = new FormData();
  form.set('manifest', JSON.stringify(manifest));
  return form;
}

function mockGithubRepo(repoMeta: { private?: boolean; fork?: boolean; archived?: boolean } | 'not_found') {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.match(/^https:\/\/api\.github\.com\/repos\/[^/]+\/[^/]+$/)) {
        if (repoMeta === 'not_found') {
          return new Response('{}', { status: 404 });
        }
        return new Response(
          JSON.stringify({ private: false, fork: false, archived: false, ...repoMeta }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.includes('/tarball/') || url.includes('/zipball/')) {
        return new Response(new TextEncoder().encode('fake-archive-bytes'), {
          headers: { 'Content-Type': 'application/octet-stream' },
        });
      }
      throw new Error(`unexpected fetch in source-publish test: ${url}`);
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('publish a partir de um repositório', () => {
  it('publica com sucesso a partir de um repositório público elegível', async () => {
    mockGithubRepo({});
    const token = await sessionTokenFor('source-owner');
    const res = await publishPost(
      ctx('http://test/api/v1/packages/@source-owner/from-repo/versions', { owner: '@source-owner', pkg: 'from-repo' }, {
        method: 'POST',
        body: publishFormWithSource({
          kind: 'plugin',
          version: '1.0.0',
          category: 'tool',
          source: { repo: 'source-owner/upstream', ref: 'main' },
        }),
        ...auth(token),
      }),
    );
    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.version.sha256).toHaveLength(64);
  });

  it('recusa repositório privado (422), sem publicar nada', async () => {
    mockGithubRepo({ private: true });
    const token = await sessionTokenFor('source-owner-2');
    const res = await publishPost(
      ctx('http://test/api/v1/packages/@source-owner-2/priv/versions', { owner: '@source-owner-2', pkg: 'priv' }, {
        method: 'POST',
        body: publishFormWithSource({
          kind: 'plugin',
          version: '1.0.0',
          category: 'tool',
          source: { repo: 'source-owner-2/private-repo', ref: 'main' },
        }),
        ...auth(token),
      }),
    );
    expect(res.status).toBe(422);
    const body: any = await res.json();
    expect(body.error).toBe('source_private');
  });

  it('recusa fork (422)', async () => {
    mockGithubRepo({ fork: true });
    const token = await sessionTokenFor('source-owner-3');
    const res = await publishPost(
      ctx('http://test/api/v1/packages/@source-owner-3/afork/versions', { owner: '@source-owner-3', pkg: 'afork' }, {
        method: 'POST',
        body: publishFormWithSource({
          kind: 'plugin',
          version: '1.0.0',
          category: 'tool',
          source: { repo: 'source-owner-3/a-fork', ref: 'main' },
        }),
        ...auth(token),
      }),
    );
    expect(res.status).toBe(422);
    const body: any = await res.json();
    expect(body.error).toBe('source_fork');
  });

  it('recusa repositório arquivado (422)', async () => {
    mockGithubRepo({ archived: true });
    const token = await sessionTokenFor('source-owner-4');
    const res = await publishPost(
      ctx('http://test/api/v1/packages/@source-owner-4/old/versions', { owner: '@source-owner-4', pkg: 'old' }, {
        method: 'POST',
        body: publishFormWithSource({
          kind: 'plugin',
          version: '1.0.0',
          category: 'tool',
          source: { repo: 'source-owner-4/archived-repo', ref: 'main' },
        }),
        ...auth(token),
      }),
    );
    expect(res.status).toBe(422);
    const body: any = await res.json();
    expect(body.error).toBe('source_archived');
  });
});
