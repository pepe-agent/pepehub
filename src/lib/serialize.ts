import type { PackageRow, PackageVersionRow, SearchResultItem } from './db';
import type { ModerationState } from './moderation';

export function serializeSearchItem(row: SearchResultItem) {
  return {
    name: row.name,
    kind: row.kind,
    category: row.category,
    summary: row.summary,
    official: Boolean(row.official),
    owner: row.owner_handle,
    moderationState: row.moderation_state,
    starsCount: row.stars_count,
  };
}

export function serializePackage(
  row: PackageRow,
  ownerHandle: string,
  latestVersion: string | null,
  moderationState: ModerationState,
  starsCount: number,
) {
  return {
    name: row.name,
    kind: row.kind,
    category: row.category,
    owner: ownerHandle,
    summary: row.summary,
    official: Boolean(row.official),
    latestVersion,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    moderationState,
    starsCount,
  };
}

export function serializeVersion(row: PackageVersionRow) {
  return {
    version: row.version,
    sha256: row.sha256,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    changelog: row.changelog,
    requires: row.requires_json ? JSON.parse(row.requires_json) : null,
    scan: row.scan_status ? { status: row.scan_status, riskLevel: row.scan_risk_level } : null,
  };
}
