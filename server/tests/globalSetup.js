import fs from 'node:fs';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

// Runs ONCE before all tests: rebuild the test database from schema + seed
export default async function setup() {
  const env = dotenv.parse(fs.readFileSync('.env.test'));

  // Safety guard: never wipe a real database by accident
  if (!env.DB_NAME.endsWith('_test')) {
    throw new Error(`Refusing to reset "${env.DB_NAME}": test DB name must end with _test`);
  }

  const conn = await mysql.createConnection({
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    multipleStatements: true,
  });

  for (const file of ['database/schema.sql', 'database/seed.sql']) {
    await conn.query(fs.readFileSync(file, 'utf8'));
  }

  // Keep departures in the future no matter when the tests run
  await conn.query('UPDATE package_departures SET departure_date = DATE_ADD(CURDATE(), INTERVAL 30 + id DAY)');
  await conn.end();
}
