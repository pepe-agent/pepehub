export type ModerationState = 'visible' | 'held' | 'hidden' | 'blocked';
export type ReportStatus = 'open' | 'confirmed' | 'dismissed';

export interface ModerationStateRow {
  package_id: number;
  state: ModerationState;
  reason: string | null;
  changed_by_owner_id: number | null;
  changed_at: string;
}

export interface PackageReportRow {
  id: number;
  package_id: number;
  package_version_id: number | null;
  reporter_owner_id: number | null;
  reason: string;
  status: ReportStatus;
  triage_note: string | null;
  triaged_by_owner_id: number | null;
  triaged_at: string | null;
  created_at: string;
}

// Apelação reaproveita package_reports com esse prefixo (design.md
// "Moderação": "sem uma tabela de apelação separada, simplicidade
// deliberada pro v2").
export const APPEAL_REASON_PREFIX = 'appeal: ';

const now = () => new Date().toISOString();

export async function isOperator(db: D1Database, ownerId: number): Promise<boolean> {
  const row = await db.prepare('SELECT is_operator FROM owners WHERE id = ?').bind(ownerId).first<{
    is_operator: number;
  }>();
  return row?.is_operator === 1;
}

export async function getModerationState(db: D1Database, packageId: number): Promise<ModerationState> {
  const row = await db
    .prepare('SELECT state FROM package_moderation_state WHERE package_id = ?')
    .bind(packageId)
    .first<{ state: ModerationState }>();
  return row?.state ?? 'visible';
}

export async function setModerationState(
  db: D1Database,
  packageId: number,
  state: ModerationState,
  reason: string | null,
  changedByOwnerId: number,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO package_moderation_state (package_id, state, reason, changed_by_owner_id, changed_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (package_id) DO UPDATE SET
         state = excluded.state, reason = excluded.reason,
         changed_by_owner_id = excluded.changed_by_owner_id, changed_at = excluded.changed_at`,
    )
    .bind(packageId, state, reason, changedByOwnerId, now())
    .run();
}

export async function createReport(
  db: D1Database,
  params: { packageId: number; packageVersionId: number | null; reporterOwnerId: number; reason: string },
): Promise<PackageReportRow> {
  const result = await db
    .prepare(
      `INSERT INTO package_reports (package_id, package_version_id, reporter_owner_id, reason, status, created_at)
       VALUES (?, ?, ?, ?, 'open', ?) RETURNING *`,
    )
    .bind(params.packageId, params.packageVersionId, params.reporterOwnerId, params.reason, now())
    .first<PackageReportRow>();
  return result!;
}

export async function listReports(db: D1Database, status: ReportStatus | null): Promise<PackageReportRow[]> {
  const result = status
    ? await db
        .prepare('SELECT * FROM package_reports WHERE status = ? ORDER BY created_at DESC')
        .bind(status)
        .all<PackageReportRow>()
    : await db.prepare('SELECT * FROM package_reports ORDER BY created_at DESC').all<PackageReportRow>();
  return result.results ?? [];
}
