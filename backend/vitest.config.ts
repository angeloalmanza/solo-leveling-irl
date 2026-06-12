import { defineConfig } from 'vitest/config';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://soloirl:soloirl_dev@localhost:5432/solo_leveling_test';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_ACCESS_SECRET: 'test_access_secret_at_least_16_chars',
      JWT_REFRESH_SECRET: 'test_refresh_secret_at_least_16_chars',
      GROQ_API_KEY: 'test_groq_key',
    },
    include: ['src/**/*.test.ts'],
    globalSetup: ['src/__tests__/globalSetup.ts'],
    // I test che toccano il DB condividono lo stesso schema: niente parallelismo fra file
    fileParallelism: false,
    hookTimeout: 60000,
    testTimeout: 20000,
  },
});
