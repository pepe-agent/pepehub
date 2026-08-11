import path from 'node:path';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
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
