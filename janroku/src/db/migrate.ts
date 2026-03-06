import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import path from 'path';

function getMigrateClient() {
  if (process.env.DATABASE_URL) {
    return createClient({
      url: process.env.DATABASE_URL,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });
  }

  const fs = require('fs');
  const DB_DIR = path.join(process.cwd(), 'data');
  const DB_PATH = path.join(DB_DIR, 'janroku.db');
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  return createClient({ url: `file:${DB_PATH}` });
}

const client = getMigrateClient();
const db = drizzle(client);

async function main() {
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: path.join(process.cwd(), 'src/db/migrations') });
  if (!process.env.DATABASE_URL) {
    await client.execute('PRAGMA journal_mode = WAL');
    await client.execute('PRAGMA foreign_keys = ON');
  }
  console.log('Migrations completed successfully.');
}

main().catch(console.error);
