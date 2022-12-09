import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 20000 * parseFloat(process.env['TIMEOUT_DELAY'] ?? '1'),
  },
});
