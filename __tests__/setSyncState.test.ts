import { DatabaseSync } from "node:sqlite";

import { configureLocalDatabase, SQLiteLocalWorkoutRepository } from "@/db";
import { WebPreviewLocalWorkoutRepository } from "@/db/webPreview/WebPreviewLocalWorkoutRepository";
import type { WebPreviewStorage } from "@/db/webPreview/storage";
import {
  markWorkoutWebPreviewSetCloudKnown,
  readWorkoutWebPreviewState,
  workoutWebPreviewStorageKey,
  writeWorkoutWebPreviewState,
} from "@/db/webPreview/workoutStorage";
import { SQLiteSetPersistence } from "@/features/workouts/services/setPersistence.native";
import { WebPreviewSetPersistence } from "@/features/workouts/services/setPersistence.web";
import type { Workout, WorkoutSet } from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const time = "2026-09-08T13:00:00.000Z";
const later = "2026-09-08T14:00:00.000Z";
const userId = "user-1";
const otherUserId = "user-2";
const setId = "set-1";

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

function workout(): Workout {
  return {
    id: "workout-1",
    userId,
    name: "Push",
    status: "active",
    startedAt: time,
    exercises: [{
      id: "workout-exercise-1",
      userId,
      workoutId: "workout-1",
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

function completedSet(overrides: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    id: setId,
    userId,
    workoutId: "workout-1",
    workoutExerciseId: "workout-exercise-1",
    exerciseId: "exercise-1",
    position: 0,
    setType: "working",
    weightKg: 80,
    reps: 8,
    rpe: 8,
    completedAt: time,
    createdAt: time,
    updatedAt: time,
    ...overrides,
  };
}

describe("web-preview set synchronization metadata", () => {
  it("persists local-only metadata across refresh and preserves it through edits", async () => {
    const storage = new MemoryStorage();
    await new WebPreviewLocalWorkoutRepository(storage).create(workout());
    const persistence = new WebPreviewSetPersistence(storage);
    await persistence.commitCompletedSet(completedSet());

    expect(readWorkoutWebPreviewState(storage).setSyncMetadata[setId]).toEqual({
      cloudKnown: false,
    });
    await persistence.commitEditedSet(completedSet({ reps: 10, updatedAt: later }));

    const refreshed = readWorkoutWebPreviewState(storage);
    expect(refreshed.setSyncMetadata[setId]).toEqual({ cloudKnown: false });
    expect(refreshed.workouts[0].exercises[0].sets[0]).toMatchObject({ reps: 10 });
    expect(refreshed.queue.filter(({ entityId }) => entityId === setId)).toHaveLength(1);
    expect(refreshed.queue[0]).toMatchObject({ operation: "upsert" });
  });

  it("represents successful sync explicitly and does not let a pending upsert redefine it", async () => {
    const storage = new MemoryStorage();
    await new WebPreviewLocalWorkoutRepository(storage).create(workout());
    const persistence = new WebPreviewSetPersistence(storage);
    await persistence.commitCompletedSet(completedSet());
    const syncedState = readWorkoutWebPreviewState(storage);
    markWorkoutWebPreviewSetCloudKnown(syncedState, setId);
    syncedState.queue = [];
    writeWorkoutWebPreviewState(storage, syncedState);

    await persistence.commitEditedSet(completedSet({ reps: 9, updatedAt: later }));
    const editedState = readWorkoutWebPreviewState(storage);
    expect(editedState.setSyncMetadata[setId]).toEqual({ cloudKnown: true });
    expect(editedState.queue).toContainEqual(expect.objectContaining({
      entityId: setId,
      operation: "upsert",
    }));

    await expect(persistence.deleteCompletedSet(userId, setId, later)).resolves.toBe("tombstoned");
    const deletedState = readWorkoutWebPreviewState(storage);
    expect(deletedState.workouts[0].exercises[0].sets).toEqual([]);
    expect(deletedState.deletedSets).toContainEqual(expect.objectContaining({ id: setId }));
    expect(deletedState.setSyncMetadata[setId]).toEqual({ cloudKnown: true });
    expect(deletedState.queue.filter(({ entityId }) => entityId === setId)).toEqual([
      expect.objectContaining({ operation: "delete" }),
    ]);
  });

  it("hard-deletes a never-synced set and removes its pending upsert", async () => {
    const storage = new MemoryStorage();
    await new WebPreviewLocalWorkoutRepository(storage).create(workout());
    const persistence = new WebPreviewSetPersistence(storage);
    await persistence.commitCompletedSet(completedSet());

    await expect(persistence.deleteCompletedSet(userId, setId, later)).resolves.toBe("deleted-local");
    const state = readWorkoutWebPreviewState(storage);
    expect(state.workouts[0].exercises[0].sets).toEqual([]);
    expect(state.deletedSets).toEqual([]);
    expect(state.setSyncMetadata[setId]).toBeUndefined();
    expect(state.queue.some(({ entityId }) => entityId === setId)).toBe(false);
  });

  it("treats legacy sets without metadata as cloud-known and preserves ownership isolation", async () => {
    const storage = new MemoryStorage();
    const legacy = {
      deletedSets: [],
      queue: [{
        id: "queue-1",
        entityType: "set",
        entityId: setId,
        operation: "upsert",
        attemptCount: 0,
        createdAt: time,
      }],
      recommendations: [],
      version: 1,
      workouts: [{ ...workout(), exercises: [{ ...workout().exercises[0], sets: [completedSet()] }] }],
    };
    storage.setItem(workoutWebPreviewStorageKey, JSON.stringify(legacy));
    const persistence = new WebPreviewSetPersistence(storage);

    expect(readWorkoutWebPreviewState(storage).setSyncMetadata[setId]).toEqual({ cloudKnown: true });
    await expect(persistence.deleteCompletedSet(otherUserId, setId, later)).rejects.toThrow(
      "Set ancestry is not accessible to its user.",
    );
    expect(readWorkoutWebPreviewState(storage).workouts[0].exercises[0].sets).toHaveLength(1);
  });

  it("leaves persisted entity and queue state unchanged when the atomic write fails", async () => {
    const storage = new MemoryStorage();
    await new WebPreviewLocalWorkoutRepository(storage).create(workout());
    const persistence = new WebPreviewSetPersistence(storage);
    await persistence.commitCompletedSet(completedSet());
    const before = storage.getItem(workoutWebPreviewStorageKey);
    storage.failWrites = true;

    await expect(persistence.commitEditedSet(completedSet({ reps: 12, updatedAt: later })))
      .rejects.toThrow("development workout preview data could not be saved");
    storage.failWrites = false;
    expect(storage.getItem(workoutWebPreviewStorageKey)).toBe(before);
  });
});

describe("native set synchronization state", () => {
  it("atomically hard-deletes local-only sets and tombstones cloud-known edited sets", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    await configureLocalDatabase(database);
    await new SQLiteLocalWorkoutRepository(database).create(workout());
    const persistence = new SQLiteSetPersistence(database);

    await persistence.commitCompletedSet(completedSet());
    await expect(persistence.deleteCompletedSet(userId, setId, later)).resolves.toBe("deleted-local");
    await expect(database.getFirstAsync("SELECT id FROM local_sets WHERE id=?;", setId))
      .resolves.toBeNull();
    await expect(database.getFirstAsync(
      "SELECT id FROM sync_queue WHERE entity_type='set' AND entity_id=?;",
      setId,
    )).resolves.toBeNull();

    await persistence.commitCompletedSet(completedSet());
    await database.runAsync(
      "UPDATE local_sets SET sync_status='synced', server_updated_at=? WHERE id=?;",
      time,
      setId,
    );
    await persistence.commitEditedSet(completedSet({ reps: 10, updatedAt: later }));
    await expect(persistence.deleteCompletedSet(userId, setId, later)).resolves.toBe("tombstoned");
    await expect(database.getFirstAsync<{ deleted_at: string; sync_status: string }>(
      "SELECT deleted_at, sync_status FROM local_sets WHERE id=?;",
      setId,
    )).resolves.toEqual({ deleted_at: later, sync_status: "pending_delete" });
    await expect(database.getFirstAsync<{ operation: string }>(
      "SELECT operation FROM sync_queue WHERE entity_type='set' AND entity_id=?;",
      setId,
    )).resolves.toEqual({ operation: "delete" });
    database.close();
  });

  it("rolls back an edit when queue coalescing fails", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    await configureLocalDatabase(database);
    await new SQLiteLocalWorkoutRepository(database).create(workout());
    const persistence = new SQLiteSetPersistence(database);
    await persistence.commitCompletedSet(completedSet());
    await database.execAsync(`
      CREATE TRIGGER fail_set_queue_update
      BEFORE UPDATE ON sync_queue
      WHEN NEW.entity_type = 'set'
      BEGIN
        SELECT RAISE(FAIL, 'queue unavailable');
      END;
    `);

    await expect(persistence.commitEditedSet(completedSet({ reps: 12, updatedAt: later })))
      .rejects.toThrow("queue unavailable");
    await expect(persistence.setRepository.getById(userId, setId)).resolves.toMatchObject({
      reps: 8,
      updatedAt: time,
    });
    database.close();
  });
});
