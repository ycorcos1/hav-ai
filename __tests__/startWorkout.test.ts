import { DatabaseSync } from "node:sqlite";

import {
  configureLocalDatabase,
  SQLiteLocalRecommendationRepository,
  SQLiteLocalTemplateRepository,
  SQLiteLocalWorkoutRepository,
} from "@/db";
import type { LocalWorkoutRepository } from "@/db/repositories";
import { WebPreviewLocalRecommendationRepository } from "@/db/webPreview/WebPreviewLocalRecommendationRepository";
import { WebPreviewLocalTemplateRepository } from "@/db/webPreview/WebPreviewLocalTemplateRepository";
import { WebPreviewLocalWorkoutRepository } from "@/db/webPreview/WebPreviewLocalWorkoutRepository";
import type { WebPreviewStorage } from "@/db/webPreview/storage";
import { readWorkoutWebPreviewState } from "@/db/webPreview/workoutStorage";
import { StartWorkoutService } from "@/features/workouts/services/startWorkout";
import type { ProgressionRecommendation, Workout, WorkoutTemplate } from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const now = "2026-08-31T21:00:00.000Z";
const userId = "user-a";
const template: WorkoutTemplate = {
  id: "template-1", userId, name: "Push", notes: "Template note", isArchived: false,
  exercises: [
    { id: "template-child-2", userId, templateId: "template-1", exerciseId: "exercise-2", position: 1, targetSets: 4, targetMinReps: 10, targetMaxReps: 12, notes: "Template exercise note", createdAt: now, updatedAt: now },
    { id: "template-child-1", userId, templateId: "template-1", exerciseId: "exercise-1", position: 0, targetSets: 3, targetMinReps: 6, targetMaxReps: 8, createdAt: now, updatedAt: now },
  ],
  createdAt: now, updatedAt: now,
};
const recommendation: ProgressionRecommendation = {
  id: "recommendation-1", userId, exerciseId: "exercise-1", recommendationType: "increase_weight",
  recommendedWeightKg: 82.5, targetSets: 3, targetMinReps: 6, targetMaxReps: 7,
  confidence: "high", reasonCodes: ["TOP_OF_REP_RANGE_REACHED"], status: "active",
  engineVersion: "v1", createdAt: now, updatedAt: now,
};

