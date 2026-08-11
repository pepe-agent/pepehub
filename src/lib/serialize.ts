import type { PackageRow, PackageVersionRow, SearchResultItem } from './db';

export function serializeSearchItem(row: SearchResultItem) {
  return {
    name: row.name,
    kind: row.kind,
    category: row.category,
    summary: row.summary,
    official: Boolean(row.official),
    owner: row.owner_handle,
  };
}

export function serializePackage(
  row: PackageRow,
  ownerHandle: string,
  latestVersion: string | null,
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
  };
}
