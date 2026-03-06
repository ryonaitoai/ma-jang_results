import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'janroku.db');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const client = createClient({
  url: `file:${DB_PATH}`,
});

// Enable WAL mode and foreign keys
client.execute('PRAGMA journal_mode = WAL');
client.execute('PRAGMA foreign_keys = ON');
client.execute('PRAGMA busy_timeout = 5000');

export const db = drizzle(client, { schema });
export { client };
