import { env } from 'cloudflare:workers';
import { createExecutionContext } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { GET as searchGet } from '../src/pages/api/v1/search';
import { POST as publishPost } from '../src/pages/api/v1/packages/[owner]/[pkg]/versions';
import { POST as deletePost } from '../src/pages/api/v1/packages/[owner]/[pkg]/delete';
import { POST as restorePost } from '../src/pages/api/v1/packages/[owner]/[pkg]/restore';
import { POST as renamePost } from '../src/pages/api/v1/packages/[owner]/[pkg]/rename';
import { POST as transferPost } from '../src/pages/api/v1/packages/[owner]/[pkg]/transfer';
import { POST as transferAcceptPost } from '../src/pages/api/v1/packages/[owner]/[pkg]/transfer/accept';
import { GET as packageGet } from '../src/pages/api/v1/packages/[owner]/[pkg]/index';
import { publishForm, sessionTokenFor } from './helpers';

function ctx(url: string, params: Record<string, string> = {}, init?: RequestInit) {
  return { request: new Request(url, init), params, locals: { cfContext: createExecutionContext() } } as any;
}

function auth(token: string): RequestInit {
  return { headers: { Authorization: `Bearer ${token}` } };
}

async function publish(owner: string, pkg: string, token: string) {
  return publishPost(
    ctx(`http://test/api/v1/packages/${owner}/${pkg}/versions`, { owner, pkg }, {
      method: 'POST',
      body: publishForm({ kind: 'plugin', version: '1.0.0', category: 'tool' }, { content: 'x' }),
      ...auth(token),
    }),
  );
}

describe('apagar/restaurar', () => {
  it('dono apaga (soft delete), some da busca, artefato continua no R2, restaura depois', async () => {
    const token = await sessionTokenFor('lifecycle-owner');
    const publishRes = await publish('@lifecycle-owner', 'del-me', token);
    expect(publishRes.status).toBe(201);

    const del = await deletePost(
      ctx('http://test/api/v1/packages/@lifecycle-owner/del-me/delete', { owner: '@lifecycle-owner', pkg: 'del-me' }, {
        method: 'POST',
        ...auth(token),
      }),
    );
    expect(del.status).toBe(200);

    const searchAfterDelete = await searchGet(ctx('http://test/api/v1/search?q=del-me'));
    const searchBody: any = await searchAfterDelete.json();
    expect(searchBody.items.find((i: any) => i.name === '@lifecycle-owner/del-me')).toBeUndefined();

    const stored = await env.ARTIFACTS.get('packages/lifecycle-owner/del-me/1.0.0.tgz');
    expect(stored).not.toBeNull();

    const restore = await restorePost(
      ctx('http://test/api/v1/packages/@lifecycle-owner/del-me/restore', { owner: '@lifecycle-owner', pkg: 'del-me' }, {
        method: 'POST',
        ...auth(token),
      }),
    );
    expect(restore.status).toBe(200);

    const searchAfterRestore = await searchGet(ctx('http://test/api/v1/search?q=del-me'));
    const searchAfterRestoreBody: any = await searchAfterRestore.json();
    expect(searchAfterRestoreBody.items.find((i: any) => i.name === '@lifecycle-owner/del-me')).toBeDefined();
  });
});

describe('renomear', () => {
  it('nome antigo resolve pro pacote renomeado (redirect), inclusive pra publicar', async () => {
    const token = await sessionTokenFor('rename-owner');
    await publish('@rename-owner', 'nome-velho', token);

    const rename = await renamePost(
      ctx('http://test/api/v1/packages/@rename-owner/nome-velho/rename', { owner: '@rename-owner', pkg: 'nome-velho' }, {
        method: 'POST',
        body: JSON.stringify({ name: '@rename-owner/nome-novo' }),
        ...auth(token),
      }),
    );
    expect(rename.status).toBe(200);

    const byOldName = await packageGet(
      ctx('http://test/api/v1/packages/@rename-owner/nome-velho', { owner: '@rename-owner', pkg: 'nome-velho' }),
    );
    expect(byOldName.status).toBe(200);
    const byOldNameBody: any = await byOldName.json();
    expect(byOldNameBody.name).toBe('@rename-owner/nome-novo');

    // "reaproveitar o nome antigo" resolve pro MESMO pacote (redirect), nunca
    // cria uma identidade nova. Publicar a mesma versão 1.0.0 de novo sob o
    // nome antigo bate no pacote renomeado e é rejeitado como duplicata dele.
    const dup = await publish('@rename-owner', 'nome-velho', token);
    expect(dup.status).toBe(409);
  });

  it('outro handle nunca alcança o namespace de quem renomeou, então não reaproveita o nome antigo', async () => {
    const token = await sessionTokenFor('rename-owner-2');
    await publish('@rename-owner-2', 'nome-velho-2', token);
    await renamePost(
      ctx('http://test/api/v1/packages/@rename-owner-2/nome-velho-2/rename', { owner: '@rename-owner-2', pkg: 'nome-velho-2' }, {
        method: 'POST',
        body: JSON.stringify({ name: '@rename-owner-2/nome-novo-2' }),
        ...auth(token),
      }),
    );

    const otherToken = await sessionTokenFor('someone-else');
    const stolen = await publishPost(
      ctx('http://test/api/v1/packages/@rename-owner-2/nome-velho-2/versions', { owner: '@rename-owner-2', pkg: 'nome-velho-2' }, {
        method: 'POST',
        body: publishForm({ kind: 'plugin', version: '1.0.0', category: 'tool' }, { content: 'x' }),
        ...auth(otherToken),
      }),
    );
    expect(stolen.status).toBe(403);
  });
});

