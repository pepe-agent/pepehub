import type { ScanRiskLevel, ScanStatus } from './scanning';

export interface OwnerRow {
  id: number;
  github_id: number;
  handle: string;
  display_name: string | null;
  created_at: string;
}

export interface PackageRow {
  id: number;
  kind: 'plugin' | 'skill';
  name: string;
  owner_id: number;
  summary: string | null;
  category: string;
  official: number;
  downloads_count: number;
  featured: number;
  created_at: string;
  updated_at: string;
}

export interface PackageVersionRow {
  id: number;
  package_id: number;
  version: string;
  sha256: string;
  size_bytes: number;
  r2_key: string;
  changelog: string | null;
  requires_json: string | null;
  created_at: string;
  // Varredura mais recente dessa versão (LEFT JOIN correlacionado em
  // findVersion/listVersions) — null quando ainda não foi enfileirada.
  scan_status: ScanStatus | null;
  scan_risk_level: ScanRiskLevel | null;
}

export interface ArtifactScanRow {
  id: number;
  package_version_id: number;
  status: ScanStatus;
  risk_level: ScanRiskLevel | null;
  findings_json: string | null;
  provider: string | null;
  provider_ref: string | null;
  scanned_at: string | null;
  created_at: string;
}

const now = () => new Date().toISOString();

export async function upsertOwner(
  db: D1Database,
  githubId: number,
  handle: string,
  displayName: string | null,
): Promise<OwnerRow> {
  const existing = await db
    .prepare('SELECT * FROM owners WHERE github_id = ?')
    .bind(githubId)
    .first<OwnerRow>();
  if (existing) return existing;

  const result = await db
    .prepare(
      'INSERT INTO owners (github_id, handle, display_name, created_at) VALUES (?, ?, ?, ?) RETURNING *',
    )
    .bind(githubId, handle, displayName, now())
    .first<OwnerRow>();
  return result!;
}

export async function findOwnerByHandle(db: D1Database, handle: string): Promise<OwnerRow | null> {
  return db.prepare('SELECT * FROM owners WHERE handle = ?').bind(handle).first<OwnerRow>();
}

export async function findPackageByName(db: D1Database, name: string): Promise<PackageRow | null> {
  return db.prepare('SELECT * FROM packages WHERE name = ?').bind(name).first<PackageRow>();
}

export async function createPackage(
  db: D1Database,
  params: { kind: 'plugin' | 'skill'; name: string; ownerId: number; summary: string | null; category: string },
): Promise<PackageRow> {
  const timestamp = now();
  const result = await db
    .prepare(
      `INSERT INTO packages (kind, name, owner_id, summary, category, official, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?) RETURNING *`,
    )
    .bind(params.kind, params.name, params.ownerId, params.summary, params.category, timestamp, timestamp)
    .first<PackageRow>();
  return result!;
}

export async function incrementDownloadCount(db: D1Database, packageId: number): Promise<void> {
  await db.prepare('UPDATE packages SET downloads_count = downloads_count + 1 WHERE id = ?').bind(packageId).run();
}

// Subquery correlacionada pra varredura mais recente de cada versão, em vez
// de N+1: uma versão pode ter mais de uma linha em artifact_scans (rescan),
// só a mais nova importa pra exibição/bloqueio de download.
const LATEST_SCAN_COLUMNS = `
  (SELECT status FROM artifact_scans WHERE package_version_id = pv.id ORDER BY created_at DESC LIMIT 1) AS scan_status,
  (SELECT risk_level FROM artifact_scans WHERE package_version_id = pv.id ORDER BY created_at DESC LIMIT 1) AS scan_risk_level
`;

export async function findVersion(
  db: D1Database,
  packageId: number,
  version: string,
): Promise<PackageVersionRow | null> {
  return db
    .prepare(
      `SELECT pv.*, ${LATEST_SCAN_COLUMNS} FROM package_versions pv WHERE pv.package_id = ? AND pv.version = ?`,
    )
    .bind(packageId, version)
    .first<PackageVersionRow>();
}

export async function listVersions(db: D1Database, packageId: number): Promise<PackageVersionRow[]> {
  const result = await db
    .prepare(
      `SELECT pv.*, ${LATEST_SCAN_COLUMNS} FROM package_versions pv WHERE pv.package_id = ? ORDER BY pv.created_at DESC`,
    )
    .bind(packageId)
    .all<PackageVersionRow>();
  return result.results ?? [];
}

export async function insertVersion(
  db: D1Database,
  params: {
    packageId: number;
    version: string;
    sha256: string;
    sizeBytes: number;
    r2Key: string;
    changelog: string | null;
    requiresJson: string | null;
  },
): Promise<PackageVersionRow> {
  const result = await db
    .prepare(
      `INSERT INTO package_versions (package_id, version, sha256, size_bytes, r2_key, changelog, requires_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
    )
    .bind(
      params.packageId,
      params.version,
      params.sha256,
      params.sizeBytes,
      params.r2Key,
      params.changelog,
      params.requiresJson,
      now(),
    )
    .first<PackageVersionRow>();
  return { ...result!, scan_status: null, scan_risk_level: null };
}

export async function setDistTag(
  db: D1Database,
  packageId: number,
  tag: string,
  version: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO dist_tags (package_id, tag, version) VALUES (?, ?, ?)
       ON CONFLICT (package_id, tag) DO UPDATE SET version = excluded.version`,
    )
    .bind(packageId, tag, version)
    .run();
}

