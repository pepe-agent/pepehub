import { isCategory, type Category } from './categories';

export interface PublishManifest {
  kind: 'plugin' | 'skill';
  version: string;
  category: Category;
  summary: string | null;
  changelog: string | null;
  tag: string;
  requiresJson: string | null;
}

export type ManifestValidationError = { field: string; message: string };

export function parseManifest(raw: unknown): PublishManifest | ManifestValidationError {
  if (typeof raw !== 'object' || raw === null) {
    return { field: 'manifest', message: 'manifesto ausente ou inválido' };
  }
  const data = raw as Record<string, unknown>;

  if (data.kind !== 'plugin' && data.kind !== 'skill') {
    return { field: 'kind', message: 'kind precisa ser "plugin" ou "skill"' };
  }
  if (typeof data.version !== 'string' || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(data.version)) {
    return { field: 'version', message: 'version precisa ser um semver válido' };
  }
  if (!isCategory(data.category)) {
    return { field: 'category', message: 'category ausente ou fora da lista fixa' };
  }

  let requiresJson: string | null = null;
  if (data.requires !== undefined) {
    if (typeof data.requires !== 'object' || data.requires === null || Array.isArray(data.requires)) {
      return { field: 'requires', message: 'requires precisa ser um objeto ({ env, bins })' };
    }
    // Guardado verbatim: o PepeHub não valida se os valores fazem sentido,
    // só quem instala confere presença (ver design.md "Requisitos declarados").
    requiresJson = JSON.stringify(data.requires);
  }

  return {
    kind: data.kind,
    version: data.version,
    category: data.category,
    summary: typeof data.summary === 'string' ? data.summary : null,
    changelog: typeof data.changelog === 'string' ? data.changelog : null,
    tag: typeof data.tag === 'string' && data.tag ? data.tag : 'latest',
    requiresJson,
  };
}

export function isManifestError(value: PublishManifest | ManifestValidationError): value is ManifestValidationError {
  return 'field' in value;
}
