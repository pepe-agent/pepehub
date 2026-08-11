// Marca reservada nas linhas de package_moderation_state criadas por um
// banimento, pra desbanir só reverter o que foi ocultado por causa dele,
// nunca uma ocultação separada que já existia por outro motivo.
export const PLATFORM_BAN_REASON = 'banned-publisher';

const now = () => new Date().toISOString();

export async function banPublisher(db: D1Database, ownerId: number, operatorOwnerId: number): Promise<void> {
  await db.prepare('UPDATE owners SET banned_at = ? WHERE id = ?').bind(now(), ownerId).run();

  // Só toca pacote que estava (explícita ou implicitamente) visible. Um
  // pacote já held/hidden/blocked por outro motivo (moderation/spec.md)
  // fica exatamente como estava, senão desbanir depois reverteria uma
  // ocultação que não tinha nada a ver com o banimento.
  const timestamp = now();

  await db
    .prepare(
      `INSERT INTO package_moderation_state (package_id, state, reason, changed_by_owner_id, changed_at)
       SELECT id, 'hidden', ?, ?, ?
       FROM packages
       WHERE owner_id = ? AND deleted_at IS NULL
         AND id NOT IN (SELECT package_id FROM package_moderation_state)`,
    )
    .bind(PLATFORM_BAN_REASON, operatorOwnerId, timestamp, ownerId)
    .run();

  await db
    .prepare(
      `UPDATE package_moderation_state
       SET state = 'hidden', reason = ?, changed_by_owner_id = ?, changed_at = ?
       WHERE state = 'visible'
         AND package_id IN (SELECT id FROM packages WHERE owner_id = ? AND deleted_at IS NULL)`,
    )
    .bind(PLATFORM_BAN_REASON, operatorOwnerId, timestamp, ownerId)
    .run();
}

export async function unbanPublisher(db: D1Database, ownerId: number): Promise<void> {
  await db.prepare('UPDATE owners SET banned_at = NULL WHERE id = ?').bind(ownerId).run();

  // Só reverte pacotes ocultados pelo próprio banimento. Um pacote que já
  // estava hidden/blocked por outro motivo (moderation/spec.md) continua
  // como estava.
  await db
    .prepare(
      `UPDATE package_moderation_state
       SET state = 'visible', reason = NULL, changed_at = ?
       WHERE reason = ?
         AND package_id IN (SELECT id FROM packages WHERE owner_id = ?)`,
    )
    .bind(now(), PLATFORM_BAN_REASON, ownerId)
    .run();
}

export interface ReservedNameRow {
  name: string;
  reserved_by_owner_id: number;
  reserved_for_owner_id: number | null;
  reason: string | null;
  created_at: string;
}

export async function reserveName(
  db: D1Database,
  params: { name: string; reservedByOwnerId: number; reservedForOwnerId: number | null; reason: string | null },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO reserved_names (name, reserved_by_owner_id, reserved_for_owner_id, reason, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (name) DO UPDATE SET
         reserved_by_owner_id = excluded.reserved_by_owner_id,
         reserved_for_owner_id = excluded.reserved_for_owner_id,
         reason = excluded.reason, created_at = excluded.created_at`,
    )
    .bind(params.name, params.reservedByOwnerId, params.reservedForOwnerId, params.reason, now())
    .run();
}

export async function getReservedName(db: D1Database, name: string): Promise<ReservedNameRow | null> {
  return db.prepare('SELECT * FROM reserved_names WHERE name = ?').bind(name).first<ReservedNameRow>();
}
