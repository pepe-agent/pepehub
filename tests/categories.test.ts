import { describe, expect, it } from 'vitest';
import { CATEGORIES, isCategory } from '../src/lib/categories';

describe('categories', () => {
  it('aceita qualquer categoria da lista fixa', () => {
    for (const category of CATEGORIES) {
      expect(isCategory(category)).toBe(true);
    }
  });

  it('rejeita uma categoria fora da lista', () => {
    expect(isCategory('not-a-real-category')).toBe(false);
  });

  it('rejeita ausência de categoria', () => {
    expect(isCategory(undefined)).toBe(false);
    expect(isCategory(null)).toBe(false);
  });
});
