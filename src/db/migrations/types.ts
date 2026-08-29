import type { LocalDatabaseTransaction } from "../types";

export type LocalMigration = {
  version: number;
  name: string;
  migrate(transaction: LocalDatabaseTransaction): Promise<void>;
};
