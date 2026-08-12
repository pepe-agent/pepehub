import { insertPendingScan, listPendingScansWithProviderRef, updateScanResult } from './db';

export type ScanStatus = 'pending' | 'clean' | 'review' | 'warning' | 'malicious' | 'error';
export type ScanRiskLevel = 'low' | 'medium' | 'high';

export interface ScanResult {
  status: ScanStatus;
  riskLevel: ScanRiskLevel | null;
  findings: unknown;
  analysisId: string | null;
}

interface VirusTotalStats {
  malicious: number;
  suspicious: number;
  undetected: number;
  harmless: number;
}

// Mapeamento de stats do VirusTotal pro nosso status/risk_level: decisão
// própria deste projeto (design.md não fixa thresholds, só o eixo de status
// vs. risco). >=2 engines maliciosos é o corte pra `malicious` (bloqueia
// download) pra reduzir falso positivo de engine isolada; abaixo disso vira
// sinal de "review"/"warning", nunca bloqueio.
export function mapVirusTotalStats(stats: VirusTotalStats): { status: ScanStatus; riskLevel: ScanRiskLevel } {
  if (stats.malicious >= 2) {
    return { status: 'malicious', riskLevel: 'high' };
  }
  if (stats.malicious === 1 || stats.suspicious >= 3) {
    return { status: 'warning', riskLevel: 'high' };
  }
  if (stats.suspicious >= 1) {
    return { status: 'review', riskLevel: 'medium' };
  }
  return { status: 'clean', riskLevel: 'low' };
}

const VT_BASE = 'https://www.virustotal.com/api/v3';
const POLL_ATTEMPTS = 5;
const POLL_DELAY_MS = 3000;

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function submitToVirusTotal(artifact: ArrayBuffer, apiKey: string): Promise<string | null> {
  const form = new FormData();
  form.set('file', new Blob([artifact]));

  const submitRes = await fetch(`${VT_BASE}/files`, {
    method: 'POST',
    headers: { 'x-apikey': apiKey },
    body: form,
  });
  if (!submitRes.ok) return null;
  const submitBody = (await submitRes.json()) as { data: { id: string } };
  return submitBody.data.id;
}

// Uma consulta só ao estado da análise; `stats` só vem preenchido quando
// completed. Reaproveitado tanto pelo poll curto do publish quanto pelo
// retry do cron (retryPendingScans).
async function fetchAnalysis(
  analysisId: string,
  apiKey: string,
): Promise<{ status: string; stats?: VirusTotalStats } | null> {
  const analysisRes = await fetch(`${VT_BASE}/analyses/${analysisId}`, {
    headers: { 'x-apikey': apiKey },
  });
  if (!analysisRes.ok) return null;
  const analysisBody = (await analysisRes.json()) as {
    data: { attributes: { status: string; stats?: VirusTotalStats } };
  };
  return analysisBody.data.attributes;
}

// Submete o artefato pro VirusTotal e faz um poll curto (o publish já
// respondeu antes disso rodar, ver design.md "fora do caminho crítico").
// Se não completar dentro da janela de poll, fica `pending` com o
// analysisId guardado (estado tolerado por design, nunca bloqueia
// instalação): retryPendingScans reconsulta esse mesmo id depois, sem
// re-enviar o arquivo.
export async function scanWithVirusTotal(artifact: ArrayBuffer, apiKey: string): Promise<ScanResult> {
  const analysisId = await submitToVirusTotal(artifact, apiKey);
  if (!analysisId) {
    return { status: 'error', riskLevel: null, findings: null, analysisId: null };
  }

  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
    await sleep(POLL_DELAY_MS);
    const analysis = await fetchAnalysis(analysisId, apiKey);
    if (analysis?.status === 'completed' && analysis.stats) {
      const { status, riskLevel } = mapVirusTotalStats(analysis.stats);
      return { status, riskLevel, findings: analysis.stats, analysisId };
    }
  }

  return { status: 'pending', riskLevel: null, findings: null, analysisId };
}

// Chamado via ctx.waitUntil depois do publish já ter respondido (ver
// design.md "fora do caminho crítico"). Cria a linha pending sempre; sem
// chave configurada, a varredura termina em `error` (nunca bloqueia
// instalação, o non-goal de v2 explicitamente aceita isso).
export async function enqueueScan(
  db: D1Database,
  packageVersionId: number,
  artifact: ArrayBuffer,
  apiKey: string | undefined,
): Promise<void> {
  const scan = await insertPendingScan(db, packageVersionId);
  if (!apiKey) {
    await updateScanResult(db, scan.id, {
      status: 'error',
      riskLevel: null,
      findings: null,
      provider: 'virustotal',
      providerRef: null,
    });
    return;
  }
  const result = await scanWithVirusTotal(artifact, apiKey);
  await updateScanResult(db, scan.id, {
    status: result.status,
    riskLevel: result.riskLevel,
    findings: result.findings,
    provider: 'virustotal',
    providerRef: result.analysisId,
  });
}

// Chamado pelo scheduled handler (src/worker.ts, cron trigger). Reconsulta
// cada varredura ainda pending que já tem um analysisId salvo, sem re-enviar
// o artefato pro VirusTotal; só grava no banco quando a análise realmente
// terminou, senão deixa pending pro próximo tick.
export async function retryPendingScans(
  db: D1Database,
  apiKey: string | undefined,
): Promise<{ checked: number; resolved: number }> {
  if (!apiKey) return { checked: 0, resolved: 0 };

  const pending = await listPendingScansWithProviderRef(db);
  let resolved = 0;
  for (const scan of pending) {
    const analysis = await fetchAnalysis(scan.provider_ref, apiKey);
    if (analysis?.status === 'completed' && analysis.stats) {
      const { status, riskLevel } = mapVirusTotalStats(analysis.stats);
      await updateScanResult(db, scan.id, {
        status,
        riskLevel,
        findings: analysis.stats,
        provider: 'virustotal',
        providerRef: scan.provider_ref,
      });
      resolved++;
    }
  }
  return { checked: pending.length, resolved };
}
