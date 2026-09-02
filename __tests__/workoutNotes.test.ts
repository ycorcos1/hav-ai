import { DatabaseSync } from "node:sqlite";

import { configureLocalDatabase, SQLiteLocalWorkoutRepository } from "@/db";
import { WebPreviewLocalWorkoutRepository } from "@/db/webPreview/WebPreviewLocalWorkoutRepository";
import type { WebPreviewStorage } from "@/db/webPreview/storage";
import { readWorkoutWebPreviewState } from "@/db/webPreview/workoutStorage";
import { updateActiveWorkoutNote } from "@/features/workouts/services/workoutNotes";
import type { Workout } from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const createdAt = "2026-09-02T12:00:00.000Z";
const firstUpdate = "2026-09-02T12:05:00.000Z";
const secondUpdate = "2026-09-02T12:06:00.000Z";

class MemoryStorage implements WebPreviewStorage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function workout(userId: string, id: string): Workout {
  return {
    id,
    userId,
    name: "Push",
    status: "active",
    startedAt: createdAt,
    notes: "Original workout note",
    exercises: [{
      id: `${id}-exercise`,
      userId,
      workoutId: id,
      exerciseId: "exercise-1",
      position: 0,
      notes: "Workout-exercise note",
      sets: [{
        id: `${id}-set`,
        userId,
        workoutId: id,
        workoutExerciseId: `${id}-exercise`,
        exerciseId: "exercise-1",
        position: 0,
        setType: "working",
        reps: 8,
        notes: "Set note",
        completedAt: createdAt,
        createdAt,
        updatedAt: createdAt,
      }],
      createdAt,
      updatedAt: createdAt,
    }],
    createdAt,
    updatedAt: createdAt,
  };
}

describe("active workout notes", () => {
  it("persists offline in SQLite, survives repository recreation, and coalesces workout upserts", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    await configureLocalDatabase(database);
    const repository = new SQLiteLocalWorkoutRepository(database);
    const owned = workout("user-a", "workout-a");
    const unrelated = workout("user-b", "workout-b");
    await repository.create(owned);
    await repository.create(unrelated);

    await updateActiveWorkoutNote(repository, "user-a", {
      workoutId: owned.id,
      notes: " First offline edit ",
    }, firstUpdate);
    await updateActiveWorkoutNote(repository, "user-a", {
      workoutId: owned.id,
      notes: "Second offline edit",
    }, secondUpdate);

    const reopened = new SQLiteLocalWorkoutRepository(database);
    const saved = await reopened.getById("user-a", owned.id);
    expect(saved).toMatchObject({ notes: "Second offline edit", updatedAt: secondUpdate });
    expect(saved?.exercises[0].notes).toBe("Workout-exercise note");
    expect(saved?.exercises[0].sets[0].notes).toBe("Set note");
    expect((await reopened.getById("user-b", unrelated.id))?.notes).toBe("Original workout note");
    await expect(database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM sync_queue WHERE entity_type='workout' AND entity_id=?;",
      owned.id,
    )).resolves.toEqual({ count: 1 });
    database.close();
  });

  it("persists across web-preview repository recreation and clears blank notes", async () => {
    const storage = new MemoryStorage();
    const repository = new WebPreviewLocalWorkoutRepository(storage);
    const owned = workout("user-a", "workout-a");
    const unrelated = workout("user-b", "workout-b");
    await repository.create(owned);
    await repository.create(unrelated);

    await updateActiveWorkoutNote(repository, "user-a", {
      workoutId: owned.id,
      notes: "Web preview note",
    }, firstUpdate);
    await updateActiveWorkoutNote(repository, "user-a", {
      workoutId: owned.id,
      notes: "   ",
    }, secondUpdate);

    const reopened = new WebPreviewLocalWorkoutRepository(storage);
    const saved = await reopened.getById("user-a", owned.id);
    expect(saved?.notes).toBeUndefined();
    expect(saved?.exercises[0].notes).toBe("Workout-exercise note");
    expect(saved?.exercises[0].sets[0].notes).toBe("Set note");
    expect((await reopened.getById("user-b", unrelated.id))?.notes).toBe("Original workout note");
    expect(readWorkoutWebPreviewState(storage).queue.filter((item) =>
      item.entityType === "workout" && item.entityId === owned.id)).toHaveLength(1);
  });

  it("rejects another user's, completed, and missing workouts", async () => {
    const storage = new MemoryStorage();
    const repository = new WebPreviewLocalWorkoutRepository(storage);
    const owned = workout("user-a", "workout-a");
    await repository.create(owned);

    await expect(updateActiveWorkoutNote(repository, "user-b", {
      workoutId: owned.id,
      notes: "Stolen",
    })).rejects.toThrow("active workout note could not be saved");
    await repository.update({ ...owned, status: "completed", completedAt: secondUpdate });
    await expect(updateActiveWorkoutNote(repository, "user-a", {
      workoutId: owned.id,
      notes: "Late edit",
    })).rejects.toThrow("active workout note could not be saved");
    await expect(updateActiveWorkoutNote(repository, "user-a", {
      workoutId: "missing",
      notes: "Missing",
    })).rejects.toThrow("active workout note could not be saved");
  });
});
