import { insertPendingScan, updateScanResult } from './db';

export type ScanStatus = 'pending' | 'clean' | 'review' | 'warning' | 'malicious' | 'error';
export type ScanRiskLevel = 'low' | 'medium' | 'high';

export interface ScanResult {
  status: ScanStatus;
  riskLevel: ScanRiskLevel | null;
  findings: unknown;
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

// Submete o artefato pro VirusTotal e faz um poll curto (o publish já
// respondeu antes disso rodar, ver design.md "fora do caminho crítico").
// Se não completar dentro da janela de poll, fica `pending` (estado tolerado
// por design, nunca bloqueia instalação). Não é um erro, só falta de tempo.
export async function scanWithVirusTotal(artifact: ArrayBuffer, apiKey: string): Promise<ScanResult> {
  const form = new FormData();
  form.set('file', new Blob([artifact]));

  const submitRes = await fetch(`${VT_BASE}/files`, {
    method: 'POST',
    headers: { 'x-apikey': apiKey },
    body: form,
  });
  if (!submitRes.ok) {
    return { status: 'error', riskLevel: null, findings: null };
  }
  const submitBody = (await submitRes.json()) as { data: { id: string } };
  const analysisId = submitBody.data.id;

  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
    await sleep(POLL_DELAY_MS);
    const analysisRes = await fetch(`${VT_BASE}/analyses/${analysisId}`, {
      headers: { 'x-apikey': apiKey },
    });
    if (!analysisRes.ok) continue;
    const analysisBody = (await analysisRes.json()) as {
      data: { attributes: { status: string; stats?: VirusTotalStats } };
    };
    if (analysisBody.data.attributes.status === 'completed' && analysisBody.data.attributes.stats) {
      const stats = analysisBody.data.attributes.stats;
      const { status, riskLevel } = mapVirusTotalStats(stats);
      return { status, riskLevel, findings: stats };
    }
  }

  return { status: 'pending', riskLevel: null, findings: null };
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
    await updateScanResult(db, scan.id, { status: 'error', riskLevel: null, findings: null, provider: 'virustotal' });
    return;
  }
  const result = await scanWithVirusTotal(artifact, apiKey);
  await updateScanResult(db, scan.id, {
    status: result.status,
    riskLevel: result.riskLevel,
    findings: result.findings,
    provider: 'virustotal',
  });
}
