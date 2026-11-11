import { afterAll } from 'vitest';
import { pool } from '../src/config/db.js';

// Each test file gets its own pool; close it so the worker can exit cleanly
afterAll(async () => {
  await pool.end();
});
