export async function star(db: D1Database, packageId: number, ownerId: number): Promise<void> {
  await db
    .prepare('INSERT OR IGNORE INTO package_stars (package_id, owner_id, created_at) VALUES (?, ?, ?)')
    .bind(packageId, ownerId, new Date().toISOString())
    .run();
}

export async function unstar(db: D1Database, packageId: number, ownerId: number): Promise<void> {
  await db.prepare('DELETE FROM package_stars WHERE package_id = ? AND owner_id = ?').bind(packageId, ownerId).run();
}

export async function getStarsCount(db: D1Database, packageId: number): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) as count FROM package_stars WHERE package_id = ?')
    .bind(packageId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

export async function hasStarred(db: D1Database, packageId: number, ownerId: number): Promise<boolean> {
  const row = await db
    .prepare('SELECT 1 FROM package_stars WHERE package_id = ? AND owner_id = ?')
    .bind(packageId, ownerId)
    .first();
  return row !== null;
}
