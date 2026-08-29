import { DatabaseSync } from "node:sqlite";

import { configureLocalDatabase } from "@/db";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

describe("local SQLite bootstrap", () => {
  it("opens a real database and executes a scalar query", async () => {
    const nativeDatabase = new DatabaseSync(":memory:");
    const database = new NodeSQLiteConnection(nativeDatabase);

    try {
      await configureLocalDatabase(database);

      await expect(database.getFirstAsync<{ value: number }>("SELECT 1 AS value;")).resolves.toEqual(
        expect.objectContaining({ value: 1 }),
      );
    } finally {
      database.close();
    }
  });

  it("enables foreign keys and remains safe to configure repeatedly", async () => {
    const nativeDatabase = new DatabaseSync(":memory:");
    const database = new NodeSQLiteConnection(nativeDatabase);

    try {
      await configureLocalDatabase(database);
      await configureLocalDatabase(database);

      await expect(
        database.getFirstAsync<{ foreign_keys: number }>("PRAGMA foreign_keys;"),
      ).resolves.toEqual(expect.objectContaining({ foreign_keys: 1 }));
    } finally {
      database.close();
    }
  });
});
