import { DatabaseSync } from "node:sqlite";

import {
  configureLocalDatabase,
  SQLiteLocalExerciseRepository,
  SQLiteLocalRecommendationRepository,
  SQLiteLocalSetRepository,
  SQLiteLocalTemplateRepository,
  SQLiteLocalWorkoutRepository,
} from "@/db";
import type {
  Exercise,
  ProgressionRecommendation,
  Workout,
  WorkoutSet,
  WorkoutTemplate,
} from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const time = "2026-08-29T12:00:00.000Z";

function createDatabase() {
  return new NodeSQLiteConnection(new DatabaseSync(":memory:"));
}

function makeWorkout(userId = "user-a"): Workout {
  return {
    id: "workout-1", userId, name: "Session", status: "active", startedAt: time,
    notes: "Workout note", createdAt: time, updatedAt: time,
    exercises: [{
      id: "workout-exercise-1", userId, workoutId: "workout-1", exerciseId: "exercise-1",
      position: 0, notes: "Exercise note", createdAt: time, updatedAt: time,
      sets: [{
        id: "set-1", userId, workoutId: "workout-1", workoutExerciseId: "workout-exercise-1",
        exerciseId: "exercise-1", position: 0, setType: "working", weightKg: 80,
        reps: 8, rpe: 8, notes: "Set note", completedAt: time, createdAt: time, updatedAt: time,
      }],
    }],
  };
}

