import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
  createPackage,
  findOwnerById,
  findPackageByName,
  findVersion,
  insertVersion,
  listVersions,
  setDistTag,
} from '../../../../../../lib/db';
import { sha256Hex } from '../../../../../../lib/hash';
import { errorResponse, json } from '../../../../../../lib/http';
import { isManifestError, parseManifest } from '../../../../../../lib/manifest';
import { enqueueScan } from '../../../../../../lib/scanning';
import { bearerToken, verifySessionToken } from '../../../../../../lib/session';
import { serializeVersion } from '../../../../../../lib/serialize';
import {
  claimsMatchTrustedPublisher,
  getTrustedPublisher,
  verifyGithubActionsToken,
} from '../../../../../../lib/trustedPublisher';

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

interface PublishIdentity {
  ownerId: number;
  handle: string;
}

// Duas formas de provar quem está publicando: uma sessão normal (opaque
// token, dois segmentos) ou um token OIDC do GitHub Actions (JWT, três
// segmentos) validado contra um publisher confiável já registrado pro
// pacote (trusted-publisher/spec.md) — por isso OIDC só funciona em cima de
// um pacote que já existe, nunca cria um novo.
async function resolvePublishIdentity(
  request: Request,
  db: D1Database,
  sessionSecret: string,
  ownerParam: string,
  existingPackage: Awaited<ReturnType<typeof findPackageByName>>,
): Promise<{ identity: PublishIdentity } | { error: Response }> {
  const token = bearerToken(request);
  if (!token) {
    return { error: errorResponse(401, 'unauthorized', 'Sessão ausente, inválida ou expirada.') };
  }

  if (token.split('.').length === 3) {
    if (!existingPackage) {
      return {
        error: errorResponse(
          403,
          'trusted_publisher_required',
          'Publicar via token OIDC exige um pacote já existente com publisher confiável configurado.',
        ),
      };
    }
    const claims = await verifyGithubActionsToken(token);
    if (!claims) {
      return { error: errorResponse(401, 'invalid_oidc_token', 'Token OIDC inválido ou expirado.') };
    }
    const trusted = await getTrustedPublisher(db, existingPackage.id);
    if (!trusted || !claimsMatchTrustedPublisher(claims, trusted)) {
      return {
        error: errorResponse(403, 'oidc_mismatch', 'Repositório/workflow não batem com o publisher confiável registrado.'),
      };
    }
    const owner = await findOwnerById(db, existingPackage.owner_id);
    return { identity: { ownerId: existingPackage.owner_id, handle: owner!.handle } };
  }

  const session = await verifySessionToken(token, sessionSecret);
  if (!session) {
    return { error: errorResponse(401, 'unauthorized', 'Sessão ausente, inválida ou expirada.') };
  }
  if (!existingPackage && ownerParam.toLowerCase() !== `@${session.handle.toLowerCase()}`) {
    return { error: errorResponse(403, 'namespace_mismatch', `Você não pode publicar em "${ownerParam}".`) };
  }
  return { identity: { ownerId: session.ownerId, handle: session.handle } };
}

export const POST: APIRoute = async ({ params, request, locals }) => {
  const { DB: db, ARTIFACTS: r2, SESSION_SECRET: sessionSecret } = env;

  const ownerParam = params.owner!;
  const pkgSlug = params.pkg!;
  // O handle é sempre gravado em minúsculo (ver upsertOwner); normaliza aqui
  // pra uma URL com case diferente ainda resolver o pacote certo.
  const lookupName = `${ownerParam.toLowerCase()}/${pkgSlug}`;
  const existingPackage = await findPackageByName(db, lookupName);

  const auth = await resolvePublishIdentity(request, db, sessionSecret, ownerParam, existingPackage);
  if ('error' in auth) {
    return auth.error;
  }
  const { identity } = auth;

  if (existingPackage && existingPackage.owner_id !== identity.ownerId) {
    // Nome resolvido via renamed_from (redirect de rename/transferência) pra
    // um pacote cujo dono real não é mais quem está chamando.
    return errorResponse(403, 'namespace_mismatch', `Você não pode publicar em "${ownerParam}".`);
  }

  const name = existingPackage?.name ?? `@${identity.handle}/${pkgSlug}`;

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
  const r2Key = `packages/${identity.handle}/${pkgSlug}/${manifest.version}.${ext}`;

  await r2.put(r2Key, artifactBuffer, {
    httpMetadata: { contentType: artifact.type || 'application/octet-stream' },
  });

  const pkg =
    existingPackage ??
    (await createPackage(db, {
      kind: manifest.kind,
      name,
      ownerId: identity.ownerId,
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

  // Fora do caminho crítico (design.md "Varredura de segurança") — o publish
  // já respondeu antes da varredura terminar.
  locals.cfContext.waitUntil(enqueueScan(db, version.id, artifactBuffer, env.VIRUSTOTAL_API_KEY));

  return json(
    {
      name,
      kind: pkg.kind,
      version: serializeVersion(version),
    },
    { status: 201 },
  );
};
