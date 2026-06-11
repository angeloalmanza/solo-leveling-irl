import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Valori di default per i test; un .env locale li sovrascrive via dotenv.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      JWT_ACCESS_SECRET: 'test_access_secret_at_least_16_chars',
      JWT_REFRESH_SECRET: 'test_refresh_secret_at_least_16_chars',
      GROQ_API_KEY: 'test_groq_key',
    },
    include: ['src/**/*.test.ts'],
  },
});
