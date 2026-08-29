import type { SQLiteBindValue } from "expo-sqlite";

export type LocalDatabaseConnection = {
  execAsync(source: string): Promise<void>;
  getFirstAsync<T>(source: string, ...params: SQLiteBindValue[]): Promise<T | null>;
  getAllAsync<T>(source: string, ...params: SQLiteBindValue[]): Promise<T[]>;
  runAsync(source: string, ...params: SQLiteBindValue[]): Promise<unknown>;
};

export type LocalDatabaseTransaction = LocalDatabaseConnection;

export type TransactionalLocalDatabaseConnection = LocalDatabaseConnection & {
  withExclusiveTransactionAsync(
    task: (transaction: LocalDatabaseTransaction) => Promise<void>,
  ): Promise<void>;
};
