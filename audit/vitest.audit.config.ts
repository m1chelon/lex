import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', include: ['audit/**/*.audit.ts'], testTimeout: 3_600_000, hookTimeout: 120_000 },
});
