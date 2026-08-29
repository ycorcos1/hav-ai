import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

export const LOCAL_DATABASE_NAME = "havai.db";

const databaseConnections = new Map<string, Promise<SQLiteDatabase>>();

export function openLocalDatabase(
  databaseName: string = LOCAL_DATABASE_NAME,
): Promise<SQLiteDatabase> {
  const existingConnection = databaseConnections.get(databaseName);

  if (existingConnection) {
    return existingConnection;
  }

  const connection = openDatabaseAsync(databaseName).catch((error: unknown) => {
    databaseConnections.delete(databaseName);
    throw error;
  });

  databaseConnections.set(databaseName, connection);

  return connection;
}

export async function closeLocalDatabase(
  databaseName: string = LOCAL_DATABASE_NAME,
): Promise<void> {
  const connection = databaseConnections.get(databaseName);

  if (!connection) {
    return;
  }

  databaseConnections.delete(databaseName);

  const database = await connection;
  await database.closeAsync();
}
