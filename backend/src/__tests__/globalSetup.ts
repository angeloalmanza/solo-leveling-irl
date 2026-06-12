import { execSync } from 'child_process';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://soloirl:soloirl_dev@localhost:5432/solo_leveling_test';

/** Migra e fa il seed del database di test una sola volta prima della suite. */
export default function setup() {
  const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL };
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env });
  execSync('npx tsx prisma/seed.ts', { stdio: 'inherit', env });
}
