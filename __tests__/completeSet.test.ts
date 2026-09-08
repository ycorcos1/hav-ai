import { DatabaseSync } from "node:sqlite";

import { configureLocalDatabase, SQLiteLocalWorkoutRepository } from "@/db";
import { WebPreviewLocalWorkoutRepository } from "@/db/webPreview/WebPreviewLocalWorkoutRepository";
import type { WebPreviewStorage } from "@/db/webPreview/storage";
import { readWorkoutWebPreviewState } from "@/db/webPreview/workoutStorage";
import {
  CompleteSetError,
  CompleteSetService,
} from "@/features/workouts/services/completeSet";
import { SQLiteSetPersistence } from "@/features/workouts/services/setPersistence.native";
import { WebPreviewSetPersistence } from "@/features/workouts/services/setPersistence.web";
import type { CompleteSetInput, Workout } from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const userId = "00000000-0000-4000-8000-000000000001";
const otherUserId = "00000000-0000-4000-8000-000000000002";
const now = "2026-09-08T13:00:00.000Z";
const setId = "00000000-0000-4000-8000-000000000010";

class MemoryStorage implements WebPreviewStorage {
  private readonly values = new Map<string, string>();
  failWrites = false;
  get length(): number { return this.values.size; }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error("storage failed");
    this.values.set(key, value);
  }
}

function workout(owner = userId): Workout {
  return {
    id: "00000000-0000-4000-8000-000000000020",
    userId: owner,
    name: "Push",
    status: "active",
    startedAt: now,
    exercises: [{
      id: "00000000-0000-4000-8000-000000000030",
      userId: owner,
      workoutId: "00000000-0000-4000-8000-000000000020",
      exerciseId: "00000000-0000-4000-8000-000000000040",
      position: 0,
      sets: [],
      createdAt: now,
      updatedAt: now,
    }],
    createdAt: now,
    updatedAt: now,
  };
}

function input(overrides: Partial<CompleteSetInput> = {}): CompleteSetInput {
  return {
    workoutId: "00000000-0000-4000-8000-000000000020",
    workoutExerciseId: "00000000-0000-4000-8000-000000000030",
    exerciseId: "00000000-0000-4000-8000-000000000040",
    setType: "working",
    weightKg: 83.9146,
    reps: 8,
    rpe: 8.5,
    ...overrides,
  };
}

describe("completeSet", () => {
  it("validates ownership, creates the next set, and commits set plus queue atomically in SQLite", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    await configureLocalDatabase(database);
    await new SQLiteLocalWorkoutRepository(database).create(workout());
    const persistence = new SQLiteSetPersistence(database);
    const firstService = new CompleteSetService(persistence, {
      createId: () => setId,
      now: () => now,
    });

    const first = await firstService.complete(userId, input());
    expect(first.set).toEqual({
      id: setId,
      userId,
      workoutId: input().workoutId,
      workoutExerciseId: input().workoutExerciseId,
      exerciseId: input().exerciseId,
      position: 0,
      setType: "working",
      weightKg: 83.9146,
      reps: 8,
      rpe: 8.5,
      completedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await expect(database.getFirstAsync<{ operation: string }>(
      "SELECT operation FROM sync_queue WHERE entity_type='set' AND entity_id=?;",
      setId,
    )).resolves.toEqual({ operation: "upsert" });

    const second = await new CompleteSetService(persistence, {
      createId: () => "00000000-0000-4000-8000-000000000011",
      now: () => now,
    }).complete(userId, input({ rpe: undefined, reps: 7 }));
    expect(second.set).toMatchObject({ position: 1, reps: 7 });
    expect(second.set.rpe).toBeUndefined();
    database.close();
  });

  it("rejects invalid input, wrong owners, inactive workouts, and mismatched exercises before writing", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    await configureLocalDatabase(database);
    const workoutRepository = new SQLiteLocalWorkoutRepository(database);
    await workoutRepository.create(workout());
    const persistence = new SQLiteSetPersistence(database);
    const service = new CompleteSetService(persistence);

    await expect(service.complete(userId, input({ reps: 0 }))).rejects.toBeInstanceOf(CompleteSetError);
    await expect(service.complete(userId, input({ weightKg: -1 }))).rejects.toBeInstanceOf(CompleteSetError);
    await expect(service.complete(userId, input({ rpe: 8.2 as never }))).rejects.toBeInstanceOf(CompleteSetError);
    await expect(service.complete(otherUserId, input())).rejects.toThrow("active workout");
    await expect(service.complete(userId, input({ exerciseId: "wrong-exercise" }))).rejects.toThrow(
      "workout exercise",
    );
    await workoutRepository.update({ ...workout(), status: "completed", completedAt: now });
    await expect(service.complete(userId, input())).rejects.toThrow("active workout");
    await expect(database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM local_sets;",
    )).resolves.toEqual({ count: 0 });
    database.close();
  });

  it("rolls back the local set when queue persistence fails", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    await configureLocalDatabase(database);
    await new SQLiteLocalWorkoutRepository(database).create(workout());
    await database.execAsync(`
      CREATE TRIGGER fail_set_queue
      BEFORE INSERT ON sync_queue
      WHEN NEW.entity_type = 'set'
      BEGIN
        SELECT RAISE(FAIL, 'queue unavailable');
      END;
    `);

    const service = new CompleteSetService(new SQLiteSetPersistence(database), {
      createId: () => setId,
      now: () => now,
    });
    await expect(service.complete(userId, input())).rejects.toThrow("queue unavailable");
    await expect(database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM local_sets WHERE id=?;",
      setId,
    )).resolves.toEqual({ count: 0 });
    database.close();
  });

  it("commits the equivalent web-preview set and queue in one storage write", async () => {
    const storage = new MemoryStorage();
    await new WebPreviewLocalWorkoutRepository(storage).create(workout());
    const service = new CompleteSetService(new WebPreviewSetPersistence(storage), {
      createId: () => setId,
      now: () => now,
    });

    await expect(service.complete(userId, input())).resolves.toMatchObject({
      set: { id: setId, position: 0 },
    });
    const state = readWorkoutWebPreviewState(storage);
    expect(state.workouts[0].exercises[0].sets).toEqual([
      expect.objectContaining({ id: setId, weightKg: 83.9146, reps: 8, rpe: 8.5 }),
    ]);
    expect(state.queue).toContainEqual(expect.objectContaining({
      entityType: "set",
      entityId: setId,
      operation: "upsert",
    }));
  });

  it("does not expose a partial web-preview set when the atomic storage write fails", async () => {
    const storage = new MemoryStorage();
    await new WebPreviewLocalWorkoutRepository(storage).create(workout());
    storage.failWrites = true;
    const service = new CompleteSetService(new WebPreviewSetPersistence(storage), {
      createId: () => setId,
      now: () => now,
    });

    await expect(service.complete(userId, input())).rejects.toThrow(
      "development workout preview data could not be saved",
    );
    storage.failWrites = false;
    const state = readWorkoutWebPreviewState(storage);
    expect(state.workouts[0].exercises[0].sets).toEqual([]);
    expect(state.queue.some(({ entityId }) => entityId === setId)).toBe(false);
  });
});
