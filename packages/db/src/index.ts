import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { randomUUID } from "crypto";

export type SqliteDatabase = Database.Database;

export function openDatabase(dbPath: string): SqliteDatabase {
  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  return db;
}

export function runMigrations(db: SqliteDatabase, migrationsDir: string): void {
  db.exec(
    "CREATE TABLE IF NOT EXISTS migrations (id TEXT PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL);"
  );

  const rows = db
    .prepare("SELECT name FROM migrations")
    .all() as { name: string }[];
  const applied = new Set(rows.map((row) => row.name));

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    db.exec(sql);
    db.prepare(
      "INSERT INTO migrations (id, name, applied_at) VALUES (?, ?, ?)"
    ).run(randomUUID(), file, new Date().toISOString());
  }
}
