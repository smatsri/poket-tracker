import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { schemaSql } from "./schema.js";

const serverRoot = path.resolve(__dirname, "..", "..");

let appDatabase: Database.Database | undefined;

export function resolveSqlitePath(configuredPath: string): string {
  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(serverRoot, configuredPath);
}

export function openDatabase(configuredPath: string): Database.Database {
  const filePath = resolveSqlitePath(configuredPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const database = new Database(filePath);
  database.pragma("foreign_keys = ON");
  database.exec(schemaSql);
  return database;
}

export function openAppDatabase(configuredPath: string): Database.Database {
  if (appDatabase) {
    throw new Error("Database is already open");
  }

  appDatabase = openDatabase(configuredPath);
  return appDatabase;
}

export function getDatabase(): Database.Database {
  if (!appDatabase) {
    throw new Error("Database is not open");
  }

  return appDatabase;
}

export function closeDatabase(): void {
  if (!appDatabase) {
    return;
  }

  appDatabase.close();
  appDatabase = undefined;
}
