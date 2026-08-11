import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
  createPackage,
  findPackageByName,
  findVersion,
  insertVersion,
  listVersions,
  setDistTag,
} from '../../../../../../lib/db';
import { sha256Hex } from '../../../../../../lib/hash';
import { errorResponse, json } from '../../../../../../lib/http';
import { isManifestError, parseManifest } from '../../../../../../lib/manifest';
import { requireSession } from '../../../../../../lib/session';
import { serializeVersion } from '../../../../../../lib/serialize';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const name = `${params.owner}/${params.pkg}`;
  const db = env.DB;

  const pkg = await findPackageByName(db, name);
  if (!pkg) {
    return errorResponse(404, 'not_found', `Pacote "${name}" não encontrado.`);
  }

  const versions = await listVersions(db, pkg.id);
  return json({ items: versions.map(serializeVersion) });
};

export const POST: APIRoute = async ({ params, request }) => {
  const { DB: db, ARTIFACTS: r2, SESSION_SECRET: sessionSecret } = env;

  const session = await requireSession(request, sessionSecret);
  if (!session) {
    return errorResponse(401, 'unauthorized', 'Sessão ausente, inválida ou expirada.');
  }

  const ownerParam = params.owner!;
  if (ownerParam.toLowerCase() !== `@${session.handle.toLowerCase()}`) {
    return errorResponse(403, 'namespace_mismatch', `Você não pode publicar em "${ownerParam}".`);
  }

  const pkgSlug = params.pkg!;
  const name = `@${session.handle}/${pkgSlug}`;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse(400, 'invalid_body', 'Corpo precisa ser multipart/form-data.');
  }

  const manifestField = form.get('manifest');
  const manifestRaw = manifestField instanceof Blob ? await manifestField.text() : manifestField;
  let manifestJson: unknown;
  try {
    manifestJson = JSON.parse(String(manifestRaw ?? 'null'));
  } catch {
    return errorResponse(400, 'invalid_manifest', 'manifest precisa ser um JSON válido.');
  }

  const manifest = parseManifest(manifestJson);
  if (isManifestError(manifest)) {
    return errorResponse(400, 'invalid_manifest', `${manifest.field}: ${manifest.message}`);
  }

  const artifact = form.get('artifact');
  if (!(artifact instanceof Blob) || artifact.size === 0) {
    return errorResponse(400, 'invalid_artifact', 'artifact precisa ser um arquivo (tarball ou zip).');
  }

  const existingPackage = await findPackageByName(db, name);
  const kind = existingPackage?.kind ?? manifest.kind;

  if (existingPackage) {
    const existingVersion = await findVersion(db, existingPackage.id, manifest.version);
    if (existingVersion) {
      return errorResponse(409, 'version_exists', `Versão ${manifest.version} já publicada.`);
    }
  }

  const artifactBuffer = await artifact.arrayBuffer();
  const sha256 = await sha256Hex(artifactBuffer);
  const ext = kind === 'plugin' ? 'tgz' : 'zip';
  const r2Key = `packages/${session.handle}/${pkgSlug}/${manifest.version}.${ext}`;

  await r2.put(r2Key, artifactBuffer, {
    httpMetadata: { contentType: artifact.type || 'application/octet-stream' },
  });

  const pkg =
    existingPackage ??
    (await createPackage(db, {
      kind: manifest.kind,
      name,
      ownerId: session.ownerId,
      summary: manifest.summary,
      category: manifest.category,
    }));

  let version;
  try {
    version = await insertVersion(db, {
      packageId: pkg.id,
      version: manifest.version,
      sha256,
      sizeBytes: artifact.size,
      r2Key,
      changelog: manifest.changelog,
      requiresJson: manifest.requiresJson,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('UNIQUE')) {
      return errorResponse(409, 'version_exists', `Versão ${manifest.version} já publicada.`);
    }
    throw err;
  }

  await setDistTag(db, pkg.id, manifest.tag, manifest.version);

  return json(
    {
      name,
      kind: pkg.kind,
      version: serializeVersion(version),
    },
    { status: 201 },
  );
};
