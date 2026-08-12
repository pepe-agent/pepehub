import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { matchesArchiveFormat } from '../../../../../../lib/archive';
import {
  createPackage,
  findOwnerById,
  findPackageByName,
  findVersion,
  insertVersion,
  listVersions,
  setDistTag,
} from '../../../../../../lib/db';
import { sha1Hex, sha256Hex } from '../../../../../../lib/hash';
import { errorResponse, json } from '../../../../../../lib/http';
import { isManifestError, parseManifest } from '../../../../../../lib/manifest';
import { getReservedName } from '../../../../../../lib/platformAdmin';
import { enqueueScan } from '../../../../../../lib/scanning';
import { bearerToken, resolveMutationSession } from '../../../../../../lib/session';
import { serializeVersion } from '../../../../../../lib/serialize';
import { checkRepoEligible, fetchArtifactFromRepo } from '../../../../../../lib/sourcePublish';
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
// pacote (trusted-publisher/spec.md), por isso OIDC só funciona em cima de
// um pacote que já existe, nunca cria um novo.
async function resolvePublishIdentity(
  request: Request,
  db: D1Database,
  sessionSecret: string,
  ownerParam: string,
  existingPackage: Awaited<ReturnType<typeof findPackageByName>>,
): Promise<{ identity: PublishIdentity } | { error: Response }> {
  // OIDC (JWT, três segmentos) só chega via Bearer, nunca via cookie do
  // navegador; checa isso antes de tentar resolveMutationSession (que trata
  // Bearer opaco de dois segmentos ou o cookie do site como sessão normal).
  const token = bearerToken(request);
  if (token && token.split('.').length === 3) {
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

  const session = await resolveMutationSession(request, sessionSecret);
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

  if (!existingPackage) {
    // Nome reservado por um operador (platform-admin/spec.md) bloqueia
    // publish de qualquer um que não seja o destinatário da reserva.
    const reserved = await getReservedName(db, name);
    if (reserved && reserved.reserved_for_owner_id !== identity.ownerId) {
      return errorResponse(403, 'name_reserved', `"${name}" está reservado.`);
    }
  }

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

  const kind = existingPackage?.kind ?? manifest.kind;

  if (existingPackage) {
    const existingVersion = await findVersion(db, existingPackage.id, manifest.version);
    if (existingVersion) {
      return errorResponse(409, 'version_exists', `Versão ${manifest.version} já publicada.`);
    }
  }

  let artifactBuffer: ArrayBuffer;
  let contentType: string;

  if (manifest.source) {
    // source-publish/spec.md: repositório privado, fork ou arquivado nunca
    // chega a gravar nada (a checagem roda antes de qualquer escrita).
    const eligibility = await checkRepoEligible(manifest.source.repo, env.GITHUB_API_TOKEN);
    if (!eligibility.ok) {
      const reasonText: Record<string, string> = {
        private: 'é privado',
        fork: 'é um fork',
        archived: 'está arquivado',
        not_found: 'não foi encontrado',
      };
      return errorResponse(
        422,
        `source_${eligibility.reason}`,
        `Repositório "${manifest.source.repo}" ${reasonText[eligibility.reason!]}.`,
      );
    }
    artifactBuffer = await fetchArtifactFromRepo(manifest.source.repo, manifest.source.ref, kind, env.GITHUB_API_TOKEN);
    contentType = kind === 'plugin' ? 'application/gzip' : 'application/zip';
  } else {
    const artifact = form.get('artifact');
    if (!(artifact instanceof Blob) || artifact.size === 0) {
      return errorResponse(400, 'invalid_artifact', 'artifact precisa ser um arquivo (tarball ou zip).');
    }
    artifactBuffer = await artifact.arrayBuffer();
    contentType = artifact.type || 'application/octet-stream';

    if (!matchesArchiveFormat(artifactBuffer, kind)) {
      const expected = kind === 'plugin' ? 'tarball (.tgz)' : 'zip (.zip)';
      return errorResponse(400, 'invalid_artifact_format', `O arquivo enviado não parece ser um ${expected} válido.`);
    }
  }

  const sha256 = await sha256Hex(artifactBuffer);
  // sha1 só existe pro packument compatível com npm (npm-compatible-endpoint/
  // spec.md espera dist.shasum nesse formato legado). Nunca usado como
  // garantia de integridade de verdade no resto do PepeHub.
  const sha1 = kind === 'plugin' ? await sha1Hex(artifactBuffer) : null;
  const ext = kind === 'plugin' ? 'tgz' : 'zip';
  const r2Key = `packages/${identity.handle}/${pkgSlug}/${manifest.version}.${ext}`;

  await r2.put(r2Key, artifactBuffer, {
    httpMetadata: { contentType },
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
      sha1,
      sizeBytes: artifactBuffer.byteLength,
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

  // Fora do caminho crítico (design.md "Varredura de segurança"). O publish
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
