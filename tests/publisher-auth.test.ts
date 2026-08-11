import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET as whoamiGet } from '../src/pages/api/v1/auth/whoami';
import { POST as deviceStartPost } from '../src/pages/api/v1/auth/device/start';
import { POST as devicePollPost } from '../src/pages/api/v1/auth/device/poll';
import { sessionTokenFor } from './helpers';

function ctx(url: string, init?: RequestInit) {
  return { request: new Request(url, init), params: {} } as any;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('POST /api/v1/auth/device/start', () => {
  it('retorna deviceCode, userCode, verificationUri e interval', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          device_code: 'devcode123',
          user_code: 'ABCD-1234',
          verification_uri: 'https://github.com/login/device',
          expires_in: 900,
          interval: 5,
        }),
      ),
    );

    const res = await deviceStartPost(ctx('http://test/api/v1/auth/device/start', { method: 'POST' }));
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body).toEqual({
      deviceCode: 'devcode123',
      userCode: 'ABCD-1234',
      verificationUri: 'https://github.com/login/device',
      interval: 5,
    });
  });
});

describe('POST /api/v1/auth/device/poll', () => {
  it('retorna status pending antes da aprovação', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'authorization_pending' })));

    const res = await devicePollPost(
      ctx('http://test/api/v1/auth/device/poll', {
        method: 'POST',
        body: JSON.stringify({ deviceCode: 'devcode123' }),
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'pending' });
  });

  it('retorna erro de expirado pra um deviceCode expirado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'expired_token' })));

    const res = await devicePollPost(
      ctx('http://test/api/v1/auth/device/poll', {
        method: 'POST',
        body: JSON.stringify({ deviceCode: 'devcode123' }),
      }),
    );
    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error).toBe('expired');
  });

  it('emite um token de sessão do PepeHub quando aprovado, sem devolver o token do GitHub', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('login/oauth/access_token')) {
        return Promise.resolve(jsonResponse({ access_token: 'gho_super_secret_token', token_type: 'bearer' }));
      }
      if (url.includes('api.github.com/user')) {
        return Promise.resolve(jsonResponse({ id: 555, login: 'GraceHopper', name: 'Grace Hopper' }));
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await devicePollPost(
      ctx('http://test/api/v1/auth/device/poll', {
        method: 'POST',
        body: JSON.stringify({ deviceCode: 'devcode123' }),
      }),
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.status).toBe('approved');
    expect(typeof body.token).toBe('string');
    expect(JSON.stringify(body)).not.toContain('gho_super_secret_token');

    const whoamiRes = await whoamiGet(
      ctx('http://test/api/v1/auth/whoami', { headers: { Authorization: `Bearer ${body.token}` } }),
    );
    expect(whoamiRes.status).toBe(200);
    expect(await whoamiRes.json()).toEqual({ handle: 'gracehopper', githubId: 555 });
  });
});

describe('GET /api/v1/auth/whoami', () => {
  it('retorna handle e githubId pra uma sessão válida', async () => {
    const token = await sessionTokenFor('heidi');
    const res = await whoamiGet(ctx('http://test/api/v1/auth/whoami', { headers: { Authorization: `Bearer ${token}` } }));
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.handle).toBe('heidi');
  });

  it('retorna 401 sem token', async () => {
    const res = await whoamiGet(ctx('http://test/api/v1/auth/whoami'));
    expect(res.status).toBe(401);
  });

  it('retorna 401 com token inválido', async () => {
    const res = await whoamiGet(
      ctx('http://test/api/v1/auth/whoami', { headers: { Authorization: 'Bearer not-a-real-token' } }),
    );
    expect(res.status).toBe(401);
  });
});
