import { handle } from '@astrojs/cloudflare/handler';
import { retryPendingScans } from './lib/scanning';

// Entry custom (em vez do default gerado pelo adapter) só pra pendurar o
// scheduled handler do cron trigger (ver [triggers] no wrangler.toml) ao
// lado do fetch normal do Astro. `fetch` continua sendo exatamente o mesmo
// handler que o adapter geraria sozinho.
export default {
  fetch: handle,
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(retryPendingScans(env.DB, env.VIRUSTOTAL_API_KEY));
  },
} satisfies ExportedHandler<Cloudflare.Env>;
