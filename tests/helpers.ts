import { env } from 'cloudflare:workers';
import { createSessionToken } from '../src/lib/session';

// Module state is re-evaluated per test, but D1 storage persists across tests
// in the same file — a random id avoids UNIQUE collisions on owners.github_id
// that a simple incrementing counter would hit.
function randomGithubId(): number {
  return Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 2);
}

export async function sessionTokenFor(handle: string): Promise<string> {
  const githubId = randomGithubId();
  const owner = await env.DB.prepare(
    'INSERT INTO owners (github_id, handle, display_name, created_at) VALUES (?, ?, ?, ?) RETURNING id',
  )
    .bind(githubId, handle, null, new Date().toISOString())
    .first<{ id: number }>();
  return createSessionToken({ ownerId: owner!.id, githubId, handle }, env.SESSION_SECRET);
}

export function publishForm(manifest: Record<string, unknown>, artifact: { content: string; type?: string }) {
  const form = new FormData();
  form.set('manifest', JSON.stringify(manifest));
  form.set('artifact', new File([artifact.content], 'artifact', { type: artifact.type ?? 'application/gzip' }));
  return form;
}

export async function seedPackage(params: {
  ownerHandle: string;
  pkgSlug: string;
  kind?: 'plugin' | 'skill';
  category?: string;
  summary?: string;
  official?: boolean;
}) {
  const timestamp = new Date().toISOString();
  const owner = await env.DB.prepare(
    'INSERT INTO owners (github_id, handle, display_name, created_at) VALUES (?, ?, ?, ?) RETURNING id',
  )
    .bind(randomGithubId(), params.ownerHandle, null, timestamp)
    .first<{ id: number }>();

  const name = `@${params.ownerHandle}/${params.pkgSlug}`;
  const pkg = await env.DB.prepare(
    `INSERT INTO packages (kind, name, owner_id, summary, category, official, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
  )
    .bind(
      params.kind ?? 'plugin',
      name,
      owner!.id,
      params.summary ?? null,
      params.category ?? 'tool',
      params.official ? 1 : 0,
      timestamp,
      timestamp,
    )
    .first<{ id: number }>();

  return { packageId: pkg!.id, ownerId: owner!.id, name };
}

export async function seedVersion(params: {
  packageId: number;
  version: string;
  content?: string;
  r2Key: string;
  changelog?: string;
  tag?: string;
  requires?: Record<string, unknown>;
}) {
  const timestamp = new Date().toISOString();
  const content = params.content ?? 'fake-artifact-bytes';
  const bytes = new TextEncoder().encode(content);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const sha256 = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');

  await env.ARTIFACTS.put(params.r2Key, bytes);
  await env.DB.prepare(
    `INSERT INTO package_versions (package_id, version, sha256, size_bytes, r2_key, changelog, requires_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      params.packageId,
      params.version,
      sha256,
      bytes.byteLength,
      params.r2Key,
      params.changelog ?? null,
      params.requires ? JSON.stringify(params.requires) : null,
      timestamp,
    )
    .run();

  await env.DB.prepare(
    `INSERT INTO dist_tags (package_id, tag, version) VALUES (?, ?, ?)
     ON CONFLICT (package_id, tag) DO UPDATE SET version = excluded.version`,
  )
    .bind(params.packageId, params.tag ?? 'latest', params.version)
    .run();

  return { sha256, sizeBytes: bytes.byteLength };
}
