import { DatabaseSync } from "node:sqlite";
import type { SQLiteBindValue } from "expo-sqlite";

import type {
  LocalDatabaseTransaction,
  TransactionalLocalDatabaseConnection,
} from "@/db";

export class NodeSQLiteConnection implements TransactionalLocalDatabaseConnection {
  constructor(private readonly database: DatabaseSync) {}

  async execAsync(source: string): Promise<void> {
    this.database.exec(source);
  }

  async getFirstAsync<T>(source: string, ...params: SQLiteBindValue[]): Promise<T | null> {
    const result = this.database.prepare(source).get(...this.toSupportedParams(params));

    return (result as T | undefined) ?? null;
  }

  async runAsync(source: string, ...params: SQLiteBindValue[]): Promise<unknown> {
    return this.database.prepare(source).run(...this.toSupportedParams(params));
  }

  async withExclusiveTransactionAsync(
    task: (transaction: LocalDatabaseTransaction) => Promise<void>,
  ): Promise<void> {
    this.database.exec("BEGIN EXCLUSIVE TRANSACTION;");

    try {
      await task(this);
      this.database.exec("COMMIT;");
    } catch (error: unknown) {
      this.database.exec("ROLLBACK;");
      throw error;
    }
  }

  close(): void {
    this.database.close();
  }

  private toSupportedParams(params: SQLiteBindValue[]) {
    return params.map((value) => {
      if (typeof value === "boolean") {
        return Number(value);
      }

      return value instanceof ArrayBuffer ? new Uint8Array(value) : value;
    });
  }
}
