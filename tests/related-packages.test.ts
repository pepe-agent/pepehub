import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { findRelatedPackages } from '../src/lib/db';
import { seedPackage } from './helpers';

describe('findRelatedPackages', () => {
  it('retorna outros pacotes da mesma categoria e kind, excluindo o próprio', async () => {
    const target = await seedPackage({ ownerHandle: 'rel-owner-1', pkgSlug: 'target', category: 'integration' });
    const sibling = await seedPackage({ ownerHandle: 'rel-owner-2', pkgSlug: 'sibling', category: 'integration' });
    await seedPackage({ ownerHandle: 'rel-owner-3', pkgSlug: 'outra-categoria', category: 'tool' });
    await seedPackage({
      ownerHandle: 'rel-owner-4',
      pkgSlug: 'outro-kind',
      category: 'integration',
      kind: 'skill',
    });

    const related = await findRelatedPackages(env.DB, {
      category: 'integration',
      kind: 'plugin',
      excludePackageId: target.packageId,
      limit: 5,
    });

    const names = related.map((r) => r.name);
    expect(names).toContain(sibling.name);
    expect(names).not.toContain(target.name);
    expect(names.every((n) => !n.includes('outra-categoria') && !n.includes('outro-kind'))).toBe(true);
  });

  it('respeita o limite', async () => {
    for (let i = 0; i < 3; i++) {
      await seedPackage({ ownerHandle: `rel-limit-${i}`, pkgSlug: `pkg-${i}`, category: 'automation' });
    }
    const related = await findRelatedPackages(env.DB, {
      category: 'automation',
      kind: 'plugin',
      excludePackageId: -1,
      limit: 2,
    });
    expect(related.length).toBeLessThanOrEqual(2);
  });
});
