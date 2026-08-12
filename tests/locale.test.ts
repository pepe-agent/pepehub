import { describe, expect, it } from 'vitest';
import { resolveLocale, resolveLocaleFromAcceptLanguage } from '../src/lib/locale';

describe('resolveLocaleFromAcceptLanguage', () => {
  it('retorna null sem header', () => {
    expect(resolveLocaleFromAcceptLanguage(null)).toBeNull();
  });

  it('reconhece um locale suportado exato', () => {
    expect(resolveLocaleFromAcceptLanguage('en')).toBe('en');
    expect(resolveLocaleFromAcceptLanguage('es')).toBe('es');
    expect(resolveLocaleFromAcceptLanguage('pt-br')).toBe('pt-br');
    expect(resolveLocaleFromAcceptLanguage('pt-pt')).toBe('pt-pt');
  });

  it('respeita q-value, não a ordem de aparição', () => {
    expect(resolveLocaleFromAcceptLanguage('en;q=0.5,es;q=0.9')).toBe('es');
  });

  it('"pt" puro (sem região) cai em pt-br', () => {
    expect(resolveLocaleFromAcceptLanguage('pt')).toBe('pt-br');
    expect(resolveLocaleFromAcceptLanguage('pt;q=0.8')).toBe('pt-br');
  });

  it('região de português que não é BR cai em pt-pt', () => {
    expect(resolveLocaleFromAcceptLanguage('pt-mz')).toBe('pt-pt');
    expect(resolveLocaleFromAcceptLanguage('pt-ao')).toBe('pt-pt');
  });

  it('variantes regionais de es/en caem no idioma base suportado', () => {
    expect(resolveLocaleFromAcceptLanguage('es-MX')).toBe('es');
    expect(resolveLocaleFromAcceptLanguage('en-GB')).toBe('en');
  });

  it('pula idiomas não suportados até achar um que bate', () => {
    expect(resolveLocaleFromAcceptLanguage('fr-FR,de;q=0.9,es;q=0.8')).toBe('es');
  });

  it('retorna null quando nada bate', () => {
    expect(resolveLocaleFromAcceptLanguage('fr-FR,de;q=0.9')).toBeNull();
  });
});

describe('resolveLocale', () => {
  it('usa o cookie quando presente e válido', () => {
    const req = new Request('http://test/', {
      headers: { Cookie: 'pepehub_locale=en', 'Accept-Language': 'es' },
    });
    expect(resolveLocale(req)).toBe('en');
  });

  it('ignora cookie inválido e cai pro Accept-Language', () => {
    const req = new Request('http://test/', {
      headers: { Cookie: 'pepehub_locale=xx-yy', 'Accept-Language': 'es' },
    });
    expect(resolveLocale(req)).toBe('es');
  });

  it('sem cookie e sem Accept-Language reconhecível, cai no default (pt-br)', () => {
    const req = new Request('http://test/');
    expect(resolveLocale(req)).toBe('pt-br');
  });
});