describe('transferência de dono', () => {
  it('fica pendente até o destinatário aceitar, e o namespace passa a exigir o novo dono', async () => {
    const fromToken = await sessionTokenFor('transfer-from');
    const toToken = await sessionTokenFor('transfer-to');
    await publish('@transfer-from', 'transferivel', fromToken);

    const initiate = await transferPost(
      ctx('http://test/api/v1/packages/@transfer-from/transferivel/transfer', { owner: '@transfer-from', pkg: 'transferivel' }, {
        method: 'POST',
        body: JSON.stringify({ toHandle: 'transfer-to' }),
        ...auth(fromToken),
      }),
    );
    expect(initiate.status).toBe(202);

    const stillOldOwner = await packageGet(
      ctx('http://test/api/v1/packages/@transfer-from/transferivel', { owner: '@transfer-from', pkg: 'transferivel' }),
    );
    const stillOldOwnerBody: any = await stillOldOwner.json();
    expect(stillOldOwnerBody.owner).toBe('transfer-from');

    const accept = await transferAcceptPost(
      ctx(
        'http://test/api/v1/packages/@transfer-from/transferivel/transfer/accept',
        { owner: '@transfer-from', pkg: 'transferivel' },
        { method: 'POST', ...auth(toToken) },
      ),
    );
    expect(accept.status).toBe(200);

    const afterAccept = await packageGet(
      ctx('http://test/api/v1/packages/@transfer-from/transferivel', { owner: '@transfer-from', pkg: 'transferivel' }),
    );
    const afterAcceptBody: any = await afterAccept.json();
    expect(afterAcceptBody.owner).toBe('transfer-to');

    // a partir daqui, publicar nesse pacote exige o handle do novo dono
    const oldOwnerPublish = await publish('@transfer-from', 'transferivel', fromToken);
    expect(oldOwnerPublish.status).toBe(403);

    const newOwnerPublish = await publishPost(
      ctx('http://test/api/v1/packages/@transfer-to/transferivel/versions', { owner: '@transfer-to', pkg: 'transferivel' }, {
        method: 'POST',
        body: publishForm({ kind: 'plugin', version: '2.0.0', category: 'tool' }, { content: 'x' }),
        ...auth(toToken),
      }),
    );
    expect(newOwnerPublish.status).toBe(201);
  });

  it('só o destinatário pendente pode aceitar', async () => {
    const fromToken = await sessionTokenFor('transfer-from-2');
    await sessionTokenFor('transfer-to-2');
    await publish('@transfer-from-2', 'pkg', fromToken);
    await transferPost(
      ctx('http://test/api/v1/packages/@transfer-from-2/pkg/transfer', { owner: '@transfer-from-2', pkg: 'pkg' }, {
        method: 'POST',
        body: JSON.stringify({ toHandle: 'transfer-to-2' }),
        ...auth(fromToken),
      }),
    );

    const strangerToken = await sessionTokenFor('random-stranger');
    const res = await transferAcceptPost(
      ctx('http://test/api/v1/packages/@transfer-from-2/pkg/transfer/accept', { owner: '@transfer-from-2', pkg: 'pkg' }, {
        method: 'POST',
        ...auth(strangerToken),
      }),
    );
    expect(res.status).toBe(403);
  });
});
