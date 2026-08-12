import { describe, expect, it } from 'vitest';
import { isManifestError, MAX_SUMMARY_LENGTH, parseManifest } from '../src/lib/manifest';

describe('parseManifest', () => {
  it('aceita um manifesto válido e aplica defaults', () => {
    const result = parseManifest({ kind: 'plugin', version: '1.2.3', category: 'tool' });
    expect(isManifestError(result)).toBe(false);
    expect(result).toMatchObject({ kind: 'plugin', version: '1.2.3', category: 'tool', tag: 'latest' });
  });

  it('rejeita kind inválido', () => {
    const result = parseManifest({ kind: 'not-a-kind', version: '1.0.0', category: 'tool' });
    expect(isManifestError(result)).toBe(true);
  });

  it('rejeita version que não é semver', () => {
    const result = parseManifest({ kind: 'plugin', version: 'v1', category: 'tool' });
    expect(isManifestError(result)).toBe(true);
  });

  it('rejeita categoria ausente', () => {
    const result = parseManifest({ kind: 'plugin', version: '1.0.0' });
    expect(isManifestError(result)).toBe(true);
  });

  it('rejeita categoria fora da lista fixa', () => {
    const result = parseManifest({ kind: 'plugin', version: '1.0.0', category: 'invalid' });
    expect(isManifestError(result)).toBe(true);
  });

  it('guarda requires verbatim quando presente', () => {
    const result = parseManifest({
      kind: 'plugin',
      version: '1.0.0',
      category: 'tool',
      requires: { env: ['TODOIST_API_KEY'], bins: ['curl'] },
    });
    expect(isManifestError(result)).toBe(false);
    expect(JSON.parse((result as any).requiresJson)).toEqual({ env: ['TODOIST_API_KEY'], bins: ['curl'] });
  });

  it('aceita a ausência de requires como null', () => {
    const result = parseManifest({ kind: 'plugin', version: '1.0.0', category: 'tool' });
    expect(isManifestError(result)).toBe(false);
    expect((result as any).requiresJson).toBeNull();
  });

  it('rejeita requires que não é um objeto', () => {
    const result = parseManifest({ kind: 'plugin', version: '1.0.0', category: 'tool', requires: 'nope' });
    expect(isManifestError(result)).toBe(true);
  });

  it('aceita summary dentro do limite', () => {
    const result = parseManifest({
      kind: 'plugin',
      version: '1.0.0',
      category: 'tool',
      summary: 'a'.repeat(MAX_SUMMARY_LENGTH),
    });
    expect(isManifestError(result)).toBe(false);
  });

  it('rejeita summary acima do limite', () => {
    const result = parseManifest({
      kind: 'plugin',
      version: '1.0.0',
      category: 'tool',
      summary: 'a'.repeat(MAX_SUMMARY_LENGTH + 1),
    });
    expect(isManifestError(result)).toBe(true);
  });
});
