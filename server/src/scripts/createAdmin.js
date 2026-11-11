import bcrypt from 'bcryptjs';
import { parseArgs } from 'node:util';
import { pool } from '../config/db.js';

const { values } = parseArgs({
  options: {
    name: { type: 'string', default: 'Admin' },
    email: { type: 'string' },
    password: { type: 'string' },
  },
});

async function main() {
  const email = values.email?.trim().toLowerCase();

  if (!email) {
    console.error(
      'Usage: npm run create-admin -- --email admin@test.com --password Admin1234 --name "Site Admin"'
    );
    process.exitCode = 1;
    return;
  }

  const [rows] = await pool.query('SELECT id, role FROM users WHERE email = ?', [email]);

  if (rows.length > 0) {
    // User exists -> promote to admin
    await pool.query("UPDATE users SET role = 'admin' WHERE id = ?", [rows[0].id]);
    console.log(`✅ Existing user ${email} promoted to admin`);
    return;
  }

  // New user -> create as admin
  if (!values.password || values.password.length < 8) {
    console.error('❌ --password is required and must be at least 8 characters');
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(values.password, 12);
  await pool.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')",
    [values.name, email, passwordHash]
  );
  console.log(`✅ Admin user ${email} created`);
}

main()
  .catch((err) => {
    console.error('❌ Failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end()); // close DB connections so the script exits