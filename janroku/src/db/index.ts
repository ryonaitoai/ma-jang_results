import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

function getClient() {
  if (process.env.DATABASE_URL) {
    // Turso (remote)
    return createClient({
      url: process.env.DATABASE_URL,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });
  }

  // Local file-based SQLite
  const path = require('path');
  const fs = require('fs');
  const DB_DIR = path.join(process.cwd(), 'data');
  const DB_PATH = path.join(DB_DIR, 'janroku.db');

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const localClient = createClient({ url: `file:${DB_PATH}` });
  localClient.execute('PRAGMA journal_mode = WAL');
  localClient.execute('PRAGMA foreign_keys = ON');
  localClient.execute('PRAGMA busy_timeout = 5000');
  return localClient;
}

const client = getClient();

export const db = drizzle(client, { schema });
export { client };
