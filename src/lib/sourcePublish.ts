export type SourceRejectionReason = 'private' | 'fork' | 'archived' | 'not_found';

export interface SourceCheckResult {
  ok: boolean;
  reason: SourceRejectionReason | null;
}

function githubHeaders(apiToken: string | undefined): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'pepehub',
  };
  if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
  return headers;
}

// Repositório privado, fork ou arquivado é recusado (source-publish/spec.md)
// — proveniência de um fork ou repo privado exigiria acesso que o backend
// não deveria ter por padrão (ver design.md).
export async function checkRepoEligible(repo: string, apiToken: string | undefined): Promise<SourceCheckResult> {
  const res = await fetch(`https://api.github.com/repos/${repo}`, { headers: githubHeaders(apiToken) });
  if (res.status === 404) {
    return { ok: false, reason: 'not_found' };
  }
  if (!res.ok) {
    throw new Error(`GitHub /repos respondeu ${res.status}`);
  }
  const data = (await res.json()) as { private: boolean; fork: boolean; archived: boolean };
  if (data.private) return { ok: false, reason: 'private' };
  if (data.fork) return { ok: false, reason: 'fork' };
  if (data.archived) return { ok: false, reason: 'archived' };
  return { ok: true, reason: null };
}

// "Clone raso" = baixar o tree do ref pedido via tarball/zipball da API do
// GitHub, sem histórico — não precisa (e não teria como, no runtime de
// Workers) rodar o binário git de verdade.
export async function fetchArtifactFromRepo(
  repo: string,
  ref: string,
  kind: 'plugin' | 'skill',
  apiToken: string | undefined,
): Promise<ArrayBuffer> {
  const archiveType = kind === 'plugin' ? 'tarball' : 'zipball';
  const res = await fetch(`https://api.github.com/repos/${repo}/${archiveType}/${ref}`, {
    headers: githubHeaders(apiToken),
  });
  if (!res.ok) {
    throw new Error(`GitHub ${archiveType} respondeu ${res.status}`);
  }
  return res.arrayBuffer();
}
