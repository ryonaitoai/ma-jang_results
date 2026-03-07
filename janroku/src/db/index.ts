import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

function getClient() {
  if (process.env.DATABASE_URL) {
    // Turso (remote)
    const tursoClient = createClient({
      url: process.env.DATABASE_URL,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });
    // Enable foreign key constraints on Turso
    tursoClient.execute('PRAGMA foreign_keys = ON').catch((err) => {
      console.warn('Failed to enable foreign_keys on Turso:', err);
    });
    return tursoClient;
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
  // Batch PRAGMAs to ensure they complete before first query
  localClient.batch([
    'PRAGMA journal_mode = WAL',
    'PRAGMA foreign_keys = ON',
    'PRAGMA busy_timeout = 5000',
  ]).catch((err) => {
    console.error('Failed to set PRAGMAs:', err);
  });
  return localClient;
}

const client = getClient();

export const db = drizzle(client, { schema });
export { client };
