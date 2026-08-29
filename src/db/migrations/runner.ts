import type {
  LocalDatabaseConnection,
  LocalDatabaseTransaction,
  TransactionalLocalDatabaseConnection,
} from "../types";
import { localMigrations } from "./registry";
import type { LocalMigration } from "./types";

const SCHEMA_VERSION_KEY = "schema_version";

type SchemaVersionRow = {
  value: string;
};

export async function ensureSchemaMetadataTable(
  database: LocalDatabaseConnection,
): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS local_schema_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

export async function getLocalSchemaVersion(
  database: LocalDatabaseConnection,
): Promise<number> {
  await ensureSchemaMetadataTable(database);

  const row = await database.getFirstAsync<SchemaVersionRow>(
    "SELECT value FROM local_schema_metadata WHERE key = ?;",
    SCHEMA_VERSION_KEY,
  );

  if (!row) {
    return 0;
  }

  const version = Number(row.value);

  if (!Number.isSafeInteger(version) || version < 0) {
    throw new Error(`Invalid local schema version: ${row.value}`);
  }

  return version;
}

async function setLocalSchemaVersion(
  transaction: LocalDatabaseTransaction,
  version: number,
): Promise<void> {
  await transaction.runAsync(
    `
      INSERT INTO local_schema_metadata (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value;
    `,
    SCHEMA_VERSION_KEY,
    String(version),
  );
}

function orderAndValidateMigrations(migrations: readonly LocalMigration[]): LocalMigration[] {
  const ordered = [...migrations].sort((left, right) => left.version - right.version);
  const versions = new Set<number>();

  for (const migration of ordered) {
    if (!Number.isSafeInteger(migration.version) || migration.version <= 0) {
      throw new Error(`Migration ${migration.name} has an invalid version.`);
    }

    if (versions.has(migration.version)) {
      throw new Error(`Duplicate local migration version: ${migration.version}`);
    }

    versions.add(migration.version);
  }

  return ordered;
}

export async function runLocalMigrations(
  database: TransactionalLocalDatabaseConnection,
  migrations: readonly LocalMigration[] = localMigrations,
): Promise<number> {
  await ensureSchemaMetadataTable(database);

  let currentVersion = await getLocalSchemaVersion(database);
  const orderedMigrations = orderAndValidateMigrations(migrations);

  for (const migration of orderedMigrations) {
    if (migration.version <= currentVersion) {
      continue;
    }

    await database.withExclusiveTransactionAsync(async (transaction) => {
      await migration.migrate(transaction);
      await setLocalSchemaVersion(transaction, migration.version);
    });

    currentVersion = migration.version;
  }

  return currentVersion;
}