describe("SQLite local repositories", () => {
  it("persists workout aggregates and enforces ownership on reads, updates, and deletes", async () => {
    const db = createDatabase();
    await configureLocalDatabase(db);
    const repository = new SQLiteLocalWorkoutRepository(db);
    const workout = makeWorkout();
    await repository.create(workout);

    expect(await repository.getById("user-a", workout.id)).toEqual(workout);
    expect(await repository.getActiveForUser("user-a")).toEqual(workout);
    expect(await repository.getById("user-b", workout.id)).toBeNull();
    await repository.update({ ...workout, userId: "user-b", notes: "stolen", exercises: [] });
    expect((await repository.getById("user-a", workout.id))?.notes).toBe("Workout note");
    await repository.update({ ...workout, userId: "user-b", exercises: workout.exercises.map((exercise) => ({ ...exercise, id: "foreign-child", userId: "user-b", sets: [] })) });
    await expect(db.getFirstAsync("SELECT id FROM local_workout_exercises WHERE id='foreign-child';")).resolves.toBeNull();
    await repository.delete("user-b", workout.id);
    expect(await repository.getById("user-a", workout.id)).not.toBeNull();
    await repository.update({ ...workout, notes: "Updated note" });
    expect((await repository.getById("user-a", workout.id))?.notes).toBe("Updated note");
    await repository.delete("user-a", workout.id);
    expect(await repository.getById("user-a", workout.id)).toBeNull();
    db.close();
  });

  it("persists, orders, updates, and safely deletes sets with canonical fields", async () => {
    const db = createDatabase();
    await configureLocalDatabase(db);
    const workouts = new SQLiteLocalWorkoutRepository(db);
    await workouts.create(makeWorkout());
    const repository = new SQLiteLocalSetRepository(db);
    const existing = (await workouts.getById("user-a", "workout-1"))!.exercises[0].sets[0];
    const second: WorkoutSet = { ...existing, id: "set-2", position: 1, weightKg: 82.5, rpe: 9, notes: "Second" };
    await repository.create(second);
    expect((await repository.getForWorkoutExercise("user-a", "workout-exercise-1")).map((set) => set.id)).toEqual(["set-1", "set-2"]);
    expect(await repository.getById("user-b", second.id)).toBeNull();
    await expect(repository.update({ ...second, userId: "user-b", notes: "stolen" })).rejects.toThrow("ancestry is not accessible");
    expect((await repository.getById("user-a", second.id))?.notes).toBe("Second");
    await repository.deleteOrTombstone("user-b", second.id);
    expect(await repository.getById("user-a", second.id)).not.toBeNull();
    await repository.update({ ...second, notes: "Updated", weightKg: 85, rpe: 8.5 });
    expect(await repository.getById("user-a", second.id)).toMatchObject({ notes: "Updated", weightKg: 85, rpe: 8.5 });
    await repository.deleteOrTombstone("user-a", second.id);
    expect(await repository.getById("user-a", second.id)).toBeNull();
    db.close();
  });

  it("persists ordered templates, archives by owner, and replaces children atomically", async () => {
    const db = createDatabase();
    await configureLocalDatabase(db);
    const repository = new SQLiteLocalTemplateRepository(db);
    const template: WorkoutTemplate = {
      id: "template-1", userId: "user-a", name: "Template", notes: "Offline",
      isArchived: false, createdAt: time, updatedAt: time,
      exercises: [1, 0].map((position) => ({ id: `template-exercise-${position}`, userId: "user-a", templateId: "template-1", exerciseId: `exercise-${position}`, position, targetSets: 3, targetMinReps: 8, targetMaxReps: 12, createdAt: time, updatedAt: time })),
    };
    await repository.create(template);
    expect((await repository.getById("user-a", template.id))?.exercises.map((item) => item.position)).toEqual([0, 1]);
    expect(await repository.getById("user-b", template.id)).toBeNull();
    await repository.archive("user-b", template.id);
    expect((await repository.getById("user-a", template.id))?.isArchived).toBe(false);
    await repository.update({ ...template, userId: "user-b", exercises: template.exercises.map((exercise) => ({ ...exercise, id: "foreign-template-child", userId: "user-b" })) });
    await expect(db.getFirstAsync("SELECT id FROM local_workout_template_exercises WHERE id='foreign-template-child';")).resolves.toBeNull();
    await repository.update({ ...template, notes: "Changed", exercises: [template.exercises[1]] });
    expect(await repository.getById("user-a", template.id)).toMatchObject({ notes: "Changed", exercises: [template.exercises[1]] });
    await repository.archive("user-a", template.id);
    expect((await repository.getById("user-a", template.id))?.isArchived).toBe(true);
    expect(await repository.listForUser("user-b")).toEqual([]);
    db.close();
  });

  it("exposes system exercises globally while isolating custom exercises and archives", async () => {
    const db = createDatabase();
    await configureLocalDatabase(db);
    const repository = new SQLiteLocalExerciseRepository(db);
    const system: Exercise = { id: "system-1", name: "Bench Press", primaryMuscleGroup: "chest", secondaryMuscleGroups: ["triceps"], equipmentType: "barbell", measurementType: "weight_reps", isSystem: true, isArchived: false, createdAt: time, updatedAt: time };
    const custom: Exercise = { ...system, id: "custom-1", ownerUserId: "user-a", name: "My Press", isSystem: false };
    await repository.upsert(system);
    await repository.upsert(custom);
    expect(await repository.getById("user-b", system.id)).toEqual(system);
    expect(await repository.getById("user-b", custom.id)).toBeNull();
    expect((await repository.listAccessible("user-a")).map((item) => item.id)).toEqual([system.id, custom.id]);
    expect((await repository.search("user-a", "press")).map((item) => item.id)).toEqual([system.id, custom.id]);
    await repository.archiveCustomExercise("user-b", custom.id);
    expect((await repository.getById("user-a", custom.id))?.isArchived).toBe(false);
    await repository.archiveCustomExercise("user-a", custom.id);
    expect((await repository.getById("user-a", custom.id))?.isArchived).toBe(true);
    db.close();
  });

  it("persists structured recommendations and scopes lifecycle mutations by user", async () => {
    const db = createDatabase();
    await configureLocalDatabase(db);
    const repository = new SQLiteLocalRecommendationRepository(db);
    const recommendation: ProgressionRecommendation = { id: "recommendation-1", userId: "user-a", exerciseId: "exercise-1", recommendationType: "increase_reps", recommendedWeightKg: 80, targetSets: 3, targetMinReps: 8, targetMaxReps: 10, targetSetReps: [10, 9, 8], confidence: "high", reasonCodes: ["TOTAL_REPS_IMPROVED"], status: "active", engineVersion: "v1", createdAt: time, updatedAt: time };
    await repository.upsert(recommendation);
    expect(await repository.getActiveForExercise("user-a", "exercise-1")).toEqual(recommendation);
    expect(await repository.getById("user-b", recommendation.id)).toBeNull();
    await repository.markConsumed("user-b", recommendation.id, time);
    expect((await repository.getById("user-a", recommendation.id))?.status).toBe("active");
    await repository.supersede("user-b", recommendation.id);
    expect((await repository.getById("user-a", recommendation.id))?.status).toBe("active");
    await repository.markConsumed("user-a", recommendation.id, time);
    expect(await repository.getById("user-a", recommendation.id)).toMatchObject({ status: "consumed", consumedAt: time, targetSetReps: [10, 9, 8] });
    db.close();
  });
});
