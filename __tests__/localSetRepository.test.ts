import { DatabaseSync } from "node:sqlite";

import {
  configureLocalDatabase,
  SQLiteLocalSetRepository,
  SQLiteLocalWorkoutRepository,
} from "@/db";
import { WebPreviewLocalSetRepository } from "@/db/webPreview/WebPreviewLocalSetRepository";
import { WebPreviewLocalWorkoutRepository } from "@/db/webPreview/WebPreviewLocalWorkoutRepository";
import type { WebPreviewStorage } from "@/db/webPreview/storage";
import {
  markWorkoutWebPreviewSetCloudKnown,
  readWorkoutWebPreviewState,
  writeWorkoutWebPreviewState,
} from "@/db/webPreview/workoutStorage";
import type { Workout, WorkoutSet } from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const time = "2026-09-08T12:00:00.000Z";
const userId = "00000000-0000-4000-8000-000000000001";
const otherUserId = "00000000-0000-4000-8000-000000000002";

class MemoryStorage implements WebPreviewStorage {
  private readonly values = new Map<string, string>();
  get length(): number { return this.values.size; }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

function workout(owner = userId): Workout {
  return {
    id: `workout-${owner}`,
    userId: owner,
    name: "Push",
    status: "active",
    startedAt: time,
    exercises: [{
      id: `workout-exercise-${owner}`,
      userId: owner,
      workoutId: `workout-${owner}`,
      exerciseId: "exercise-1",
      position: 0,
      sets: [],
      createdAt: time,
      updatedAt: time,
    }],
    createdAt: time,
    updatedAt: time,
  };
}

function set(id: string, position: number, owner = userId): WorkoutSet {
  return {
    id,
    userId: owner,
    workoutId: `workout-${owner}`,
    workoutExerciseId: `workout-exercise-${owner}`,
    exerciseId: "exercise-1",
    position,
    setType: "working",
    weightKg: 80,
    reps: 8,
    rpe: 8,
    completedAt: time,
    createdAt: time,
    updatedAt: time,
  };
}

describe("SQLiteLocalSetRepository", () => {
  it("creates, updates, orders, isolates, removes pending creates, and tombstones synced sets", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    await configureLocalDatabase(database);
    await new SQLiteLocalWorkoutRepository(database).create(workout());
    const repository = new SQLiteLocalSetRepository(database);
    const later = set("set-2", 1);
    const earlier = set("set-1", 0);

    await repository.create(later);
    await repository.create(earlier);
    expect((await repository.getForWorkoutExercise(userId, earlier.workoutExerciseId)).map(({ id }) => id))
      .toEqual(["set-1", "set-2"]);
    expect(await repository.getById(otherUserId, earlier.id)).toBeNull();

    await repository.update({ ...earlier, reps: 9, rpe: 8.5 });
    expect(await repository.getById(userId, earlier.id)).toMatchObject({ reps: 9, rpe: 8.5 });
    await expect(repository.update({ ...earlier, userId: otherUserId })).rejects.toThrow(
      "not accessible",
    );

    await repository.deleteOrTombstone(userId, later.id);
    expect(await repository.getById(userId, later.id)).toBeNull();
    await database.runAsync(
      "UPDATE local_sets SET sync_status='synced' WHERE id=? AND user_id=?;",
      earlier.id,
      userId,
    );
    await repository.deleteOrTombstone(userId, earlier.id);
    expect(await repository.getById(userId, earlier.id)).toBeNull();
    await expect(database.getFirstAsync<{ deleted_at: string | null }>(
      "SELECT deleted_at FROM local_sets WHERE id=?;",
      earlier.id,
    )).resolves.toEqual(expect.objectContaining({ deleted_at: expect.any(String) }));
    database.close();
  });
});

describe("WebPreviewLocalSetRepository", () => {
  it("matches create, update, ordering, ownership, and tombstone behavior across refresh", async () => {
    const storage = new MemoryStorage();
    await new WebPreviewLocalWorkoutRepository(storage).create(workout());
    const repository = new WebPreviewLocalSetRepository(storage);
    const later = set("set-2", 1);
    const earlier = set("set-1", 0);

    await repository.create(later);
    await repository.create(earlier);
    await repository.update({ ...earlier, reps: 10 });

    const recreated = new WebPreviewLocalSetRepository(storage);
    expect((await recreated.getForWorkoutExercise(userId, earlier.workoutExerciseId)).map(({ id }) => id))
      .toEqual(["set-1", "set-2"]);
    expect(await recreated.getById(userId, earlier.id)).toMatchObject({ reps: 10 });
    expect(await recreated.getById(otherUserId, earlier.id)).toBeNull();
    await expect(recreated.update({ ...earlier, userId: otherUserId })).rejects.toThrow(
      "not accessible",
    );

    const state = readWorkoutWebPreviewState(storage);
    markWorkoutWebPreviewSetCloudKnown(state, earlier.id);
    writeWorkoutWebPreviewState(storage, state);
    await recreated.deleteOrTombstone(userId, earlier.id);
    expect(await recreated.getById(userId, earlier.id)).toBeNull();
    expect(readWorkoutWebPreviewState(storage).deletedSets.map(({ id }) => id)).toContain(earlier.id);
  });
});
