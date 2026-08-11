/// <reference path="../worker-configuration.d.ts" />
/// <reference types="astro/client" />

// Secrets/vars não declarados no wrangler.toml (setados via .dev.vars local e
// `wrangler secret put` em produção). `wrangler types` só gera bindings de
// wrangler.toml, então essas três entradas são adicionadas manualmente.
// Bindings/env são lidos via `import { env } from 'cloudflare:workers'` (tipado
// como `Cloudflare.Env`), não via `Astro.locals.runtime.env` (removido pelo
// adapter).
declare namespace Cloudflare {
  interface Env {
    GITHUB_OAUTH_CLIENT_ID: string;
    GITHUB_OAUTH_CLIENT_SECRET: string;
    SESSION_SECRET: string;
    // Opcional: sem ela, toda varredura termina em `error` (ver
    // src/lib/scanning.ts) em vez de bloquear o resto do registro.
    VIRUSTOTAL_API_KEY?: string;
    // Opcional: eleva o rate limit da API do GitHub usado por source-publish
    // (60/h sem token, 5000/h com um PAT). Ver src/lib/sourcePublish.ts.
    GITHUB_API_TOKEN?: string;
  }
}

declare namespace App {
  interface Locals {
    // Sessão do navegador via cookie, resolvida em src/middleware.ts. Só pra
    // exibir estado de login nas páginas; endpoints /api/v1/* continuam
    // exigindo Bearer token, nunca cookie.
    session: import('./lib/session').SessionPayload | null;
  }
}
