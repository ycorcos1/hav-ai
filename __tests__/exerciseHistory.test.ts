import { DatabaseSync } from "node:sqlite";

import {
  configureLocalDatabase,
  SQLiteExerciseHistoryRepository,
  SQLiteLocalWorkoutRepository,
} from "@/db";
import { WebPreviewExerciseHistoryRepository } from "@/db/webPreview/WebPreviewExerciseHistoryRepository";
import { WebPreviewLocalWorkoutRepository } from "@/db/webPreview/WebPreviewLocalWorkoutRepository";
import type { WebPreviewStorage } from "@/db/webPreview/storage";
import type { Workout, WorkoutSet } from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const time = "2026-09-01T12:00:00.000Z";

class MemoryStorage implements WebPreviewStorage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function set(id: string, workoutId: string, setType: "working" | "warmup", reps: number): WorkoutSet {
  return {
    id,
    userId: "user-a",
    workoutId,
    workoutExerciseId: `${workoutId}-exercise`,
    exerciseId: "exercise-1",
    position: setType === "warmup" ? 0 : 1,
    setType,
    weightKg: setType === "warmup" ? 40 : 80,
    reps,
    completedAt: time,
    createdAt: time,
    updatedAt: time,
  };
}

function workout(id: string, status: "active" | "completed", completedAt?: string): Workout {
  return {
    id,
    userId: "user-a",
    name: id,
    status,
    startedAt: time,
    ...(completedAt ? { completedAt } : {}),
    exercises: [{
      id: `${id}-exercise`,
      userId: "user-a",
      workoutId: id,
      exerciseId: "exercise-1",
      position: 0,
      sets: [set(`${id}-warmup`, id, "warmup", 10), set(`${id}-working`, id, "working", 8)],
      createdAt: time,
      updatedAt: time,
    }],
    createdAt: time,
    updatedAt: time,
  };
}

describe.each([
  ["SQLite", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    await configureLocalDatabase(database);
    return {
      history: new SQLiteExerciseHistoryRepository(database),
      workouts: new SQLiteLocalWorkoutRepository(database),
      close: (): void => database.close(),
    };
  }],
  ["web preview", async () => {
    const storage = new MemoryStorage();
    return {
      history: new WebPreviewExerciseHistoryRepository(storage),
      workouts: new WebPreviewLocalWorkoutRepository(storage),
      close: (): void => undefined,
    };
  }],
])("%s exercise history", (_label, createRepositories) => {
  it("returns the latest completed comparable working sets and excludes the active workout", async () => {
    const { close, history, workouts } = await createRepositories();
    const older = workout("older", "active");
    await workouts.create(older);
    await workouts.update({ ...older, status: "completed", completedAt: "2026-09-01T12:30:00.000Z" });
    const newer = workout("newer", "active");
    await workouts.create(newer);
    await workouts.update({ ...newer, status: "completed", completedAt: "2026-09-02T12:30:00.000Z" });
    await workouts.create(workout("current", "active"));

    await expect(history.getRecentSessions({
      userId: "user-a",
      exerciseId: "exercise-1",
      limit: 1,
    })).resolves.toEqual([{
      workoutId: "newer",
      completedAt: "2026-09-02T12:30:00.000Z",
      sets: [{ weightKg: 80, reps: 8 }],
    }]);
    await expect(history.getRecentSessions({
      userId: "other-user",
      exerciseId: "exercise-1",
      limit: 1,
    })).resolves.toEqual([]);
    close();
  });
});
