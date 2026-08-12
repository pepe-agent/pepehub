import { describe, expect, it } from 'vitest';
import { GET as setLocaleGet } from '../src/pages/set-locale';

function ctx(url: string) {
  return { url: new URL(url) } as any;
}

describe('GET /set-locale', () => {
  it('seta o cookie e redireciona pra home por padrão', async () => {
    const res = await setLocaleGet(ctx('http://test/set-locale?locale=en'));
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/');
    expect(res.headers.get('Set-Cookie')).toContain('pepehub_locale=en');
  });

  it('redireciona pro caminho pedido quando é relativo', async () => {
    const res = await setLocaleGet(ctx('http://test/set-locale?locale=es&redirect=/publish'));
    expect(res.headers.get('Location')).toBe('/publish');
  });

  it('recusa redirect pra outro domínio (open redirect)', async () => {
    const res = await setLocaleGet(
      ctx('http://test/set-locale?locale=en&redirect=https://evil.example'),
    );
    expect(res.headers.get('Location')).toBe('/');
  });

  it('recusa redirect protocol-relative (//)', async () => {
    const res = await setLocaleGet(ctx('http://test/set-locale?locale=en&redirect=//evil.example'));
    expect(res.headers.get('Location')).toBe('/');
  });

  it('retorna 400 pra idioma não suportado', async () => {
    const res = await setLocaleGet(ctx('http://test/set-locale?locale=fr'));
    expect(res.status).toBe(400);
  });
});
