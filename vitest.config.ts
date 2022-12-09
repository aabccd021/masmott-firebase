import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: parseFloat(process.env['TIMEOUT_DELAY'] ?? '20000'),
  },
});
