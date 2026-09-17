import { DatabaseSync } from "node:sqlite";

import {
  configureLocalDatabase,
  SQLiteExerciseHistoryRepository,
  SQLiteLocalWorkoutRepository,
} from "@/db";
import { WebPreviewExerciseHistoryRepository } from "@/db/webPreview/WebPreviewExerciseHistoryRepository";
import { WebPreviewLocalWorkoutRepository } from "@/db/webPreview/WebPreviewLocalWorkoutRepository";
import type { WebPreviewStorage } from "@/db/webPreview/storage";
import { readWorkoutWebPreviewState } from "@/db/webPreview/workoutStorage";
import {
  FinishWorkoutError,
  FinishWorkoutService,
} from "@/features/workouts/services/finishWorkout";
import type { ExerciseHistoryRepository, LocalWorkoutRepository } from "@/db/repositories";
import type { Workout, WorkoutSet } from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const userId = "user-a";
const startedAt = "2026-09-17T12:00:00.000Z";
const completedAt = "2026-09-17T13:04:00.000Z";

class MemoryStorage implements WebPreviewStorage {
  private readonly values = new Map<string, string>();
  get length(): number { return this.values.size; }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe("finishWorkout", () => {
  it("finishes fully offline and atomically queues the raw workout aggregate in SQLite", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    await configureLocalDatabase(database);
    const workoutRepository = new SQLiteLocalWorkoutRepository(database);
    const historyRepository = new SQLiteExerciseHistoryRepository(database);
    await workoutRepository.create(previousWorkout());
    await workoutRepository.create(activeWorkout());

    const result = await new FinishWorkoutService({
      exerciseHistoryRepository: historyRepository,
      workoutRepository,
    }).finish(userId, { workoutId: "workout-current", completedAt });

    expect(result.workout).toMatchObject({ status: "completed", completedAt, updatedAt: completedAt });
    expect(result.summary).toMatchObject({
      durationSeconds: 3840,
      exerciseCount: 1,
      workingSetCount: 2,
      exerciseSummaries: [{ totalReps: 17, previousTotalReps: 13, repDelta: 4 }],
    });
    expect(result.personalRecords.map(({ type }) => type)).toEqual([
      "max_weight",
      "estimated_1rm",
      "rep_pr",
    ]);
    expect(result.recommendations).toEqual([]);
    await expect(workoutRepository.getActiveForUser(userId)).resolves.toBeNull();
    await expect(database.getFirstAsync<{ operation: string }>(
      `SELECT operation FROM sync_queue
       WHERE user_id=? AND entity_type='workout' AND entity_id='workout-current';`,
      userId,
    )).resolves.toEqual({ operation: "upsert" });
    await expect(database.getFirstAsync<{ operation: string }>(
      `SELECT operation FROM sync_queue
       WHERE user_id=? AND entity_type='workout_exercise' AND entity_id='workout-exercise-current';`,
      userId,
    )).resolves.toEqual({ operation: "upsert" });
    database.close();
  });

  it("rolls back completion when the local queue transaction fails", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    await configureLocalDatabase(database);
    const workoutRepository = new SQLiteLocalWorkoutRepository(database);
    await workoutRepository.create(activeWorkout());
    await database.execAsync(`
      CREATE TRIGGER fail_workout_queue_update
      BEFORE UPDATE ON sync_queue
      WHEN NEW.entity_type='workout' AND NEW.entity_id='workout-current'
      BEGIN
        SELECT RAISE(ABORT, 'queue failed');
      END;
    `);
    const service = new FinishWorkoutService({
      exerciseHistoryRepository: new SQLiteExerciseHistoryRepository(database),
      workoutRepository,
    });

    await expect(service.finish(userId, { workoutId: "workout-current", completedAt }))
      .rejects.toEqual(new FinishWorkoutError("The workout could not be finished."));
    await expect(workoutRepository.getById(userId, "workout-current"))
      .resolves.toMatchObject({ status: "active", completedAt: undefined });
    database.close();
  });

  it("preserves the same completion and queue semantics in the isolated web preview", async () => {
    const storage = new MemoryStorage();
    const workoutRepository = new WebPreviewLocalWorkoutRepository(storage);
    await workoutRepository.create(previousWorkout());
    await workoutRepository.create(activeWorkout());
    const service = new FinishWorkoutService({
      exerciseHistoryRepository: new WebPreviewExerciseHistoryRepository(storage),
      workoutRepository,
    });

    await expect(service.finish(userId, { workoutId: "workout-current", completedAt }))
      .resolves.toMatchObject({ workout: { status: "completed" } });
    const state = readWorkoutWebPreviewState(storage);
    expect(state.workouts.find(({ id }) => id === "workout-current")).toMatchObject({
      status: "completed",
      completedAt,
    });
    expect(state.queue).toEqual(expect.arrayContaining([
      expect.objectContaining({ entityType: "workout", entityId: "workout-current" }),
      expect.objectContaining({
        entityType: "workout_exercise",
        entityId: "workout-exercise-current",
      }),
    ]));
  });