export async function getDistTag(db: D1Database, packageId: number, tag: string): Promise<string | null> {
  const row = await db
    .prepare('SELECT version FROM dist_tags WHERE package_id = ? AND tag = ?')
    .bind(packageId, tag)
    .first<{ version: string }>();
  return row?.version ?? null;
}

export interface SearchParams {
  q: string | null;
  category: string | null;
  kind: 'plugin' | 'skill' | null;
  cursor: number | null;
  limit: number;
}

export interface SearchResultItem extends PackageRow {
  owner_handle: string;
}

export async function searchPackages(
  db: D1Database,
  params: SearchParams,
): Promise<{ items: SearchResultItem[]; nextCursor: number | null }> {
  const conditions: string[] = [];
  const bindings: unknown[] = [];

  if (params.q) {
    conditions.push('(p.name LIKE ? OR p.summary LIKE ? OR o.handle LIKE ?)');
    const like = `%${params.q}%`;
    bindings.push(like, like, like);
  }
  if (params.category) {
    conditions.push('p.category = ?');
    bindings.push(params.category);
  }
  if (params.kind) {
    conditions.push('p.kind = ?');
    bindings.push(params.kind);
  }
  if (params.cursor !== null) {
    conditions.push('p.id < ?');
    bindings.push(params.cursor);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = params.limit;
  bindings.push(limit + 1);

  const result = await db
    .prepare(
      `SELECT p.*, o.handle AS owner_handle
       FROM packages p
       JOIN owners o ON o.id = p.owner_id
       ${where}
       ORDER BY p.id DESC
       LIMIT ?`,
    )
    .bind(...bindings)
    .all<SearchResultItem>();

  const rows = result.results ?? [];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1].id : null;
  return { items, nextCursor };
}

export type HomeSort = 'new' | 'trending' | 'featured' | 'official';

const HOME_SORT_ORDER_BY: Record<HomeSort, string> = {
  new: 'p.created_at DESC, p.id DESC',
  trending: 'p.downloads_count DESC, p.created_at DESC',
  featured: 'p.featured DESC, p.created_at DESC',
  official: 'p.official DESC, p.created_at DESC',
};

export interface HomeListParams {
  kind: 'plugin' | 'skill' | null;
  category: string | null;
  sort: HomeSort;
  limit: number;
}

// Listagem simples (sem cursor) pra home do site, separada de searchPackages
// porque essa não é a API pública documentada em registry-read-api/spec.md, só
// consumida pelas próprias páginas Astro renderizadas no servidor.
export async function listPackagesForHome(db: D1Database, params: HomeListParams): Promise<SearchResultItem[]> {
  const conditions: string[] = [];
  const bindings: unknown[] = [];

  if (params.kind) {
    conditions.push('p.kind = ?');
    bindings.push(params.kind);
  }
  if (params.category) {
    conditions.push('p.category = ?');
    bindings.push(params.category);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  bindings.push(params.limit);

  const result = await db
    .prepare(
      `SELECT p.*, o.handle AS owner_handle
       FROM packages p
       JOIN owners o ON o.id = p.owner_id
       ${where}
       ORDER BY ${HOME_SORT_ORDER_BY[params.sort]}
       LIMIT ?`,
    )
    .bind(...bindings)
    .all<SearchResultItem>();

  return result.results ?? [];
}

export async function insertPendingScan(db: D1Database, packageVersionId: number): Promise<ArtifactScanRow> {
  const result = await db
    .prepare(
      `INSERT INTO artifact_scans (package_version_id, status, created_at)
       VALUES (?, 'pending', ?) RETURNING *`,
    )
    .bind(packageVersionId, now())
    .first<ArtifactScanRow>();
  return result!;
}

export async function updateScanResult(
  db: D1Database,
  scanId: number,
  params: { status: ScanStatus; riskLevel: ScanRiskLevel | null; findings: unknown; provider: string },
): Promise<void> {
  await db
    .prepare(
      `UPDATE artifact_scans SET status = ?, risk_level = ?, findings_json = ?, provider = ?, scanned_at = ?
       WHERE id = ?`,
    )
    .bind(
      params.status,
      params.riskLevel,
      params.findings ? JSON.stringify(params.findings) : null,
      params.provider,
      now(),
      scanId,
    )
    .run();
}

export async function getLatestScanStatus(db: D1Database, packageVersionId: number): Promise<ScanStatus | null> {
  const row = await db
    .prepare('SELECT status FROM artifact_scans WHERE package_version_id = ? ORDER BY created_at DESC LIMIT 1')
    .bind(packageVersionId)
    .first<{ status: ScanStatus }>();
  return row?.status ?? null;
}
