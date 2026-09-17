import { DatabaseSync } from "node:sqlite";

import {
  configureLocalDatabase,
  SQLiteLocalExerciseRepository,
  SQLiteLocalSyncEntityStore,
  SQLiteLocalUserExercisePreferenceRepository,
  SQLiteSyncDependencyResolver,
  SQLiteSyncQueueRepository,
} from "@/db";
import {
  PushSyncEngine,
  SyncEngineLock,
  SyncRemoteError,
  type RemoteSyncGateway,
  type SyncMutation,
} from "@/features/sync/services";
import type {
  Exercise,
  RemoteMutationResult,
  UserExercisePreference,
} from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const userId = "a0000000-0000-4000-8000-00000000000a";
const timestamp = "2026-09-16T12:00:00.000Z";
const later = "2026-09-16T13:00:00.000Z";

describe("user exercise preference synchronization", () => {
  it("coalesces offline create/edit, uploads complete semantics, and confirms local state", async () => {
    const database = await openDatabase();
    try {
      const repository = new SQLiteLocalUserExercisePreferenceRepository(database);
      await repository.upsert(preference());
      await repository.upsert({
        ...preference(),
        isFavorite: false,
        notes: "Latest note",
        restDurationSeconds: 180,
        updatedAt: later,
      });
      await expect(queue(database)).resolves.toEqual([expect.objectContaining({
        entity_type: "user_exercise_preference",
        entity_id: "preference-a",
        operation: "upsert",
      })]);

      const gateway = new PreferenceMemoryGateway();
      await expect(sync(database, gateway)).resolves.toMatchObject({
        success: true,
        succeeded: 1,
        remainingQueueSize: 0,
      });
      expect(gateway.preferences.get("preference-a")).toMatchObject({
        isFavorite: false,
        notes: "Latest note",
        restDurationSeconds: 180,
      });
      await expect(database.getFirstAsync<{ sync_status: string }>(
        "SELECT sync_status FROM local_user_exercise_preferences WHERE id='preference-a';",
      )).resolves.toEqual({ sync_status: "synced" });
    } finally {
      database.close();
    }
  });

  it("tombstones cloud-known deletes and removes the tombstone after remote success", async () => {
    const database = await openDatabase();
    try {
      const repository = new SQLiteLocalUserExercisePreferenceRepository(database);
      const gateway = new PreferenceMemoryGateway();
      await repository.upsert(preference());
      await sync(database, gateway);

      await repository.deleteOrTombstone(userId, "preference-a");
      await expect(database.getFirstAsync<{ deleted_at: string | null; sync_status: string }>(
        "SELECT deleted_at, sync_status FROM local_user_exercise_preferences WHERE id='preference-a';",
      )).resolves.toEqual({ deleted_at: expect.any(String), sync_status: "pending_delete" });
      await expect(queue(database)).resolves.toEqual([expect.objectContaining({
        operation: "delete",
      })]);

      await sync(database, gateway);
      expect(gateway.preferences.has("preference-a")).toBe(false);
      await expect(database.getFirstAsync(
        "SELECT id FROM local_user_exercise_preferences WHERE id='preference-a';",
      )).resolves.toBeNull();
      await expect(queue(database)).resolves.toEqual([]);
    } finally {
      database.close();
    }
  });

  it("removes never-synced create/delete pairs without leaving queue work", async () => {
    const database = await openDatabase();
    try {
      const repository = new SQLiteLocalUserExercisePreferenceRepository(database);
      await repository.upsert(preference());
      await repository.deleteOrTombstone(userId, "preference-a");
      await expect(queue(database)).resolves.toEqual([]);
      await expect(repository.get(userId, "exercise-a")).resolves.toBeNull();
    } finally {
      database.close();
    }
  });

  it("orders custom exercise creation before its preference", async () => {
    const database = await openDatabase();
    try {
      const custom: Exercise = {
        id: "custom-a",
        ownerUserId: userId,
        name: "Custom Press",
        primaryMuscleGroup: "chest",
        secondaryMuscleGroups: [],
        equipmentType: "other",
        measurementType: "weight_reps",
        isSystem: false,
        isArchived: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await new SQLiteLocalExerciseRepository(database).upsert(custom);
      await new SQLiteLocalUserExercisePreferenceRepository(database).upsert({
        ...preference(),
        exerciseId: custom.id,
      });
      const gateway = new PreferenceMemoryGateway();

      await sync(database, gateway);
      expect(gateway.calls).toEqual([
        "custom_exercise:custom-a:upsert",
        "user_exercise_preference:preference-a:upsert",
      ]);
    } finally {
      database.close();
    }
  });

  it("converges idempotently when the server commits before a timeout", async () => {
    const database = await openDatabase();
    try {
      await new SQLiteLocalUserExercisePreferenceRepository(database).upsert(preference());
      const gateway = new PreferenceMemoryGateway(true);
      await expect(sync(database, gateway)).resolves.toMatchObject({ success: true });
      expect(gateway.preferences.size).toBe(1);
      expect(gateway.calls).toEqual([
        "user_exercise_preference:preference-a:upsert",
        "user_exercise_preference:preference-a:upsert",
      ]);
      await expect(queue(database)).resolves.toEqual([]);
    } finally {
      database.close();
    }
  });
});

async function openDatabase(): Promise<NodeSQLiteConnection> {
  const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
  await configureLocalDatabase(database);
  await new SQLiteLocalExerciseRepository(database).hydrateFromCloud(userId, {
    exercise: {
      id: "exercise-a",
      name: "Bench Press",
      primaryMuscleGroup: "chest",
      secondaryMuscleGroups: [],
      equipmentType: "barbell",
      measurementType: "weight_reps",
      isSystem: true,
      isArchived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    serverUpdatedAt: timestamp,
  });
  return database;
}

function sync(database: NodeSQLiteConnection, gateway: RemoteSyncGateway) {
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
    async () => undefined,
  ).synchronize();
}

class PreferenceMemoryGateway implements RemoteSyncGateway {
  readonly calls: string[] = [];
  readonly preferences = new Map<string, UserExercisePreference>();
  private timeoutPending: boolean;

  constructor(simulateLostAcknowledgement = false) {
    this.timeoutPending = simulateLostAcknowledgement;
  }

  async apply(mutation: SyncMutation): Promise<RemoteMutationResult> {
    const entityId = mutation.operation === "upsert" ? mutation.entity.id : mutation.entityId;
    this.calls.push(`${mutation.entityType}:${entityId}:${mutation.operation}`);
    if (mutation.entityType === "custom_exercise") return { serverUpdatedAt: later };
    if (mutation.entityType !== "user_exercise_preference") {
      throw new Error("Unexpected sync entity.");
    }
    if (mutation.operation === "delete") {
      this.preferences.delete(mutation.entityId);
      return {};
    }
    this.preferences.set(mutation.entity.id, structuredClone(mutation.entity));
    if (this.timeoutPending) {
      this.timeoutPending = false;
      throw new SyncRemoteError("timeout");
    }
    return { serverUpdatedAt: later };
  }
}

function preference(): UserExercisePreference {
  return {
    id: "preference-a",
    userId,
    exerciseId: "exercise-a",
    isFavorite: true,
    notes: "Seat position four",
    restDurationSeconds: 150,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function queue(database: NodeSQLiteConnection): Promise<object[]> {
  return database.getAllAsync(
    `SELECT entity_type, entity_id, operation FROM sync_queue
     WHERE user_id=? ORDER BY created_at, id;`,
    userId,
  );
}
