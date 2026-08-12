import path from 'node:path';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      // wrangler.toml aponta `main` pro entry real (src/worker.ts), que
      // importa @astrojs/cloudflare/handler, só resolvível dentro do build
      // Vite do Astro. Sobrescrevendo aqui com um stub pros testes, que
      // chamam os handlers de rota direto e não passam pelo fetch real.
      main: './tests/worker-stub.ts',
      wrangler: { configPath: './wrangler.toml' },
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations(path.join(import.meta.dirname, 'migrations')),
          GITHUB_OAUTH_CLIENT_ID: 'test-client-id',
          GITHUB_OAUTH_CLIENT_SECRET: 'test-client-secret',
          SESSION_SECRET: 'test-session-secret-do-not-use-in-prod',
        },
      },
    })),
  ],
  test: {
    setupFiles: ['./tests/setup.ts'],
  },
});
