import { describe, expect, it } from 'vitest';
import { onRequest } from '../src/middleware';
import { sessionTokenFor } from './helpers';

function ctx(url: string, init?: RequestInit) {
  return { request: new Request(url, init), locals: {} } as any;
}

function okNext() {
  return async () => new Response('ok', { status: 200 });
}

async function run(url: string, init?: RequestInit) {
  return (await onRequest(ctx(url, init), okNext())) as Response;
}

describe('rate limit middleware', () => {
  it('não mexe em rotas fora de /api/v1/', async () => {
    const res = await run('http://test/publish');
    expect(res.status).toBe(200);
    expect(res.headers.get('RateLimit-Limit')).toBeNull();
  });

  it('inclui os headers RateLimit-* numa chamada de leitura dentro do limite', async () => {
    const res = await run('http://test/api/v1/search');
    expect(res.status).toBe(200);
    expect(res.headers.get('RateLimit-Limit')).toBe('600');
    expect(res.headers.get('RateLimit-Remaining')).toBe('600');
    expect(res.headers.get('RateLimit-Reset')).toMatch(/^\d+$/);
  });

  it('usa o limite de escrita autenticado maior que o anônimo', async () => {
    const token = await sessionTokenFor('rate-limit-writer');
    const anon = await run('http://test/api/v1/packages/@a/b/versions', { method: 'POST' });
    const auth = await run('http://test/api/v1/packages/@a/b/versions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(Number(auth.headers.get('RateLimit-Limit'))).toBeGreaterThan(
      Number(anon.headers.get('RateLimit-Limit')),
    );
  });

  it('retorna 429 com Retry-After ao exceder o limite de escrita anônimo', async () => {
    // limite de escrita anônimo = 60/min (menor categoria, testável num loop rápido)
    let last: Response;
    for (let i = 0; i < 61; i++) {
      last = await run('http://test/api/v1/auth/device/start', {
        method: 'POST',
        headers: { 'cf-connecting-ip': '203.0.113.9' },
      });
    }
    expect(last!.status).toBe(429);
    expect(last!.headers.get('Retry-After')).toBe('60');
    const body: any = await last!.json();
    expect(body.error).toBe('rate_limited');
  });
});
