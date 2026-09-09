import { DatabaseSync } from "node:sqlite";

import {
  configureLocalDatabase,
  SQLiteLocalWorkoutRepository,
} from "@/db";
import { WebPreviewLocalWorkoutRepository } from "@/db/webPreview/WebPreviewLocalWorkoutRepository";
import type { WebPreviewStorage } from "@/db/webPreview/storage";
import {
  markWorkoutWebPreviewSetCloudKnown,
  readWorkoutWebPreviewState,
  writeWorkoutWebPreviewState,
} from "@/db/webPreview/workoutStorage";
import { SQLiteSetPersistence } from "@/features/workouts/services/setPersistence.native";
import { WebPreviewSetPersistence } from "@/features/workouts/services/setPersistence.web";
import {
  UndoSetCompletionError,
  UndoSetCompletionService,
} from "@/features/workouts/services/undoSetCompletion";
import type { Workout, WorkoutSet } from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const userId = "user-a";
const completedAt = "2026-09-09T12:00:00.000Z";
const deletedAt = "2026-09-09T12:00:01.000Z";

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

function workout(sets: WorkoutSet[] = []): Workout {
  return {
    id: "workout-1",
    userId,
    name: "Push",
    status: "active",
    startedAt: completedAt,
    exercises: [{
      id: "workout-exercise-1",
      userId,
      workoutId: "workout-1",
      exerciseId: "exercise-1",
      position: 0,
      sets,
      createdAt: completedAt,
      updatedAt: completedAt,
    }],
    createdAt: completedAt,
    updatedAt: completedAt,
  };
}

function completedSet(id = "set-1"): WorkoutSet {
  return {
    id,
    userId,
    workoutId: "workout-1",
    workoutExerciseId: "workout-exercise-1",
    exerciseId: "exercise-1",
    position: 0,
    setType: "working",
    weightKg: 82.5,
    reps: 8,
    rpe: 8.5,
    notes: "Pause at the chest",
    completedAt,
    createdAt: completedAt,
    updatedAt: completedAt,
  };
}

describe("UndoSetCompletionService", () => {
  it("hard-deletes a local-only set and coalesces its pending upsert without a delete", async () => {
    const storage = new MemoryStorage();
    await new WebPreviewLocalWorkoutRepository(storage).create(workout());
    const persistence = new WebPreviewSetPersistence(storage);
    await persistence.commitCompletedSet(completedSet());

    await expect(new UndoSetCompletionService(persistence, { now: () => deletedAt }).undo(
      userId,
      "set-1",
    )).resolves.toEqual({
      restoredDraft: {
        weightKg: 82.5,
        reps: 8,
        rpe: 8.5,
        notes: "Pause at the chest",
      },
    });

    const state = readWorkoutWebPreviewState(storage);
    expect(state.workouts[0].exercises[0].sets).toEqual([]);
    expect(state.deletedSets).toEqual([]);
    expect(state.setSyncMetadata["set-1"]).toBeUndefined();
    expect(state.queue.filter(({ entityId }) => entityId === "set-1")).toEqual([]);
  });

  it("uses explicit cloud-known metadata and coalesces a canonical delete", async () => {
    const storage = new MemoryStorage();
    await new WebPreviewLocalWorkoutRepository(storage).create(workout());
    const persistence = new WebPreviewSetPersistence(storage);
    await persistence.commitCompletedSet(completedSet());
    const state = readWorkoutWebPreviewState(storage);
    markWorkoutWebPreviewSetCloudKnown(state, "set-1");
    writeWorkoutWebPreviewState(storage, state);

    await new UndoSetCompletionService(persistence, { now: () => deletedAt }).undo(userId, "set-1");

    const refreshed = readWorkoutWebPreviewState(storage);
    expect(refreshed.workouts[0].exercises[0].sets).toEqual([]);
    expect(refreshed.deletedSets).toContainEqual(expect.objectContaining({ id: "set-1" }));
    expect(refreshed.setSyncMetadata["set-1"]).toEqual({ cloudKnown: true });
    expect(refreshed.queue.filter(({ entityId }) => entityId === "set-1")).toEqual([
      expect.objectContaining({ operation: "delete" }),
    ]);
  });

  it("rejects wrong-owner access and rolls back a native cloud-known delete failure", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    await configureLocalDatabase(database);
    await new SQLiteLocalWorkoutRepository(database).create(workout([completedSet()]));
    const persistence = new SQLiteSetPersistence(database);
    const service = new UndoSetCompletionService(persistence, { now: () => deletedAt });

    await expect(service.undo("other-user", "set-1")).rejects.toBeInstanceOf(
      UndoSetCompletionError,
    );
    await database.runAsync(
      "UPDATE local_sets SET sync_status='synced', server_updated_at=? WHERE id=?;",
      completedAt,
      "set-1",
    );
    await database.runAsync(
      "DELETE FROM sync_queue WHERE entity_type='set' AND entity_id=?;",
      "set-1",
    );
    await database.execAsync(`
      CREATE TRIGGER fail_undo_queue
      BEFORE INSERT ON sync_queue
      WHEN NEW.entity_type='set'
      BEGIN
        SELECT RAISE(FAIL, 'queue unavailable');
      END;
    `);

    await expect(service.undo(userId, "set-1")).rejects.toThrow("queue unavailable");
    await expect(persistence.setRepository.getById(userId, "set-1")).resolves.toMatchObject({
      id: "set-1",
    });
    await expect(database.getFirstAsync(
      "SELECT id FROM sync_queue WHERE entity_type='set' AND entity_id=?;",
      "set-1",
    )).resolves.toBeNull();
    database.close();
  });
});
