import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { GET as packageGet } from '../src/pages/api/v1/packages/[owner]/[pkg]/index';
import { POST as starPost } from '../src/pages/api/v1/packages/[owner]/[pkg]/star';
import { POST as unstarPost } from '../src/pages/api/v1/packages/[owner]/[pkg]/unstar';
import { hasStarred } from '../src/lib/stars';
import { verifySessionToken } from '../src/lib/session';
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

  it('favorita via cookie quando Sec-Fetch-Site é same-origin (botão do site)', async () => {
    await seedPackage({ ownerHandle: 'cookie-star-owner', pkgSlug: 'cookie-star-pkg' });
    const token = await sessionTokenFor('cookie-starrer');
    const res = await starPost(
      ctx(
        'http://test/api/v1/packages/@cookie-star-owner/cookie-star-pkg/star',
        { owner: '@cookie-star-owner', pkg: 'cookie-star-pkg' },
        { method: 'POST', headers: { Cookie: `pepehub_session=${token}`, 'Sec-Fetch-Site': 'same-origin' } },
      ),
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.starred).toBe(true);
  });

  it('recusa favoritar via cookie sem Sec-Fetch-Site same-origin', async () => {
    await seedPackage({ ownerHandle: 'cross-site-star-owner', pkgSlug: 'cross-site-star-pkg' });
    const token = await sessionTokenFor('cross-site-starrer');
    const res = await starPost(
      ctx(
        'http://test/api/v1/packages/@cross-site-star-owner/cross-site-star-pkg/star',
        { owner: '@cross-site-star-owner', pkg: 'cross-site-star-pkg' },
        { method: 'POST', headers: { Cookie: `pepehub_session=${token}` } },
      ),
    );
    expect(res.status).toBe(401);
  });
});

describe('hasStarred', () => {
  it('reflete se um owner específico já favoritou o pacote', async () => {
    const { packageId } = await seedPackage({ ownerHandle: 'has-starred-owner', pkgSlug: 'has-starred-pkg' });
    const token = await sessionTokenFor('has-starred-user');

    expect(await hasStarred(env.DB, packageId, -1)).toBe(false);

    await starPost(
      ctx(
        'http://test/api/v1/packages/@has-starred-owner/has-starred-pkg/star',
        { owner: '@has-starred-owner', pkg: 'has-starred-pkg' },
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
      ),
    );

    const session = await verifySessionToken(token, env.SESSION_SECRET);
    expect(await hasStarred(env.DB, packageId, session!.ownerId)).toBe(true);
  });
});