  it("rejects missing, foreign, completed, invalid-time, and duplicate in-flight finishes", async () => {
    let resolveFinish: (() => void) | undefined;
    const repository: jest.Mocked<LocalWorkoutRepository> = {
      getById: jest.fn().mockResolvedValue(activeWorkout()),
      getActiveForUser: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      finish: jest.fn((_workout: Workout) => new Promise<void>((resolve) => {
        resolveFinish = resolve;
      })),
      delete: jest.fn(),
    };
    const history: jest.Mocked<ExerciseHistoryRepository> = {
      getBestSet: jest.fn(),
      getRecentSessions: jest.fn(),
      getCompletedSetsForExercises: jest.fn().mockResolvedValue([]),
    };
    const service = new FinishWorkoutService({
      exerciseHistoryRepository: history,
      workoutRepository: repository,
    });
    const first = service.finish(userId, { workoutId: "workout-current", completedAt });
    await Promise.resolve();
    await expect(service.finish(userId, { workoutId: "workout-current", completedAt }))
      .rejects.toBeInstanceOf(FinishWorkoutError);
    resolveFinish?.();
    await expect(first).resolves.toMatchObject({ workout: { status: "completed" } });

    repository.getById.mockResolvedValue(null);
    await expect(service.finish(userId, { workoutId: "missing", completedAt }))
      .rejects.toBeInstanceOf(FinishWorkoutError);
    repository.getById.mockResolvedValue({ ...activeWorkout(), status: "completed", completedAt });
    await expect(service.finish(userId, { workoutId: "workout-current", completedAt }))
      .rejects.toBeInstanceOf(FinishWorkoutError);
    repository.getById.mockResolvedValue(activeWorkout());
    await expect(service.finish(userId, {
      workoutId: "workout-current",
      completedAt: "2026-09-17T11:00:00.000Z",
    })).rejects.toBeInstanceOf(FinishWorkoutError);
    expect(repository.finish).toHaveBeenCalledTimes(1);
  });
});

function activeWorkout(): Workout {
  return workout("workout-current", "active", [
    set("current-1", "workout-current", "workout-exercise-current", 82.5, 8, completedAt),
    set("current-2", "workout-current", "workout-exercise-current", 82.5, 9, completedAt),
  ]);
}

function previousWorkout(): Workout {
  const previousCompletedAt = "2026-09-10T13:00:00.000Z";
  return workout("workout-previous", "completed", [
    set("previous-1", "workout-previous", "workout-exercise-previous", 80, 7, previousCompletedAt),
    set("previous-2", "workout-previous", "workout-exercise-previous", 80, 6, previousCompletedAt),
  ], previousCompletedAt);
}

function workout(
  id: string,
  status: Workout["status"],
  sets: WorkoutSet[],
  workoutCompletedAt?: string,
): Workout {
  const workoutExerciseId = id === "workout-current"
    ? "workout-exercise-current"
    : "workout-exercise-previous";
  return {
    id,
    userId,
    name: "Push",
    status,
    startedAt,
    ...(workoutCompletedAt === undefined ? {} : { completedAt: workoutCompletedAt }),
    exercises: [{
      id: workoutExerciseId,
      userId,
      workoutId: id,
      exerciseId: "exercise-a",
      position: 0,
      targetSets: 2,
      targetMinReps: 6,
      targetMaxReps: 10,
      sets,
      createdAt: startedAt,
      updatedAt: workoutCompletedAt ?? startedAt,
    }],
    createdAt: startedAt,
    updatedAt: workoutCompletedAt ?? startedAt,
  };
}

function set(
  id: string,
  setWorkoutId: string,
  workoutExerciseId: string,
  weightKg: number,
  reps: number,
  timestamp: string,
): WorkoutSet {
  return {
    id,
    userId,
    workoutId: setWorkoutId,
    workoutExerciseId,
    exerciseId: "exercise-a",
    position: id.endsWith("2") ? 1 : 0,
    setType: "working",
    weightKg,
    reps,
    completedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
