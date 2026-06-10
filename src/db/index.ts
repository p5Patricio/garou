import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';
import { seedDatabase } from './seed';

let _db: SQLite.SQLiteDatabase | null = null;

export async function initDB(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;

  const db = await SQLite.openDatabaseAsync('garou.db');

  const statements = SCHEMA_SQL
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    await db.execAsync(stmt + ';');
  }

  await seedDatabase(db);

  _db = db;
  return db;
}

export function getDB(): SQLite.SQLiteDatabase {
  if (!_db) throw new Error('DB not initialized — call initDB() first');
  return _db;
}
