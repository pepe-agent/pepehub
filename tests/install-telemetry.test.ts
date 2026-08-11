import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { GET as downloadGet } from '../src/pages/api/v1/packages/[owner]/[pkg]/versions/[version]/download';
import { GET as packageGet } from '../src/pages/api/v1/packages/[owner]/[pkg]/index';
import { TELEMETRY_OPT_OUT_HEADER } from '../src/lib/telemetry';
import { seedPackage, seedVersion, sessionTokenFor } from './helpers';

function ctx(url: string, params: Record<string, string>, init?: RequestInit) {
  const cfContext = createExecutionContext();
  return { request: new Request(url, init), params, locals: { cfContext }, cfContext } as any;
}

describe('telemetria de instalação', () => {
  it('instalação autenticada registra um evento agregável, exposto só como total na metadata', async () => {
    const { packageId, name } = await seedPackage({ ownerHandle: 'telemetry-owner', pkgSlug: 'telemetry-pkg' });
    await seedVersion({ packageId, version: '1.0.0', r2Key: 'packages/telemetry-owner/telemetry-pkg/1.0.0.tgz' });
    const token = await sessionTokenFor('installer');

    const requestCtx = ctx(
      'http://test/api/v1/packages/@telemetry-owner/telemetry-pkg/versions/1.0.0/download',
      { owner: '@telemetry-owner', pkg: 'telemetry-pkg', version: '1.0.0' },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const res = await downloadGet(requestCtx);
    expect(res.status).toBe(200);
    await waitOnExecutionContext(requestCtx.cfContext);

    const metaRes = await packageGet(
      ctx('http://test/api/v1/packages/@telemetry-owner/telemetry-pkg', { owner: '@telemetry-owner', pkg: 'telemetry-pkg' }),
    );
    const metaBody: any = await metaRes.json();
    expect(metaBody.installsCount).toBe(1);
    expect(JSON.stringify(metaBody)).not.toContain('installer');
    void name;
  });

  it('instalação anônima não gera evento', async () => {
    const { packageId } = await seedPackage({ ownerHandle: 'anon-telemetry-owner', pkgSlug: 'anon-pkg' });
    await seedVersion({ packageId, version: '1.0.0', r2Key: 'packages/anon-telemetry-owner/anon-pkg/1.0.0.tgz' });

    const requestCtx = ctx('http://test/api/v1/packages/@anon-telemetry-owner/anon-pkg/versions/1.0.0/download', {
      owner: '@anon-telemetry-owner',
      pkg: 'anon-pkg',
      version: '1.0.0',
    });
    const res = await downloadGet(requestCtx);
    expect(res.status).toBe(200);
    await waitOnExecutionContext(requestCtx.cfContext);

    const metaRes = await packageGet(
      ctx('http://test/api/v1/packages/@anon-telemetry-owner/anon-pkg', { owner: '@anon-telemetry-owner', pkg: 'anon-pkg' }),
    );
    const metaBody: any = await metaRes.json();
    expect(metaBody.installsCount).toBe(0);
  });

  it('respeita o cabeçalho de opt-out mesmo autenticado', async () => {
    const { packageId } = await seedPackage({ ownerHandle: 'optout-owner', pkgSlug: 'optout-pkg' });
    await seedVersion({ packageId, version: '1.0.0', r2Key: 'packages/optout-owner/optout-pkg/1.0.0.tgz' });
    const token = await sessionTokenFor('opted-out-installer');

    const requestCtx = ctx(
      'http://test/api/v1/packages/@optout-owner/optout-pkg/versions/1.0.0/download',
      { owner: '@optout-owner', pkg: 'optout-pkg', version: '1.0.0' },
      { headers: { Authorization: `Bearer ${token}`, [TELEMETRY_OPT_OUT_HEADER]: '1' } },
    );
    const res = await downloadGet(requestCtx);
    expect(res.status).toBe(200);
    await waitOnExecutionContext(requestCtx.cfContext);

    const metaRes = await packageGet(
      ctx('http://test/api/v1/packages/@optout-owner/optout-pkg', { owner: '@optout-owner', pkg: 'optout-pkg' }),
    );
    const metaBody: any = await metaRes.json();
    expect(metaBody.installsCount).toBe(0);
  });
});
