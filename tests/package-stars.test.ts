import { describe, expect, it } from 'vitest';
import { GET as packageGet } from '../src/pages/api/v1/packages/[owner]/[pkg]/index';
import { POST as starPost } from '../src/pages/api/v1/packages/[owner]/[pkg]/star';
import { POST as unstarPost } from '../src/pages/api/v1/packages/[owner]/[pkg]/unstar';
import { seedPackage, sessionTokenFor } from './helpers';

function ctx(url: string, params: Record<string, string> = {}, init?: RequestInit) {
  return { request: new Request(url, init), params } as any;
}

function auth(token: string): RequestInit {
  return { headers: { Authorization: `Bearer ${token}` } };
}

describe('favoritar/desfavoritar', () => {
  it('favorita, favoritar de novo não duplica, e a contagem é pública', async () => {
    const { name } = await seedPackage({ ownerHandle: 'starred-owner', pkgSlug: 'starred-pkg' });
    const token = await sessionTokenFor('starrer');

    const first = await starPost(
      ctx('http://test/api/v1/packages/@starred-owner/starred-pkg/star', { owner: '@starred-owner', pkg: 'starred-pkg' }, {
        method: 'POST',
        ...auth(token),
      }),
    );
    expect(first.status).toBe(200);
    const firstBody: any = await first.json();
    expect(firstBody.starsCount).toBe(1);

    const second = await starPost(
      ctx('http://test/api/v1/packages/@starred-owner/starred-pkg/star', { owner: '@starred-owner', pkg: 'starred-pkg' }, {
        method: 'POST',
        ...auth(token),
      }),
    );
    expect(second.status).toBe(200);
    const secondBody: any = await second.json();
    expect(secondBody.starsCount).toBe(1);

    const publicRes = await packageGet(
      ctx('http://test/api/v1/packages/@starred-owner/starred-pkg', { owner: '@starred-owner', pkg: 'starred-pkg' }),
    );
    const publicBody: any = await publicRes.json();
    expect(publicBody.starsCount).toBe(1);
    void name;
  });

  it('desfavoritar sem nunca ter favoritado não dá erro', async () => {
    await seedPackage({ ownerHandle: 'never-starred-owner', pkgSlug: 'never-starred-pkg' });
    const token = await sessionTokenFor('non-starrer');
    const res = await unstarPost(
      ctx(
        'http://test/api/v1/packages/@never-starred-owner/never-starred-pkg/unstar',
        { owner: '@never-starred-owner', pkg: 'never-starred-pkg' },
        { method: 'POST', ...auth(token) },
      ),
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.starsCount).toBe(0);
  });

  it('desfavoritar depois de favoritar reduz a contagem', async () => {
    await seedPackage({ ownerHandle: 'unstar-owner', pkgSlug: 'unstar-pkg' });
    const token = await sessionTokenFor('flip-flopper');
    await starPost(
      ctx('http://test/api/v1/packages/@unstar-owner/unstar-pkg/star', { owner: '@unstar-owner', pkg: 'unstar-pkg' }, {
        method: 'POST',
        ...auth(token),
      }),
    );
    const res = await unstarPost(
      ctx('http://test/api/v1/packages/@unstar-owner/unstar-pkg/unstar', { owner: '@unstar-owner', pkg: 'unstar-pkg' }, {
        method: 'POST',
        ...auth(token),
      }),
    );
    const body: any = await res.json();
    expect(body.starsCount).toBe(0);
  });
});
