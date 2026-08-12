import { createExecutionContext } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { POST as metadataPost } from '../src/pages/api/v1/packages/[owner]/[pkg]/metadata';
import { POST as publishPost } from '../src/pages/api/v1/packages/[owner]/[pkg]/versions';
import { MAX_SUMMARY_LENGTH } from '../src/lib/manifest';
import { publishForm, sessionTokenFor } from './helpers';

function ctx(url: string, params: Record<string, string>, init?: RequestInit) {
  return { request: new Request(url, init), params, locals: { cfContext: createExecutionContext() } } as any;
}

async function publish(owner: string, pkg: string, token: string) {
  return publishPost(
    ctx(`http://test/api/v1/packages/${owner}/${pkg}/versions`, { owner, pkg }, {
      method: 'POST',
      body: publishForm({ kind: 'plugin', version: '1.0.0', category: 'tool' }, { content: 'x' }),
      headers: { Authorization: `Bearer ${token}` },
    }),
  );
}

async function metadataRequest(
  owner: string,
  pkg: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
) {
  return metadataPost(
    ctx(`http://test/api/v1/packages/${owner}/${pkg}/metadata`, { owner, pkg }, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }),
  );
}

describe('POST /api/v1/packages/<name>/metadata', () => {
  it('retorna 401 sem sessão', async () => {
    const res = await metadataRequest('@alice', 'algo', {}, { summary: 'novo', category: 'tool' });
    expect(res.status).toBe(401);
  });

  it('dono atualiza resumo e categoria com Bearer', async () => {
    const token = await sessionTokenFor('ivan');
    const publishRes = await publish('@ivan', 'metadata-bearer', token);
    expect(publishRes.status).toBe(201);

    const res = await metadataRequest('@ivan', 'metadata-bearer', { Authorization: `Bearer ${token}` }, {
      summary: 'resumo atualizado',
      category: 'automation',
    });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body).toEqual({ name: '@ivan/metadata-bearer', summary: 'resumo atualizado', category: 'automation' });
  });

  it('dono atualiza via cookie quando Sec-Fetch-Site é same-origin', async () => {
    const token = await sessionTokenFor('julia');
    const publishRes = await publish('@julia', 'metadata-cookie', token);
    expect(publishRes.status).toBe(201);

    const res = await metadataRequest(
      '@julia',
      'metadata-cookie',
      { Cookie: `pepehub_session=${token}`, 'Sec-Fetch-Site': 'same-origin' },
      { summary: 'via cookie', category: 'other' },
    );
    expect(res.status).toBe(200);
  });

  it('recusa cookie sem Sec-Fetch-Site same-origin', async () => {
    const token = await sessionTokenFor('kevin');
    const publishRes = await publish('@kevin', 'metadata-cross-site', token);
    expect(publishRes.status).toBe(201);

    const res = await metadataRequest('@kevin', 'metadata-cross-site', { Cookie: `pepehub_session=${token}` }, {
      summary: 'nao deveria salvar',
      category: 'other',
    });
    expect(res.status).toBe(401);
  });

  it('recusa quem não é dono do pacote', async () => {
    const ownerToken = await sessionTokenFor('karl');
    const publishRes = await publish('@karl', 'metadata-outro-dono', ownerToken);
    expect(publishRes.status).toBe(201);

    const strangerToken = await sessionTokenFor('mallory');
    const res = await metadataRequest('@karl', 'metadata-outro-dono', { Authorization: `Bearer ${strangerToken}` }, {
      summary: 'invasão',
      category: 'tool',
    });
    expect(res.status).toBe(403);
  });

  it('recusa categoria fora da lista fixa', async () => {
    const token = await sessionTokenFor('nina');
    const publishRes = await publish('@nina', 'metadata-categoria-invalida', token);
    expect(publishRes.status).toBe(201);

    const res = await metadataRequest('@nina', 'metadata-categoria-invalida', { Authorization: `Bearer ${token}` }, {
      summary: 'ok',
      category: 'nao-existe',
    });
    expect(res.status).toBe(400);
  });

  it('recusa summary acima do limite', async () => {
    const token = await sessionTokenFor('paula');
    const publishRes = await publish('@paula', 'metadata-summary-longo', token);
    expect(publishRes.status).toBe(201);

    const res = await metadataRequest('@paula', 'metadata-summary-longo', { Authorization: `Bearer ${token}` }, {
      summary: 'a'.repeat(MAX_SUMMARY_LENGTH + 1),
      category: 'tool',
    });
    expect(res.status).toBe(400);
  });

  it('retorna 404 pra pacote inexistente', async () => {
    const token = await sessionTokenFor('oscar');
    const res = await metadataRequest('@oscar', 'nao-existe', { Authorization: `Bearer ${token}` }, {
      summary: 'ok',
      category: 'tool',
    });
    expect(res.status).toBe(404);
  });
});
