import { defineConfig } from 'vitest/config';
import fs from 'node:fs';
import dotenv from 'dotenv';

export default defineConfig({
  test: {
    environment: 'node',
    env: dotenv.parse(fs.readFileSync('.env.test')), // tests use travel_test, never travel_db
    globalSetup: ['./tests/globalSetup.js'],          // reset the test DB once per run
    setupFiles: ['./tests/setup.js'],                 // close DB pool after each file
    fileParallelism: false,                           // files share one DB → run one at a time
    include: ['tests/**/*.test.js'],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/scripts/**', 'src/docs/**', 'src/server.js'],
    },
  },
});
