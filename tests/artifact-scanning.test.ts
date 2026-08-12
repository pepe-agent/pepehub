import { env } from 'cloudflare:workers';
import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET as downloadGet } from '../src/pages/api/v1/packages/[owner]/[pkg]/versions/[version]/download';
import { GET as versionsGet, POST as publishPost } from '../src/pages/api/v1/packages/[owner]/[pkg]/versions';
import { mapVirusTotalStats, retryPendingScans } from '../src/lib/scanning';
import { publishForm, seedPackage, seedVersion, sessionTokenFor } from './helpers';

function ctx(url: string, params: Record<string, string> = {}, init?: RequestInit) {
  const cfContext = createExecutionContext();
  return { request: new Request(url, init), params, locals: { cfContext }, cfContext } as any;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('mapVirusTotalStats', () => {
  it('marca malicious quando 2+ engines detectam', () => {
    expect(mapVirusTotalStats({ malicious: 2, suspicious: 0, undetected: 60, harmless: 10 })).toEqual({
      status: 'malicious',
      riskLevel: 'high',
    });
  });

  it('marca warning (não malicious) quando só 1 engine detecta', () => {
    const result = mapVirusTotalStats({ malicious: 1, suspicious: 0, undetected: 60, harmless: 10 });
    expect(result.status).not.toBe('malicious');
    expect(result.status).toBe('warning');
  });

  it('marca clean quando nada é detectado', () => {
    expect(mapVirusTotalStats({ malicious: 0, suspicious: 0, undetected: 60, harmless: 10 })).toEqual({
      status: 'clean',
      riskLevel: 'low',
    });
  });

  it('review e risco variam independentemente de malicious', () => {
    const result = mapVirusTotalStats({ malicious: 0, suspicious: 1, undetected: 60, harmless: 10 });
    expect(result.status).toBe('review');
    expect(result.status).not.toBe('malicious');
  });
});

describe('publish enfileira a varredura', () => {
  it('cria uma linha de varredura ao publicar, fora do caminho crítico', async () => {
    const token = await sessionTokenFor('scan-owner');
    const form = publishForm(
      { kind: 'plugin', version: '1.0.0', category: 'tool' },
      { content: 'conteudo-pra-varredura' },
    );
    const requestCtx = ctx('http://test/api/v1/packages/@scan-owner/scan-me/versions', {
      owner: '@scan-owner',
      pkg: 'scan-me',
    });
    const res = await publishPost({ ...requestCtx, request: new Request(requestCtx.request.url, { method: 'POST', body: form, headers: { Authorization: `Bearer ${token}` } }) });
    expect(res.status).toBe(201);

    // sem VIRUSTOTAL_API_KEY no ambiente de teste, a varredura enfileirada
    // termina em `error` assim que o waitUntil roda, nunca bloqueando o publish
    await waitOnExecutionContext(requestCtx.cfContext);
    const scan = await env.DB.prepare(
      `SELECT s.status FROM artifact_scans s
       JOIN package_versions pv ON pv.id = s.package_version_id
       JOIN packages p ON p.id = pv.package_id
       WHERE p.name = ?`,
    )
      .bind('@scan-owner/scan-me')
      .first<{ status: string }>();
    expect(scan?.status).toBe('error');
  });
});

describe('download respeita o veredito da varredura', () => {
  it('permite download com varredura pending', async () => {
    const { packageId } = await seedPackage({ ownerHandle: 'pending-owner', pkgSlug: 'pending-pkg' });
    await seedVersion({ packageId, version: '1.0.0', r2Key: 'packages/pending-owner/pending-pkg/1.0.0.tgz' });
    await env.DB.prepare(
      `INSERT INTO artifact_scans (package_version_id, status, created_at) VALUES (?, 'pending', datetime('now'))`,
    )
      .bind((await env.DB.prepare('SELECT id FROM package_versions WHERE package_id = ?').bind(packageId).first<{ id: number }>())!.id)
      .run();

    const res = await downloadGet(
      ctx('http://test/api/v1/packages/@pending-owner/pending-pkg/versions/1.0.0/download', {
        owner: '@pending-owner',
        pkg: 'pending-pkg',
        version: '1.0.0',
      }),
    );
    expect(res.status).toBe(200);
  });

  it('bloqueia download com veredito malicious (403), sem afetar outra versão do mesmo pacote', async () => {
    const { packageId } = await seedPackage({ ownerHandle: 'evil-owner', pkgSlug: 'evil-pkg' });
    await seedVersion({ packageId, version: '1.9.0', r2Key: 'packages/evil-owner/evil-pkg/1.9.0.tgz' });
    await seedVersion({ packageId, version: '2.0.0', r2Key: 'packages/evil-owner/evil-pkg/2.0.0.tgz' });

    const maliciousVersionId = (
      await env.DB.prepare('SELECT id FROM package_versions WHERE package_id = ? AND version = ?')
        .bind(packageId, '2.0.0')
        .first<{ id: number }>()
    )!.id;
    await env.DB.prepare(
      `INSERT INTO artifact_scans (package_version_id, status, risk_level, created_at) VALUES (?, 'malicious', 'high', datetime('now'))`,
    )
      .bind(maliciousVersionId)
      .run();

    const maliciousRes = await downloadGet(
      ctx('http://test/api/v1/packages/@evil-owner/evil-pkg/versions/2.0.0/download', {
        owner: '@evil-owner',
        pkg: 'evil-pkg',
        version: '2.0.0',
      }),
    );
    expect(maliciousRes.status).toBe(403);

    const cleanRes = await downloadGet(
      ctx('http://test/api/v1/packages/@evil-owner/evil-pkg/versions/1.9.0/download', {
        owner: '@evil-owner',
        pkg: 'evil-pkg',
        version: '1.9.0',
      }),
    );
    expect(cleanRes.status).toBe(200);
  });
});

describe('retryPendingScans reconsulta análises pendentes sem re-enviar o arquivo', () => {
  it('resolve uma varredura pending quando a análise já terminou no VirusTotal', async () => {
    const { packageId } = await seedPackage({ ownerHandle: 'retry-owner', pkgSlug: 'retry-pkg' });
    await seedVersion({ packageId, version: '1.0.0', r2Key: 'packages/retry-owner/retry-pkg/1.0.0.tgz' });
    const versionId = (
      await env.DB.prepare('SELECT id FROM package_versions WHERE package_id = ?').bind(packageId).first<{ id: number }>()
    )!.id;
    await env.DB.prepare(
      `INSERT INTO artifact_scans (package_version_id, status, provider, provider_ref, created_at)
       VALUES (?, 'pending', 'virustotal', 'analysis-123', datetime('now'))`,
    )
      .bind(versionId)
      .run();

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            data: { attributes: { status: 'completed', stats: { malicious: 0, suspicious: 0, undetected: 60, harmless: 10 } } },
          }),
          { status: 200 },
        ),
      ),
    );

    const result = await retryPendingScans(env.DB, 'fake-vt-key');
    expect(result).toEqual({ checked: 1, resolved: 1 });

    const scan = await env.DB.prepare('SELECT status, risk_level FROM artifact_scans WHERE package_version_id = ?')
      .bind(versionId)
      .first<{ status: string; risk_level: string }>();
    expect(scan).toEqual({ status: 'clean', risk_level: 'low' });
  });

  it('mantém pending quando a análise ainda não terminou', async () => {
    const { packageId } = await seedPackage({ ownerHandle: 'retry-wait-owner', pkgSlug: 'retry-wait-pkg' });
    await seedVersion({ packageId, version: '1.0.0', r2Key: 'packages/retry-wait-owner/retry-wait-pkg/1.0.0.tgz' });
    const versionId = (
      await env.DB.prepare('SELECT id FROM package_versions WHERE package_id = ?').bind(packageId).first<{ id: number }>()
    )!.id;
    await env.DB.prepare(
      `INSERT INTO artifact_scans (package_version_id, status, provider, provider_ref, created_at)
       VALUES (?, 'pending', 'virustotal', 'analysis-456', datetime('now'))`,
    )
      .bind(versionId)
      .run();

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ data: { attributes: { status: 'queued' } } }), { status: 200 })),
    );

    const result = await retryPendingScans(env.DB, 'fake-vt-key');
    expect(result).toEqual({ checked: 1, resolved: 0 });

    const scan = await env.DB.prepare('SELECT status FROM artifact_scans WHERE package_version_id = ?')
      .bind(versionId)
      .first<{ status: string }>();
    expect(scan?.status).toBe('pending');
  });

  it('não faz nada sem VIRUSTOTAL_API_KEY configurada', async () => {
    const result = await retryPendingScans(env.DB, undefined);
    expect(result).toEqual({ checked: 0, resolved: 0 });
  });
});

describe('metadata expõe status e riskLevel da varredura', () => {
  it('scan.status e scan.riskLevel variam independentemente (review + high, não malicious)', async () => {
    const { packageId } = await seedPackage({ ownerHandle: 'risky-owner', pkgSlug: 'risky-pkg' });
    await seedVersion({ packageId, version: '1.0.0', r2Key: 'packages/risky-owner/risky-pkg/1.0.0.tgz' });
    const versionId = (
      await env.DB.prepare('SELECT id FROM package_versions WHERE package_id = ?').bind(packageId).first<{ id: number }>()
    )!.id;
    await env.DB.prepare(
      `INSERT INTO artifact_scans (package_version_id, status, risk_level, created_at) VALUES (?, 'review', 'high', datetime('now'))`,
    )
      .bind(versionId)
      .run();

    const res = await versionsGet(
      ctx('http://test/api/v1/packages/@risky-owner/risky-pkg/versions', { owner: '@risky-owner', pkg: 'risky-pkg' }),
    );
    const body: any = await res.json();
    expect(body.items[0].scan).toEqual({ status: 'review', riskLevel: 'high' });
  });
});
