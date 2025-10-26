import * as Crypto from "expo-crypto";
import * as SQLite from "expo-sqlite";

export interface GratitudeEntry {
  id: string;
  date: string; // YYYY-MM-DD format
  content: string;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface NotificationSettings {
  id: number;
  enabled: boolean;
  hour: number; // 0-23
  minute: number; // 0-59
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
    
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      enabled INTEGER NOT NULL DEFAULT 1,
      hour INTEGER NOT NULL DEFAULT 8,
      minute INTEGER NOT NULL DEFAULT 0
    );
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

/**
 * Delete all gratitude entries
 */
export async function deleteAllEntries(): Promise<void> {
  if (!db) await initDatabase();

  await db.runAsync("DELETE FROM gratitude_entries");
}

/**
 * Get notification settings
 */
export async function getNotificationSettings(): Promise<NotificationSettings> {
  if (!db) await initDatabase();

  const result = await db.getFirstAsync<{
    id: number;
    enabled: number;
    hour: number;
    minute: number;
  }>("SELECT * FROM settings WHERE id = 1");

  // If no settings exist, create default settings (enabled at 8:00 AM)
  if (!result) {
    await db.runAsync(
      "INSERT INTO settings (id, enabled, hour, minute) VALUES (1, 1, 8, 0)"
    );
    return { id: 1, enabled: true, hour: 8, minute: 0 };
  }

  // Convert SQLite integer (0/1) to boolean
  return {
    ...result,
    enabled: result.enabled === 1,
  };
}

/**
 * Save notification settings
 */
export async function saveNotificationSettings(
  enabled: boolean,
  hour: number,
  minute: number
): Promise<void> {
  if (!db) await initDatabase();

  // Convert boolean to integer for SQLite
  const enabledInt = enabled ? 1 : 0;

  await db.runAsync(
    "INSERT OR REPLACE INTO settings (id, enabled, hour, minute) VALUES (1, ?, ?, ?)",
    [enabledInt, hour, minute]
  );
}
