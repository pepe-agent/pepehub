/// <reference path="../worker-configuration.d.ts" />
/// <reference types="astro/client" />

// Secrets/vars não declarados no wrangler.toml (setados via .dev.vars local e
// `wrangler secret put` em produção) — `wrangler types` só gera bindings de
// wrangler.toml, então essas três entradas são adicionadas manualmente.
// Bindings/env são lidos via `import { env } from 'cloudflare:workers'` (tipado
// como `Cloudflare.Env`), não via `Astro.locals.runtime.env` (removido pelo
// adapter).
declare namespace Cloudflare {
  interface Env {
    GITHUB_OAUTH_CLIENT_ID: string;
    GITHUB_OAUTH_CLIENT_SECRET: string;
    SESSION_SECRET: string;
  }
}
