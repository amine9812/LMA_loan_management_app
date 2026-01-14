import path from "path";
import { app } from "electron";
import { openDatabase, runMigrations, type SqliteDatabase } from "@covenantpulse/db";
import { seedDatabase } from "./seed";
import type { StoragePaths } from "./storage";

export async function initDatabase(
  dbPath: string,
  storage?: StoragePaths
): Promise<SqliteDatabase> {
  const db = openDatabase(dbPath);
  const basePath = app.isPackaged
    ? process.resourcesPath
    : path.resolve(app.getAppPath(), "..", "..");
  const migrationsDir = path.join(basePath, "resources", "migrations");
  runMigrations(db, migrationsDir);
  await seedDatabase(db, storage);
  return db;
}
