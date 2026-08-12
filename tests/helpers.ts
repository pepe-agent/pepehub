import { env } from 'cloudflare:workers';
import { createSessionToken } from '../src/lib/session';

// Module state is re-evaluated per test, but D1 storage persists across tests
// in the same file. A random id avoids UNIQUE collisions on owners.github_id
// that a simple incrementing counter would hit.
function randomGithubId(): number {
  return Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 2);
}

export async function sessionTokenFor(handle: string, opts: { isOperator?: boolean } = {}): Promise<string> {
  const githubId = randomGithubId();
  const owner = await env.DB.prepare(
    'INSERT INTO owners (github_id, handle, display_name, is_operator, created_at) VALUES (?, ?, ?, ?, ?) RETURNING id',
  )
    .bind(githubId, handle, null, opts.isOperator ? 1 : 0, new Date().toISOString())
    .first<{ id: number }>();
  return createSessionToken({ ownerId: owner!.id, githubId, handle }, env.SESSION_SECRET);
}

const ZIP_MAGIC = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
const GZIP_MAGIC = new Uint8Array([0x1f, 0x8b, 0x08, 0x00]);

export function publishForm(manifest: Record<string, unknown>, artifact: { content: string; type?: string }) {
  const form = new FormData();
  form.set('manifest', JSON.stringify(manifest));
  // Prefixa com a assinatura de bytes certa (matchesArchiveFormat em
  // versions.ts recusa artefato cujos bytes não batem com o kind
  // declarado). O resto do conteúdo é irrelevante pros testes de publish,
  // que não fazem parsing de arquivo de verdade.
  const magic = manifest.kind === 'plugin' ? GZIP_MAGIC : ZIP_MAGIC;
  const contentBytes = new TextEncoder().encode(artifact.content);
  const bytes = new Uint8Array(magic.length + contentBytes.length);
  bytes.set(magic, 0);
  bytes.set(contentBytes, magic.length);
  form.set('artifact', new File([bytes], 'artifact', { type: artifact.type ?? 'application/gzip' }));
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
  content?: string | Uint8Array;
  r2Key: string;
  changelog?: string;
  tag?: string;
  requires?: Record<string, unknown>;
}) {
  const timestamp = new Date().toISOString();
  const content = params.content ?? 'fake-artifact-bytes';
  const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
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
