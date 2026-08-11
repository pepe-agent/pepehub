import { createExecutionContext } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { GET as searchGet } from '../src/pages/api/v1/search';
import { POST as publishPost } from '../src/pages/api/v1/packages/[owner]/[pkg]/versions';
import { POST as moderationPost } from '../src/pages/api/v1/packages/[owner]/[pkg]/moderation';
import { POST as banPost } from '../src/pages/api/v1/admin/publishers/[handle]/ban';
import { POST as unbanPost } from '../src/pages/api/v1/admin/publishers/[handle]/unban';
import { POST as reserveNamePost } from '../src/pages/api/v1/admin/reserved-names';
import { publishForm, sessionTokenFor } from './helpers';

function ctx(url: string, params: Record<string, string> = {}, init?: RequestInit) {
  return { request: new Request(url, init), params, locals: { cfContext: createExecutionContext() } } as any;
}

function auth(token: string): RequestInit {
  return { headers: { Authorization: `Bearer ${token}` } };
}

async function publish(owner: string, pkg: string, token: string, version = '1.0.0') {
  return publishPost(
    ctx(`http://test/api/v1/packages/${owner}/${pkg}/versions`, { owner, pkg }, {
      method: 'POST',
      body: publishForm({ kind: 'plugin', version, category: 'tool' }, { content: 'x' }),
      ...auth(token),
    }),
  );
}

describe('banir/desbanir um publisher', () => {
  it('banimento oculta todos os pacotes do publisher; sessão comum não pode banir', async () => {
    const publisherToken = await sessionTokenFor('banned-publisher');
    await publish('@banned-publisher', 'pkg-a', publisherToken);
    await publish('@banned-publisher', 'pkg-b', publisherToken);

    const commonToken = await sessionTokenFor('not-an-operator-admin');
    const forbidden = await banPost(
      ctx('http://test/api/v1/admin/publishers/banned-publisher/ban', { handle: 'banned-publisher' }, {
        method: 'POST',
        ...auth(commonToken),
      }),
    );
    expect(forbidden.status).toBe(403);

    const opToken = await sessionTokenFor('op-ban', { isOperator: true });
    const ban = await banPost(
      ctx('http://test/api/v1/admin/publishers/banned-publisher/ban', { handle: 'banned-publisher' }, {
        method: 'POST',
        ...auth(opToken),
      }),
    );
    expect(ban.status).toBe(200);

    const searchA = await searchGet(ctx('http://test/api/v1/search?q=pkg-a'));
    const searchABody: any = await searchA.json();
    expect(searchABody.items.find((i: any) => i.name === '@banned-publisher/pkg-a')).toBeUndefined();

    const searchB = await searchGet(ctx('http://test/api/v1/search?q=pkg-b'));
    const searchBBody: any = await searchB.json();
    expect(searchBBody.items.find((i: any) => i.name === '@banned-publisher/pkg-b')).toBeUndefined();
  });

  it('desbanir reverte só os pacotes ocultados pelo próprio banimento', async () => {
    const publisherToken = await sessionTokenFor('unban-publisher');
    await publish('@unban-publisher', 'pkg-c', publisherToken);
    await publish('@unban-publisher', 'pkg-d', publisherToken);

    const opToken = await sessionTokenFor('op-unban', { isOperator: true });

    // pkg-d já estava hidden por outro motivo, antes do banimento
    await moderationPost(
      ctx('http://test/api/v1/packages/@unban-publisher/pkg-d/moderation', { owner: '@unban-publisher', pkg: 'pkg-d' }, {
        method: 'POST',
        body: JSON.stringify({ state: 'hidden', reason: 'denúncia legítima' }),
        ...auth(opToken),
      }),
    );

    await banPost(
      ctx('http://test/api/v1/admin/publishers/unban-publisher/ban', { handle: 'unban-publisher' }, {
        method: 'POST',
        ...auth(opToken),
      }),
    );

    await unbanPost(
      ctx('http://test/api/v1/admin/publishers/unban-publisher/unban', { handle: 'unban-publisher' }, {
        method: 'POST',
        ...auth(opToken),
      }),
    );

    const searchC = await searchGet(ctx('http://test/api/v1/search?q=pkg-c'));
    const searchCBody: any = await searchC.json();
    expect(searchCBody.items.find((i: any) => i.name === '@unban-publisher/pkg-c')).toBeDefined();

    const searchD = await searchGet(ctx('http://test/api/v1/search?q=pkg-d'));
    const searchDBody: any = await searchD.json();
    expect(searchDBody.items.find((i: any) => i.name === '@unban-publisher/pkg-d')).toBeUndefined();
  });
});

describe('reserva preventiva de um nome', () => {
  it('recusa publish de quem não é o destinatário da reserva, aceita do destinatário', async () => {
    const opToken = await sessionTokenFor('op-reserve', { isOperator: true });
    const intendedToken = await sessionTokenFor('intended-owner');

    const reserve = await reserveNamePost(
      ctx('http://test/api/v1/admin/reserved-names', {}, {
        method: 'POST',
        body: JSON.stringify({ name: '@intended-owner/coveted-name', forHandle: 'intended-owner' }),
        ...auth(opToken),
      }),
    );
    expect(reserve.status).toBe(201);

    const strangerToken = await sessionTokenFor('name-squatter');
    // um estranho não alcança o namespace @intended-owner de qualquer forma
    // (namespace_mismatch já bloquearia). O cenário relevante de
    // "reservado" é quando o próprio dono do namespace tenta um nome
    // reservado pra outra pessoa.
    const otherReserve = await reserveNamePost(
      ctx('http://test/api/v1/admin/reserved-names', {}, {
        method: 'POST',
        body: JSON.stringify({ name: '@name-squatter/coveted-name', forHandle: 'intended-owner' }),
        ...auth(opToken),
      }),
    );
    expect(otherReserve.status).toBe(201);

    const blocked = await publish('@name-squatter', 'coveted-name', strangerToken);
    expect(blocked.status).toBe(403);
    const blockedBody: any = await blocked.json();
    expect(blockedBody.error).toBe('name_reserved');

    const allowed = await publish('@intended-owner', 'coveted-name', intendedToken);
    expect(allowed.status).toBe(201);
  });
});
