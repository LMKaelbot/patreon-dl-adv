import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    const dbPath = process.env.DB_PATH || './data/patreon-dl-adv.db';
    _db = new Database(dbPath);
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    _db.exec(schema);
  }
  return _db;
}
