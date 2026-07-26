import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(root, '.env') });

const rawUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
if (!rawUrl) {
  console.error('Missing DATABASE_URL in .env');
  process.exit(1);
}

// Encode password if it contains @ (common in local .env paste)
function normalizeConnectionString(url) {
  try {
    // eslint-disable-next-line no-new
    new URL(url);
    return url;
  } catch {
    const match = url.match(/^postgres(?:ql)?:\/\/([^:]+):(.+)@([^/]+)\/(.+)$/);
    if (!match) throw new Error('Invalid DATABASE_URL');
    const [, user, password, host, database] = match;
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}/${database}`;
  }
}

const migrationsDir = path.join(root, 'supabase', 'migrations');
const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const client = new pg.Client({
  connectionString: normalizeConnectionString(rawUrl),
  ssl: { rejectUnauthorized: false },
});

await client.connect();
for (const file of files) {
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  console.log('applying', file);
  await client.query(sql);
}
const tables = await client.query(
  `select tablename from pg_tables where schemaname = 'public' and tablename like 'abolivion%'`,
);
console.log('tables:', tables.rows.map((r) => r.tablename));
await client.end();
console.log('Migration applied successfully.');
