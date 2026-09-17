import { DatabaseSync } from "node:sqlite";

import { configureLocalDatabase, SQLiteLocalWorkoutRepository } from "@/db";
import { WebPreviewLocalWorkoutRepository } from "@/db/webPreview/WebPreviewLocalWorkoutRepository";
import type { WebPreviewStorage } from "@/db/webPreview/storage";
import type { Workout } from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

class MemoryStorage implements WebPreviewStorage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function workout(id: string, status: Workout["status"], completedAt?: string, userId = "user-a"): Workout {
  const startedAt = "2026-09-01T10:00:00.000Z";
  return {
    id,
    userId,
    name: id,
    status,
    startedAt,
    completedAt,
    exercises: [],
    createdAt: startedAt,
    updatedAt: completedAt ?? startedAt,
  };
}

describe.each([
  ["SQLite", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    await configureLocalDatabase(database);
    return { close: (): void => database.close(), repository: new SQLiteLocalWorkoutRepository(database) };
  }],
  ["web preview", async () => ({
    close: (): void => undefined,
    repository: new WebPreviewLocalWorkoutRepository(new MemoryStorage()),
  })],
] as const)("%s workout history repository", (_name, setup) => {
  it("returns only owned completed workouts newest first with a stable cursor", async () => {
    const { close, repository } = await setup();
    await repository.create(workout("older", "completed", "2026-09-02T10:00:00.000Z"));
    await repository.create(workout("same-a", "completed", "2026-09-03T10:00:00.000Z"));
    await repository.create(workout("same-b", "completed", "2026-09-03T10:00:00.000Z"));
    await repository.create(workout("active", "active"));
    await repository.create(workout("foreign", "completed", "2026-09-04T10:00:00.000Z", "user-b"));

    const first = await repository.listCompleted({ userId: "user-a", limit: 2 });
    expect(first.items.map(({ id }) => id)).toEqual(["same-b", "same-a"]);
    expect(first.nextCursor).toEqual({ completedAt: "2026-09-03T10:00:00.000Z", id: "same-a" });

    const second = await repository.listCompleted({
      userId: "user-a",
      limit: 2,
      cursor: first.nextCursor,
    });
    expect(second.items.map(({ id }) => id)).toEqual(["older"]);
    expect(second.nextCursor).toBeUndefined();
    close();
  });
});
