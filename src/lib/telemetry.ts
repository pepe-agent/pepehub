// Convenção própria do PepeHub (install-telemetry/spec.md não fixa um nome
// de header). Qualquer valor presente desativa o registro do evento.
export const TELEMETRY_OPT_OUT_HEADER = 'X-PepeHub-No-Telemetry';

export async function recordInstall(db: D1Database, packageId: number, ownerId: number): Promise<void> {
  await db
    .prepare(
      'INSERT OR IGNORE INTO install_events (package_id, owner_id, first_install_at) VALUES (?, ?, ?)',
    )
    .bind(packageId, ownerId, new Date().toISOString())
    .run();
}

export async function getInstallsCount(db: D1Database, packageId: number): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) as count FROM install_events WHERE package_id = ?')
    .bind(packageId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}
