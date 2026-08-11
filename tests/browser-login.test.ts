import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET as loginGet } from '../src/pages/login';
import { GET as callbackGet } from '../src/pages/api/v1/auth/github/callback';
import { GET as logoutGet } from '../src/pages/logout';
import { verifySessionToken } from '../src/lib/session';
import { env } from 'cloudflare:workers';

function ctx(url: string, init?: RequestInit) {
  return { request: new Request(url, init), params: {} } as any;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function cookieValue(setCookieHeaders: string[], name: string): string | undefined {
  const header = setCookieHeaders.find((h) => h.startsWith(`${name}=`));
  return header?.split(';')[0].split('=')[1];
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GET /login', () => {
  it('redireciona pro authorize do GitHub com state e seta o cookie de state', async () => {
    const res = await loginGet(ctx('http://test/login'));
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get('Location')!);
    expect(location.origin).toBe('https://github.com');
    expect(location.pathname).toBe('/login/oauth/authorize');
    expect(location.searchParams.get('redirect_uri')).toBe('http://test/api/v1/auth/github/callback');
    const state = location.searchParams.get('state');
    expect(state).toBeTruthy();
    expect(res.headers.get('Set-Cookie')).toContain(`pepehub_oauth_state=${state}`);
  });
});

describe('GET /api/v1/auth/github/callback', () => {
  it('troca o code, cria a sessão via cookie e redireciona pra home', async () => {
    const loginRes = await loginGet(ctx('http://test/login'));
    const state = new URL(loginRes.headers.get('Location')!).searchParams.get('state')!;

    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('login/oauth/access_token')) {
        return Promise.resolve(jsonResponse({ access_token: 'gho_browser_secret' }));
      }
      if (url.includes('api.github.com/user')) {
        return Promise.resolve(jsonResponse({ id: 777, login: 'AdaLovelace', name: 'Ada Lovelace' }));
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await callbackGet(
      ctx(`http://test/api/v1/auth/github/callback?code=abc123&state=${state}`, {
        headers: { Cookie: `pepehub_oauth_state=${state}` },
      }),
    );

    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/');

    const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('Set-Cookie')!];
    expect(JSON.stringify(setCookies)).not.toContain('gho_browser_secret');

    const sessionToken = cookieValue(setCookies, 'pepehub_session');
    expect(sessionToken).toBeTruthy();
    const payload = await verifySessionToken(sessionToken!, env.SESSION_SECRET);
    expect(payload?.handle).toBe('adalovelace');

    const stateCookie = setCookies.find((h) => h.startsWith('pepehub_oauth_state='));
    expect(stateCookie).toContain('Max-Age=0');
  });

  it('rejeita quando o state não bate com o cookie', async () => {
    const res = await callbackGet(
      ctx('http://test/api/v1/auth/github/callback?code=abc123&state=forged', {
        headers: { Cookie: 'pepehub_oauth_state=real-state' },
      }),
    );
    expect(res.status).toBe(400);
  });

  it('rejeita quando falta o cookie de state', async () => {
    const res = await callbackGet(ctx('http://test/api/v1/auth/github/callback?code=abc123&state=whatever'));
    expect(res.status).toBe(400);
  });
});

describe('GET /logout', () => {
  it('limpa o cookie de sessão e redireciona pra home', async () => {
    const res = await logoutGet(ctx('http://test/logout'));
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/');
    expect(res.headers.get('Set-Cookie')).toContain('pepehub_session=;');
    expect(res.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });
});
