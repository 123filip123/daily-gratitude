import * as Crypto from "expo-crypto";
import * as SQLite from "expo-sqlite";

export interface GratitudeEntry {
  id: string;
  date: string; // YYYY-MM-DD format
  content: string;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

let db: SQLite.SQLiteDatabase;

/**
 * Initialize the database and create tables if they don't exist
 */
export async function initDatabase(): Promise<void> {
  db = await SQLite.openDatabaseAsync("gratitude.db");

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS gratitude_entries (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_date ON gratitude_entries(date);
  `);
}

/**
 * Get entry for a specific date
 */
export async function getEntryByDate(
  date: string
): Promise<GratitudeEntry | null> {
  if (!db) await initDatabase();

  const result = await db.getFirstAsync<GratitudeEntry>(
    "SELECT * FROM gratitude_entries WHERE date = ?",
    [date]
  );

  return result || null;
}

/**
 * Get all entries
 */
export async function getAllEntries(): Promise<GratitudeEntry[]> {
  if (!db) await initDatabase();

  const results = await db.getAllAsync<GratitudeEntry>(
    "SELECT * FROM gratitude_entries ORDER BY date DESC"
  );

  return results;
}

/**
 * Save or update an entry for a specific date
 */
export async function saveEntry(date: string, content: string): Promise<void> {
  if (!db) await initDatabase();

  const existing = await getEntryByDate(date);
  const now = new Date().toISOString();

  if (existing) {
    // Update existing entry
    await db.runAsync(
      "UPDATE gratitude_entries SET content = ?, updated_at = ? WHERE date = ?",
      [content, now, date]
    );
  } else {
    // Create new entry with UUID
    const id = Crypto.randomUUID();
    await db.runAsync(
      "INSERT INTO gratitude_entries (id, date, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      [id, date, content, now, now]
    );
  }
}

/**
 * Delete an entry for a specific date
 */
export async function deleteEntry(date: string): Promise<void> {
  if (!db) await initDatabase();

  await db.runAsync("DELETE FROM gratitude_entries WHERE date = ?", [date]);
}
