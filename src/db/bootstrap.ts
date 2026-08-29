import type { SQLiteDatabase } from "expo-sqlite";

import { LOCAL_DATABASE_NAME, openLocalDatabase } from "./connection";
import { runLocalMigrations } from "./migrations";
import type { TransactionalLocalDatabaseConnection } from "./types";

type ForeignKeyPragmaRow = {
  foreign_keys: number;
};

const bootstrapOperations = new WeakMap<SQLiteDatabase, Promise<void>>();

export async function configureLocalDatabase(
  database: TransactionalLocalDatabaseConnection,
): Promise<void> {
  await database.execAsync("PRAGMA foreign_keys = ON;");

  const result = await database.getFirstAsync<ForeignKeyPragmaRow>("PRAGMA foreign_keys;");

  if (result?.foreign_keys !== 1) {
    throw new Error("SQLite foreign-key enforcement could not be enabled.");
  }

  await runLocalMigrations(database);
}

export async function bootstrapLocalDatabase(
  databaseName: string = LOCAL_DATABASE_NAME,
): Promise<SQLiteDatabase> {
  const database = await openLocalDatabase(databaseName);
  let bootstrap = bootstrapOperations.get(database);

  if (!bootstrap) {
    bootstrap = configureLocalDatabase(database).catch((error: unknown) => {
      bootstrapOperations.delete(database);
      throw error;
    });
    bootstrapOperations.set(database, bootstrap);
  }

  await bootstrap;

  return database;
}
