import { createRemoteJWKSet, jwtVerify } from 'jose';

const OIDC_ISSUER = 'https://token.actions.githubusercontent.com';
const OIDC_JWKS_URL = `${OIDC_ISSUER}/.well-known/jwks`;

// Audiência que um workflow do GitHub Actions precisa pedir explicitamente
// (`core.getIDToken('pepehub')`) pro token servir pra publicar aqui,
// convenção própria do PepeHub, documentada pra quem configura o CI.
export const OIDC_AUDIENCE = 'pepehub';

export interface OidcClaims {
  repository: string;
  workflowFilename: string;
  environment: string | null;
}

// workflow_ref (ou job_workflow_ref) vem como
// "owner/repo/.github/workflows/publish.yml@refs/heads/main". Só o nome do
// arquivo importa pra comparar com o que foi registrado.
function extractWorkflowFilename(workflowRef: string): string | null {
  const match = workflowRef.match(/\.github\/workflows\/([^@]+)@/);
  return match?.[1] ?? null;
}

export async function verifyGithubActionsToken(token: string): Promise<OidcClaims | null> {
  try {
    // JWKS novo por chamada, de propósito: publish é raro (mesmo espírito de
    // design.md sobre não otimizar prematuramente o caminho de escrita), e
    // um cache com cooldown entre isolates traria a mesma classe de "chave
    // presa" que apareceu nos testes (ver tests/trusted-publisher.test.ts).
    const jwks = createRemoteJWKSet(new URL(OIDC_JWKS_URL));
    const { payload } = await jwtVerify(token, jwks, { issuer: OIDC_ISSUER, audience: OIDC_AUDIENCE });
    const repository = payload.repository as string | undefined;
    const workflowRef = (payload.job_workflow_ref ?? payload.workflow_ref) as string | undefined;
    if (!repository || !workflowRef) return null;
    const workflowFilename = extractWorkflowFilename(workflowRef);
    if (!workflowFilename) return null;
    return {
      repository,
      workflowFilename,
      environment: (payload.environment as string | undefined) ?? null,
    };
  } catch {
    return null;
  }
}

export interface TrustedPublisherRow {
  package_id: number;
  provider: string;
  repository: string;
  workflow_filename: string;
  environment: string | null;
  created_at: string;
}

export async function setTrustedPublisher(
  db: D1Database,
  packageId: number,
  params: { repository: string; workflowFilename: string; environment: string | null },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO trusted_publishers (package_id, provider, repository, workflow_filename, environment, created_at)
       VALUES (?, 'github-actions', ?, ?, ?, ?)
       ON CONFLICT (package_id) DO UPDATE SET
         repository = excluded.repository, workflow_filename = excluded.workflow_filename,
         environment = excluded.environment, created_at = excluded.created_at`,
    )
    .bind(packageId, params.repository, params.workflowFilename, params.environment, new Date().toISOString())
    .run();
}

export async function getTrustedPublisher(db: D1Database, packageId: number): Promise<TrustedPublisherRow | null> {
  return db.prepare('SELECT * FROM trusted_publishers WHERE package_id = ?').bind(packageId).first<TrustedPublisherRow>();
}

export function claimsMatchTrustedPublisher(claims: OidcClaims, trusted: TrustedPublisherRow): boolean {
  if (claims.repository.toLowerCase() !== trusted.repository.toLowerCase()) return false;
  if (claims.workflowFilename !== trusted.workflow_filename) return false;
  if (trusted.environment && claims.environment !== trusted.environment) return false;
  return true;
}
