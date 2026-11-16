import {
  deleteDatabaseAsync,
  openDatabaseAsync,
  type SQLiteDatabase,
} from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import { Platform } from "react-native";
import { localMigrations } from "./migrations";
import { localSchema } from "./schema";

function userDatabaseName(userId: string): string {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    throw new Error("A user ID is required to open local data");
  }
  return `auralenz-${encodeURIComponent(normalizedUserId)}.db`;
}

function createDrizzleDatabase(client: SQLiteDatabase) {
  return drizzle(client, { schema: localSchema });
}

export type LocalDatabase = ReturnType<typeof createDrizzleDatabase>;

const databasePromises = new Map<string, Promise<LocalDatabase>>();
const closingDatabases = new Map<string, Promise<void>>();

async function openAndMigrate(databaseName: string): Promise<LocalDatabase> {
  let sqlite: SQLiteDatabase | null = null;
  try {
    sqlite = await openDatabaseAsync(databaseName);
    if (Platform.OS !== "web") {
      await sqlite.execAsync("PRAGMA journal_mode = WAL;");
    }
    const database = createDrizzleDatabase(sqlite);
    await migrate(database, localMigrations);
    return database;
  } catch (error) {
    if (sqlite) {
      try {
        await sqlite.closeAsync();
      } catch (closeError) {
        console.error("[LocalDatabase] Failed to close after initialization error", closeError);
      }
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Local database initialization failed: ${message}`);
  }
}

export function getUserDatabase(userId: string): Promise<LocalDatabase> {
  const databaseName = userDatabaseName(userId);
  const closing = closingDatabases.get(databaseName);
  if (closing) {
    return closing.then(() => getUserDatabase(userId));
  }
  const existing = databasePromises.get(databaseName);
  if (existing) return existing;

  const opening = openAndMigrate(databaseName);
  databasePromises.set(databaseName, opening);
  void opening.catch(() => {
    if (databasePromises.get(databaseName) === opening) {
      databasePromises.delete(databaseName);
    }
  });
  return opening;
}

export async function initializeUserDatabase(userId: string): Promise<void> {
  await getUserDatabase(userId);
}

export async function closeUserDatabase(userId: string): Promise<void> {
  const databaseName = userDatabaseName(userId);
  const existingClose = closingDatabases.get(databaseName);
  if (existingClose) return existingClose;

  const opening = databasePromises.get(databaseName);
  if (!opening) return;
  databasePromises.delete(databaseName);

  const closePromise = opening.then((database) => database.$client.closeAsync());
  closingDatabases.set(databaseName, closePromise);
  try {
    await closePromise;
  } finally {
    if (closingDatabases.get(databaseName) === closePromise) {
      closingDatabases.delete(databaseName);
    }
  }
}

export async function deleteUserDatabase(userId: string): Promise<void> {
  const databaseName = userDatabaseName(userId);
  await closeUserDatabase(userId);
  await deleteDatabaseAsync(databaseName);
}
