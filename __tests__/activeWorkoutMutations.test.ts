import { DatabaseSync } from "node:sqlite";

import {
  configureLocalDatabase,
  SQLiteLocalExerciseRepository,
  SQLiteLocalWorkoutRepository,
} from "@/db";
import { ActiveWorkoutMutationService } from "@/features/workouts/services/activeWorkoutMutations";
import type { Exercise, Workout } from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const userId = "user-a";
const time = "2026-09-21T12:00:00.000Z";
const changedAt = "2026-09-21T13:00:00.000Z";

describe("active workout structure mutations", () => {
  it("adds a normal library exercise to only the active session", async () => {
    const fixture = await setup();
    const result = await fixture.service.addExercise(userId, "workout-1", "exercise-3");

    expect(result.exercises).toHaveLength(3);
    expect(result.exercises[2]).toMatchObject({
      exerciseId: "exercise-3",
      id: "added-exercise",
      position: 2,
      sets: [],
      workoutId: "workout-1",
    });
    expect((await fixture.workouts.getById(userId, "workout-1"))?.exercises)
      .toEqual(result.exercises);
    await expect(fixture.database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM sync_queue WHERE user_id=? AND entity_type='workout_exercise' AND entity_id='added-exercise';",
      userId,
    )).resolves.toEqual({ count: 1 });
    fixture.database.close();
  });

  it("reorders exercises atomically with stable contiguous session positions", async () => {
    const fixture = await setup();
    const result = await fixture.service.moveExercise(
      userId,
      "workout-1",
      "workout-exercise-2",
      "up",
    );

    expect(result.exercises.map(({ id, position }) => ({ id, position }))).toEqual([
      { id: "workout-exercise-2", position: 0 },
      { id: "workout-exercise-1", position: 1 },
    ]);
    expect((await fixture.workouts.getById(userId, "workout-1"))?.exercises
      .map(({ id, position }) => ({ id, position }))).toEqual([
      { id: "workout-exercise-2", position: 0 },
      { id: "workout-exercise-1", position: 1 },
    ]);
    fixture.database.close();
  });

  it("hides a cloud-known removed exercise, clears child upserts, and queues one cascade delete", async () => {
    const fixture = await setup(true);
    await fixture.database.runAsync(
      "UPDATE local_workout_exercises SET sync_status='synced', server_updated_at=? WHERE id='workout-exercise-1';",
      time,
    );

    const result = await fixture.service.removeExercise(
      userId,
      "workout-1",
      "workout-exercise-1",
    );

    expect(result.exercises.map(({ id }) => id)).toEqual(["workout-exercise-2"]);
    expect((await fixture.workouts.getById(userId, "workout-1"))?.exercises.map(({ id }) => id))
      .toEqual(["workout-exercise-2"]);
    await expect(fixture.database.getFirstAsync<{ sync_status: string }>(
      "SELECT sync_status FROM local_workout_exercises WHERE id='workout-exercise-1';",
    )).resolves.toEqual({ sync_status: "pending_delete" });
    await expect(fixture.database.getAllAsync<{ entity_id: string; operation: string }>(
      `SELECT entity_id, operation FROM sync_queue
       WHERE user_id=? AND (entity_id='workout-exercise-1' OR entity_id='set-1')
       ORDER BY entity_id;`,
      userId,
    )).resolves.toEqual([{ entity_id: "workout-exercise-1", operation: "delete" }]);
    fixture.database.close();
  });
});

async function setup(withSet = false) {
  const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
  await configureLocalDatabase(database);
  const workouts = new SQLiteLocalWorkoutRepository(database);
  const exercises = new SQLiteLocalExerciseRepository(database);
  for (const id of ["exercise-1", "exercise-2", "exercise-3"]) {
    await exercises.upsert(exercise(id));
  }
  await workouts.create(workout(withSet));
  return {
    database,
    workouts,
    service: new ActiveWorkoutMutationService(
      { exerciseRepository: exercises, workoutRepository: workouts },
      () => changedAt,
      () => "added-exercise",
    ),
  };
}

function exercise(id: string): Exercise {
  return {
    id,
    name: id,
    primaryMuscleGroup: "chest",
    secondaryMuscleGroups: [],
    equipmentType: "barbell",
    measurementType: "weight_reps",
    isSystem: true,
    isArchived: false,
    createdAt: time,
    updatedAt: time,
  };
}

function workout(withSet: boolean): Workout {
  return {
    id: "workout-1",
    userId,
    name: "Session",
    status: "active",
    startedAt: time,
    exercises: ["exercise-1", "exercise-2"].map((exerciseId, position) => ({
      id: `workout-exercise-${position + 1}`,
      userId,
      workoutId: "workout-1",
      exerciseId,
      position,
      sets: withSet && position === 0 ? [{
        id: "set-1",
        userId,
        workoutId: "workout-1",
        workoutExerciseId: "workout-exercise-1",
        exerciseId,
        position: 0,
        setType: "working" as const,
        reps: 8,
        completedAt: time,
        createdAt: time,
        updatedAt: time,
      }] : [],
      createdAt: time,
      updatedAt: time,
    })),
    createdAt: time,
    updatedAt: time,
  };
}