class MemoryStorage implements WebPreviewStorage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("StartWorkoutService", () => {
  it("creates an independent ordered snapshot with fresh IDs and active recommendation targets", async () => {
    const source = structuredClone(template);
    let storedWorkout: Workout | undefined;
    const workoutRepository: LocalWorkoutRepository = {
      getById: async () => storedWorkout ?? null,
      getActiveForUser: async () => storedWorkout ?? null,
      create: async (workout) => { storedWorkout = structuredClone(workout); },
      update: async (workout) => { storedWorkout = structuredClone(workout); },
      delete: async () => { storedWorkout = undefined; },
    };
    const service = new StartWorkoutService({
      templateRepository: { getById: async () => source } as never,
      recommendationRepository: {
        getActiveForExercise: async (_owner: string, exerciseId: string) => exerciseId === "exercise-1" ? recommendation : null,
      } as never,
      workoutRepository,
    });

    const workout = await service.startFromTemplate(userId, template.id, now);

    expect(workout).toEqual(storedWorkout);
    expect(workout.id).not.toBe(source.id);
    expect(workout).toMatchObject({ userId, sourceTemplateId: source.id, name: "Push", status: "active", startedAt: now });
    expect(workout.exercises.map(({ exerciseId, position }) => ({ exerciseId, position }))).toEqual([
      { exerciseId: "exercise-1", position: 0 },
      { exerciseId: "exercise-2", position: 1 },
    ]);
    expect(workout.exercises[0]).toMatchObject({
      targetSets: 3, targetMinReps: 6, targetMaxReps: 7, targetWeightKg: 82.5,
      sourceRecommendationId: recommendation.id,
    });
    expect(workout.exercises[1]).toMatchObject({ targetSets: 4, targetMinReps: 10, targetMaxReps: 12 });
    expect(workout.exercises.map(({ id }) => id)).not.toEqual(source.exercises.map(({ id }) => id));
    expect(workout.exercises.every((item) => item.userId === userId && item.workoutId === workout.id)).toBe(true);
    expect(workout.exercises.every((item) => item.notes === undefined && item.sets.length === 0)).toBe(true);

    source.name = "Changed template";
    source.exercises[1].targetSets = 9;
    expect(storedWorkout?.name).toBe("Push");
    expect(storedWorkout?.exercises.map((item) => ({
      exerciseId: item.exerciseId,
      position: item.position,
      targetSets: item.targetSets,
      targetMinReps: item.targetMinReps,
      targetMaxReps: item.targetMaxReps,
      targetWeightKg: item.targetWeightKg,
      sourceRecommendationId: item.sourceRecommendationId,
    }))).toEqual([
      {
        exerciseId: "exercise-1",
        position: 0,
        targetSets: 3,
        targetMinReps: 6,
        targetMaxReps: 7,
        targetWeightKg: 82.5,
        sourceRecommendationId: recommendation.id,
      },
      {
        exerciseId: "exercise-2",
        position: 1,
        targetSets: 4,
        targetMinReps: 10,
        targetMaxReps: 12,
        targetWeightKg: undefined,
        sourceRecommendationId: undefined,
      },
    ]);
  });

  it("persists and queues the complete native snapshot atomically while consuming recommendations", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    await configureLocalDatabase(database);
    const templates = new SQLiteLocalTemplateRepository(database);
    const recommendations = new SQLiteLocalRecommendationRepository(database);
    const workouts = new SQLiteLocalWorkoutRepository(database);
    await templates.create(structuredClone(template));
    await recommendations.upsert(recommendation);

    const workout = await new StartWorkoutService({
      templateRepository: templates,
      recommendationRepository: recommendations,
      workoutRepository: workouts,
    }).startFromTemplate(userId, template.id, now);
    const reloaded = await new SQLiteLocalWorkoutRepository(database).getById(userId, workout.id);
    expect(reloaded).toEqual(workout);
    expect(await recommendations.getById(userId, recommendation.id)).toMatchObject({ status: "consumed", consumedAt: now });
    await expect(database.getAllAsync<{ entity_type: string; entity_id: string }>(
      "SELECT entity_type, entity_id FROM sync_queue ORDER BY entity_type, entity_id;",
    )).resolves.toEqual([
      { entity_type: "progression_recommendation", entity_id: recommendation.id },
      { entity_type: "workout", entity_id: workout.id },
      ...workout.exercises
        .map(({ id }) => ({ entity_type: "workout_exercise", entity_id: id }))
        .sort((left, right) => left.entity_id.localeCompare(right.entity_id)),
    ]);
    database.close();
  });

  it("rolls back native workout and queue rows if a recommendation snapshot is invalid", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    await configureLocalDatabase(database);
    const templates = new SQLiteLocalTemplateRepository(database);
    await templates.create(structuredClone(template));
    const workouts = new SQLiteLocalWorkoutRepository(database);
    await expect(new StartWorkoutService({
      templateRepository: templates,
      recommendationRepository: { getActiveForExercise: async () => recommendation } as never,
      workoutRepository: workouts,
    }).startFromTemplate(userId, template.id, now)).rejects.toThrow("recommendation snapshot");
    await expect(database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM local_workouts;")).resolves.toEqual({ count: 0 });
    await expect(database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM sync_queue;")).resolves.toEqual({ count: 0 });
    database.close();
  });

  it("survives web-preview repository recreation without reaching SQLite", async () => {
    const storage = new MemoryStorage();
    const templates = new WebPreviewLocalTemplateRepository(storage);
    const recommendations = new WebPreviewLocalRecommendationRepository(storage);
    await templates.create(structuredClone(template));
    await recommendations.upsert(recommendation);
    const workout = await new StartWorkoutService({
      templateRepository: templates,
      recommendationRepository: recommendations,
      workoutRepository: new WebPreviewLocalWorkoutRepository(storage),
    }).startFromTemplate(userId, template.id, now);

    expect(await new WebPreviewLocalWorkoutRepository(storage).getById(userId, workout.id)).toEqual(workout);
    expect(await new WebPreviewLocalRecommendationRepository(storage).getById(userId, recommendation.id)).toMatchObject({ status: "consumed" });
    expect(readWorkoutWebPreviewState(storage).queue).toHaveLength(4);
  });
});
