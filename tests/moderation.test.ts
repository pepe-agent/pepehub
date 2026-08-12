import { createExecutionContext } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { GET as searchGet } from '../src/pages/api/v1/search';
import { GET as packageGet } from '../src/pages/api/v1/packages/[owner]/[pkg]/index';
import { POST as publishPost } from '../src/pages/api/v1/packages/[owner]/[pkg]/versions';
import { GET as downloadGet } from '../src/pages/api/v1/packages/[owner]/[pkg]/versions/[version]/download';
import { POST as reportPost } from '../src/pages/api/v1/packages/[owner]/[pkg]/reports';
import { POST as moderationPost } from '../src/pages/api/v1/packages/[owner]/[pkg]/moderation';
import { POST as appealPost } from '../src/pages/api/v1/packages/[owner]/[pkg]/appeal';
import { GET as reportsQueueGet } from '../src/pages/api/v1/moderation/reports';
import { publishForm, seedPackage, seedVersion, sessionTokenFor } from './helpers';

function ctx(url: string, params: Record<string, string> = {}, init?: RequestInit) {
  return { request: new Request(url, init), params, locals: { cfContext: createExecutionContext() } } as any;
}

function auth(token: string): RequestInit {
  return { headers: { Authorization: `Bearer ${token}` } };
}

describe('POST /api/v1/packages/<name>/reports', () => {
  it('registra uma denúncia autenticada', async () => {
    await seedPackage({ ownerHandle: 'reported-owner', pkgSlug: 'sketchy' });
    const token = await sessionTokenFor('reporter');
    const res = await reportPost(
      ctx('http://test/api/v1/packages/@reported-owner/sketchy/reports', { owner: '@reported-owner', pkg: 'sketchy' }, {
        method: 'POST',
        body: JSON.stringify({ reason: 'parece phishing' }),
        ...auth(token),
      }),
    );
    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.status).toBe('open');
  });

  it('retorna 401 sem sessão', async () => {
    await seedPackage({ ownerHandle: 'reported-owner-2', pkgSlug: 'sketchy-2' });
    const res = await reportPost(
      ctx('http://test/api/v1/packages/@reported-owner-2/sketchy-2/reports', {
        owner: '@reported-owner-2',
        pkg: 'sketchy-2',
      }, { method: 'POST', body: JSON.stringify({ reason: 'x' }) }),
    );
    expect(res.status).toBe(401);
  });

  it('aceita denúncia via cookie quando Sec-Fetch-Site é same-origin (botão do site)', async () => {
    await seedPackage({ ownerHandle: 'reported-owner-3', pkgSlug: 'sketchy-3' });
    const token = await sessionTokenFor('cookie-reporter');
    const res = await reportPost(
      ctx('http://test/api/v1/packages/@reported-owner-3/sketchy-3/reports', {
        owner: '@reported-owner-3',
        pkg: 'sketchy-3',
      }, {
        method: 'POST',
        body: JSON.stringify({ reason: 'parece phishing' }),
        headers: { Cookie: `pepehub_session=${token}`, 'Sec-Fetch-Site': 'same-origin' },
      }),
    );
    expect(res.status).toBe(201);
  });
});

describe('estado de moderação controla visibilidade', () => {
  it('pacote held aparece na busca com o estado incluído', async () => {
    await seedPackage({ ownerHandle: 'held-owner', pkgSlug: 'held-pkg' });
    const opToken = await sessionTokenFor('op-held', { isOperator: true });
    await moderationPost(
      ctx('http://test/api/v1/packages/@held-owner/held-pkg/moderation', { owner: '@held-owner', pkg: 'held-pkg' }, {
        method: 'POST',
        body: JSON.stringify({ state: 'held', reason: 'em revisão' }),
        ...auth(opToken),
      }),
    );

    const res = await searchGet(ctx('http://test/api/v1/search?q=held-pkg'));
    const body: any = await res.json();
    const item = body.items.find((i: any) => i.name === '@held-owner/held-pkg');
    expect(item).toBeDefined();
    expect(item.moderationState).toBe('held');
  });

  it('pacote hidden não aparece na busca, mas o dono consegue consultar direto', async () => {
    await seedPackage({ ownerHandle: 'hidden-owner', pkgSlug: 'hidden-pkg' });
    const opToken = await sessionTokenFor('op-hidden', { isOperator: true });
    await moderationPost(
      ctx(
        'http://test/api/v1/packages/@hidden-owner/hidden-pkg/moderation',
        { owner: '@hidden-owner', pkg: 'hidden-pkg' },
        { method: 'POST', body: JSON.stringify({ state: 'hidden' }), ...auth(opToken) },
      ),
    );

    const searchRes = await searchGet(ctx('http://test/api/v1/search?q=hidden-pkg'));
    const searchBody: any = await searchRes.json();
    expect(searchBody.items.find((i: any) => i.name === '@hidden-owner/hidden-pkg')).toBeUndefined();

    const directRes = await packageGet(
      ctx('http://test/api/v1/packages/@hidden-owner/hidden-pkg', { owner: '@hidden-owner', pkg: 'hidden-pkg' }),
    );
    expect(directRes.status).toBe(200);
  });

  it('pacote blocked recusa download pra todo mundo, inclusive o dono', async () => {
    const { packageId } = await seedPackage({ ownerHandle: 'blocked-owner', pkgSlug: 'blocked-pkg' });
    await seedVersion({ packageId, version: '1.0.0', r2Key: 'packages/blocked-owner/blocked-pkg/1.0.0.tgz' });
    const opToken = await sessionTokenFor('op-blocked', { isOperator: true });
    await moderationPost(
      ctx(
        'http://test/api/v1/packages/@blocked-owner/blocked-pkg/moderation',
        { owner: '@blocked-owner', pkg: 'blocked-pkg' },
        { method: 'POST', body: JSON.stringify({ state: 'blocked' }), ...auth(opToken) },
      ),
    );

    const res = await downloadGet(
      ctx('http://test/api/v1/packages/@blocked-owner/blocked-pkg/versions/1.0.0/download', {
        owner: '@blocked-owner',
        pkg: 'blocked-pkg',
        version: '1.0.0',
      }),
    );
    expect(res.status).toBe(403);
  });
});

