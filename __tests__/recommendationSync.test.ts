import { DatabaseSync } from "node:sqlite";

import {
  configureLocalDatabase,
  SQLiteLocalRecommendationRepository,
  SQLiteLocalSyncEntityStore,
  SQLiteLocalWorkoutRepository,
  SQLiteSyncDependencyResolver,
  SQLiteSyncQueueRepository,
} from "@/db";
import {
  PushSyncEngine,
  SyncEngineLock,
  type RemoteSyncGateway,
  type SyncMutation,
} from "@/features/sync/services";
import type {
  ProgressionRecommendation,
  RemoteMutationResult,
  Workout,
} from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const userId = "a0000000-0000-4000-8000-00000000000a";
const createdAt = "2026-09-16T15:00:00.000Z";
const editedAt = "2026-09-16T15:05:00.000Z";
const consumedAt = "2026-09-16T15:10:00.000Z";
const serverTime = "2026-09-16T15:15:00.000Z";
const workout: Workout = {
  id: "workout-source",
  userId,
  name: "Source Workout",
  status: "completed",
  startedAt: createdAt,
  completedAt: editedAt,
  exercises: [{
    id: "workout-exercise-source",
    userId,
    workoutId: "workout-source",
    exerciseId: "system-exercise",
    position: 0,
    sets: [],
    createdAt,
    updatedAt: createdAt,
  }],
  createdAt,
  updatedAt: editedAt,
};
const recommendation: ProgressionRecommendation = {
  id: "recommendation-a",
  userId,
  exerciseId: "system-exercise",
  sourceWorkoutId: workout.id,
  sourceWorkoutExerciseId: workout.exercises[0].id,
  recommendationType: "increase_reps",
  recommendedWeightKg: 82.5,
  targetSets: 3,
  targetMinReps: 8,
  targetMaxReps: 10,
  targetSetReps: [10, 9, 8],
  confidence: "high",
  reasonCodes: ["TOTAL_REPS_IMPROVED"],
  status: "active",
  engineVersion: "progression-v1",
  createdAt,
  updatedAt: editedAt,
};

describe("progression recommendation synchronization", () => {
  it("queues full offline semantics and converges after concrete source history", async () => {
    const database = await openDatabase();
    try {
      await new SQLiteLocalWorkoutRepository(database).create(workout);
      const repository = new SQLiteLocalRecommendationRepository(database);
      await repository.upsert(recommendation);
      await repository.upsert({
        ...recommendation,
        reasonCodes: ["TOTAL_REPS_IMPROVED", "RPE_ACCEPTABLE"],
      });

      await expect(database.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) AS count FROM sync_queue
         WHERE entity_type='progression_recommendation' AND entity_id=?;`,
        recommendation.id,
      )).resolves.toEqual({ count: 1 });

      const gateway = new RecommendationMemoryGateway();
      await expect(sync(database, gateway)).resolves.toMatchObject({
        success: true,
        succeeded: 3,
        remainingQueueSize: 0,
      });
      expectBefore(gateway.calls, `workout:${workout.id}`, `progression_recommendation:${recommendation.id}`);
      expectBefore(
        gateway.calls,
        `workout_exercise:${workout.exercises[0].id}`,
        `progression_recommendation:${recommendation.id}`,
      );
      expect(gateway.recommendation).toEqual({
        ...recommendation,
        reasonCodes: ["TOTAL_REPS_IMPROVED", "RPE_ACCEPTABLE"],
      });

      await repository.markConsumed(userId, recommendation.id, consumedAt);
      await sync(database, gateway);
      expect(gateway.recommendation).toMatchObject({
        id: recommendation.id,
        status: "consumed",
        consumedAt,
      });
    } finally {
      database.close();
    }
  });

  it("keeps a newer local status mutation queued when upload confirmation races it", async () => {
    const database = await openDatabase();
    try {
      await new SQLiteLocalWorkoutRepository(database).create(workout);
      const repository = new SQLiteLocalRecommendationRepository(database);
      await repository.upsert(recommendation);
      await database.runAsync("DELETE FROM sync_queue WHERE entity_type != 'progression_recommendation';");
      const gateway: RemoteSyncGateway = {
        apply: async (mutation) => {
          expect(mutation).toMatchObject({
            entityType: "progression_recommendation",
            operation: "upsert",
            entity: { status: "active" },
          });
          await repository.markConsumed(userId, recommendation.id, consumedAt);
          return { serverUpdatedAt: serverTime };
        },
      };

      await expect(sync(database, gateway)).resolves.toMatchObject({
        success: false,
        succeeded: 0,
        remainingQueueSize: 1,
      });
      await expect(repository.getById(userId, recommendation.id)).resolves.toMatchObject({
        status: "consumed",
        consumedAt,
      });
      await expect(database.getFirstAsync<{ operation: string }>(
        "SELECT operation FROM sync_queue WHERE entity_type='progression_recommendation';",
      )).resolves.toEqual({ operation: "upsert" });
    } finally {
      database.close();
    }
  });
});

async function openDatabase(): Promise<NodeSQLiteConnection> {
  const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
  await configureLocalDatabase(database);
  return database;
}

async function sync(
  database: NodeSQLiteConnection,
  gateway: RemoteSyncGateway,
) {
  return new PushSyncEngine(
    userId,
    {
      canAttemptRequest: async () => true,
      getAuthenticatedUserId: async () => userId,
    },
    new SQLiteSyncQueueRepository(database, userId),
    new SQLiteSyncDependencyResolver(database, userId),
    new SQLiteLocalSyncEntityStore(database, userId),
    gateway,
    new SyncEngineLock(),
  ).synchronize();
}

class RecommendationMemoryGateway implements RemoteSyncGateway {
  readonly calls: string[] = [];
  recommendation: ProgressionRecommendation | undefined;

  async apply(mutation: SyncMutation): Promise<RemoteMutationResult> {
    if (mutation.operation !== "upsert") {
      throw new Error("Unexpected delete mutation.");
    }
    this.calls.push(`${mutation.entityType}:${mutation.entity.id}`);
    if (mutation.entityType === "progression_recommendation") {
      this.recommendation = structuredClone(mutation.entity);
    }
    return { serverUpdatedAt: serverTime };
  }
}

function expectBefore(calls: string[], earlier: string, later: string): void {
  expect(calls.indexOf(earlier)).toBeGreaterThanOrEqual(0);
  expect(calls.indexOf(earlier)).toBeLessThan(calls.indexOf(later));
}
