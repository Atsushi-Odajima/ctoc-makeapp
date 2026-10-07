import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    projects: [
      {
        resolve: { alias: { "@": path.resolve(__dirname, "src") } },
        test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node" },
      },
      {
        resolve: { alias: { "@": path.resolve(__dirname, "src") } },
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          globalSetup: ["tests/helpers/global-setup.ts"],
          setupFiles: ["tests/helpers/setup-integration.ts"],
          pool: "forks",
          poolOptions: { forks: { singleFork: true } },
          testTimeout: 30_000,
          hookTimeout: 60_000,
          env: {
            MEDIA_PROVIDER: "local",
            MEDIA_URL_SECRET: "integration-test-media-secret-0123456789",
            CRON_SECRET: "integration-test-cron-secret",
            NODE_ENV: "test",
          },
        },
      },
    ],
  },
})