describe('só um operador transiciona o estado de moderação', () => {
  it('sessão comum recebe 403', async () => {
    await seedPackage({ ownerHandle: 'someone', pkgSlug: 'their-pkg' });
    const token = await sessionTokenFor('not-an-operator');
    const res = await moderationPost(
      ctx('http://test/api/v1/packages/@someone/their-pkg/moderation', { owner: '@someone', pkg: 'their-pkg' }, {
        method: 'POST',
        body: JSON.stringify({ state: 'hidden' }),
        ...auth(token),
      }),
    );
    expect(res.status).toBe(403);
  });
});

describe('apelação', () => {
  it('dono apela de um estado hidden/blocked e um operador vê na fila', async () => {
    // publica de verdade (não seedPackage) pra garantir que owner_id do
    // pacote bate com o ownerId da sessão usada pra apelar.
    const ownerToken = await sessionTokenFor('appeal-owner');
    const publishRes = await publishPost(
      ctx('http://test/api/v1/packages/@appeal-owner/appeal-pkg/versions', { owner: '@appeal-owner', pkg: 'appeal-pkg' }, {
        method: 'POST',
        body: publishForm({ kind: 'plugin', version: '1.0.0', category: 'tool' }, { content: 'x' }),
        ...auth(ownerToken),
      }),
    );
    expect(publishRes.status).toBe(201);

    const opToken = await sessionTokenFor('op-appeal', { isOperator: true });
    await moderationPost(
      ctx(
        'http://test/api/v1/packages/@appeal-owner/appeal-pkg/moderation',
        { owner: '@appeal-owner', pkg: 'appeal-pkg' },
        { method: 'POST', body: JSON.stringify({ state: 'hidden' }), ...auth(opToken) },
      ),
    );

    const appealRes = await appealPost(
      ctx('http://test/api/v1/packages/@appeal-owner/appeal-pkg/appeal', { owner: '@appeal-owner', pkg: 'appeal-pkg' }, {
        method: 'POST',
        body: JSON.stringify({ justification: 'não é o que vocês pensam' }),
        ...auth(ownerToken),
      }),
    );
    expect(appealRes.status).toBe(201);

    const queue = await reportsQueueGet(ctx('http://test/api/v1/moderation/reports', {}, auth(opToken)));
    expect(queue.status).toBe(200);
    const queueBody: any = await queue.json();
    expect(queueBody.items.some((r: any) => r.reason.startsWith('appeal: '))).toBe(true);
  });

  it('quem não é dono não pode apelar', async () => {
    const ownerToken = await sessionTokenFor('appeal-owner-3');
    await publishPost(
      ctx('http://test/api/v1/packages/@appeal-owner-3/pkg/versions', { owner: '@appeal-owner-3', pkg: 'pkg' }, {
        method: 'POST',
        body: publishForm({ kind: 'plugin', version: '1.0.0', category: 'tool' }, { content: 'x' }),
        ...auth(ownerToken),
      }),
    );
    const strangerToken = await sessionTokenFor('stranger');
    const res = await appealPost(
      ctx('http://test/api/v1/packages/@appeal-owner-3/pkg/appeal', { owner: '@appeal-owner-3', pkg: 'pkg' }, {
        method: 'POST',
        body: JSON.stringify({ justification: 'deixa eu apelar' }),
        ...auth(strangerToken),
      }),
    );
    expect(res.status).toBe(403);
  });
});
