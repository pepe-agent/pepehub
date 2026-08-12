import type { PackageRow, PackageVersionRow } from './db';
import { findPackageByName, findVersion } from './db';
import { errorResponse } from './http';
import { getModerationState } from './moderation';

// Mesma checagem (pacote existe, não bloqueado, versão existe, não
// maliciosa) que download.ts já faz antes de servir o artefato. Extraída
// aqui porque readme/files/diff precisam do mesmo carregamento, sem
// duplicar a lógica de moderação/varredura em cada rota.
export async function loadVersionArtifact(
  db: D1Database,
  r2: R2Bucket,
  name: string,
  versionStr: string,
): Promise<{ pkg: PackageRow; version: PackageVersionRow; buffer: ArrayBuffer } | { error: Response }> {
  const pkg = await findPackageByName(db, name);
  if (!pkg) {
    return { error: errorResponse(404, 'not_found', `Pacote "${name}" não encontrado.`) };
  }

  const moderationState = await getModerationState(db, pkg.id);
  if (moderationState === 'blocked') {
    return { error: errorResponse(403, 'blocked', 'Esse pacote está bloqueado por moderação.') };
  }

  const version = await findVersion(db, pkg.id, versionStr);
  if (!version) {
    return { error: errorResponse(404, 'not_found', `Versão "${versionStr}" não encontrada para "${name}".`) };
  }

  if (version.scan_status === 'malicious') {
    return {
      error: errorResponse(403, 'malicious', 'Essa versão foi sinalizada como maliciosa pela varredura de segurança.'),
    };
  }

  const object = await r2.get(version.r2_key);
  if (!object) {
    return { error: errorResponse(404, 'not_found', 'Artefato não encontrado no armazenamento.') };
  }

  const buffer = await object.arrayBuffer();
  return { pkg, version, buffer };
}
