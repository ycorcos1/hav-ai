import { DatabaseSync } from "node:sqlite";

import {
  configureLocalDatabase,
  SQLiteLocalRecommendationRepository,
  SQLiteLocalTemplateRepository,
  SQLiteLocalWorkoutRepository,
} from "@/db";
import { StartWorkoutService } from "@/features/workouts/services/startWorkout";
import type { WorkoutTemplate } from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const now = "2026-08-31T22:00:00.000Z";

function template(id: string, userId: string): WorkoutTemplate {
  return {
    id, userId, name: id, isArchived: false, createdAt: now, updatedAt: now,
    exercises: [{
      id: `${id}-child`, userId, templateId: id, exerciseId: "exercise-1", position: 0,
      targetSets: 3, targetMinReps: 6, targetMaxReps: 8, createdAt: now, updatedAt: now,
    }],
  };
}

describe("one active workout", () => {
  it("returns canonical choices and preserves the persisted active workout across repository recreation", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    await configureLocalDatabase(database);
    const templates = new SQLiteLocalTemplateRepository(database);
    await templates.create(template("template-a", "user-a"));
    await templates.create(template("template-b", "user-a"));
    const dependencies = {
      templateRepository: templates,
      recommendationRepository: new SQLiteLocalRecommendationRepository(database),
      workoutRepository: new SQLiteLocalWorkoutRepository(database),
    };
    const first = await new StartWorkoutService(dependencies).requestStartFromTemplate("user-a", "template-a", now);
    expect(first.status).toBe("started");
    if (first.status !== "started") throw new Error("Expected the first workout to start.");

    const recreatedService = new StartWorkoutService({
      ...dependencies,
      workoutRepository: new SQLiteLocalWorkoutRepository(database),
    });
    const second = await recreatedService.requestStartFromTemplate("user-a", "template-b", now);
    expect(second).toEqual({
      status: "active_workout_exists",
      activeWorkout: first.workout,
      requestedTemplateId: "template-b",
      options: ["resume", "discard", "cancel"],
    });
    expect(await dependencies.workoutRepository.getById("user-a", first.workout.id)).toEqual(first.workout);
    database.close();
  });

  it("scopes active workouts by owner and permits a new start only after explicit discard", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    await configureLocalDatabase(database);
    const templates = new SQLiteLocalTemplateRepository(database);
    await templates.create(template("template-a", "user-a"));
    await templates.create(template("template-b", "user-a"));
    await templates.create(template("template-other", "user-b"));
    const dependencies = {
      templateRepository: templates,
      recommendationRepository: new SQLiteLocalRecommendationRepository(database),
      workoutRepository: new SQLiteLocalWorkoutRepository(database),
    };
    const service = new StartWorkoutService(dependencies);
    const first = await service.requestStartFromTemplate("user-a", "template-a", now);
    const otherUser = await service.requestStartFromTemplate("user-b", "template-other", now);
    expect(first.status).toBe("started");
    expect(otherUser.status).toBe("started");
    if (first.status !== "started") throw new Error("Expected the first workout to start.");

    await service.discardActiveWorkout("user-a", first.workout.id, "2026-08-31T22:05:00.000Z");
    expect(await dependencies.workoutRepository.getById("user-a", first.workout.id)).toMatchObject({ status: "discarded" });
    const replacement = await service.requestStartFromTemplate("user-a", "template-b", "2026-08-31T22:06:00.000Z");
    expect(replacement.status).toBe("started");
    expect((await dependencies.workoutRepository.getActiveForUser("user-b"))?.id).toBe(
      otherUser.status === "started" ? otherUser.workout.id : undefined,
    );
    database.close();
  });
});
