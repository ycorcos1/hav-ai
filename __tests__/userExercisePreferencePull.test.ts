import { DatabaseSync } from "node:sqlite";

import {
  configureLocalDatabase,
  SQLiteLocalExerciseRepository,
  SQLiteLocalUserExercisePreferenceRepository,
} from "@/db";
import type { CloudUserExercisePreferenceSnapshot } from "@/db/repositories";
import { UserExercisePreferencePullService } from "@/features/sync/services";
import type { RemoteUserExercisePreferenceAdapter } from "@/lib/supabase/repositories";
import type { SyncResult } from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const userId = "a0000000-0000-4000-8000-00000000000a";
const createdAt = "2026-09-16T12:00:00.000Z";
const serverUpdatedAt = "2026-09-16T13:00:00.000Z";

describe("user exercise preference pull", () => {
  it("pushes first and hydrates a complete owner-scoped snapshot without queue writes", async () => {
    const database = await openDatabase();
    try {
      const events: string[] = [];
      const remote = new RemotePreferences([snapshot("preference-a", "exercise-a")], events);
      const service = serviceFor(database, remote, events);
      const queueBefore = await queue(database);

      await expect(service.pullUpdates()).resolves.toEqual({
        hydrated: 1,
        removed: 0,
        preservedDirty: 0,
      });
      expect(events).toEqual(["push", "fetch"]);
      await expect(new SQLiteLocalUserExercisePreferenceRepository(database)
        .get(userId, "exercise-a")).resolves.toMatchObject({
        id: "preference-a",
        isFavorite: true,
        notes: "Seat position four",
        restDurationSeconds: 150,
      });
      await expect(queue(database)).resolves.toEqual(queueBefore);
    } finally {
      database.close();
    }
  });

  it("preserves dirty local state while removing clean rows absent from a full snapshot", async () => {
    const database = await openDatabase();
    try {
      const repository = new SQLiteLocalUserExercisePreferenceRepository(database);
      await repository.reconcileFromCloud(userId, [
        snapshot("preference-a", "exercise-a"),
        snapshot("preference-b", "exercise-b"),
      ]);
      await repository.upsert({
        ...snapshot("preference-a", "exercise-a").preference,
        notes: "Local dirty note",
        updatedAt: "2026-09-16T14:00:00.000Z",
      });
      const queueBefore = await queue(database);
      const remote = new RemotePreferences([], []);

      await expect(serviceFor(database, remote, []).pullUpdates()).resolves.toEqual({
        hydrated: 0,
        removed: 1,
        preservedDirty: 1,
      });
      await expect(repository.get(userId, "exercise-a")).resolves.toMatchObject({
        notes: "Local dirty note",
      });
      await expect(repository.get(userId, "exercise-b")).resolves.toBeNull();
      await expect(queue(database)).resolves.toEqual(queueBefore);
    } finally {
      database.close();
    }
  });

  it("rejects foreign snapshots and preferences whose exercise dependency is absent", async () => {
    const database = await openDatabase();
    try {
      const repository = new SQLiteLocalUserExercisePreferenceRepository(database);
      await expect(repository.reconcileFromCloud("another-user", [
        snapshot("preference-a", "exercise-a"),
      ])).rejects.toThrow("ownership");
      await expect(repository.reconcileFromCloud(userId, [
        snapshot("missing", "missing-exercise"),
      ])).rejects.toThrow("inaccessible exercise");
    } finally {
      database.close();
    }
  });
});

async function openDatabase(): Promise<NodeSQLiteConnection> {
  const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
  await configureLocalDatabase(database);
  const exercises = new SQLiteLocalExerciseRepository(database);
  await exercises.hydrateFromCloud(userId, exerciseSnapshot("exercise-a"));
  await exercises.hydrateFromCloud(userId, exerciseSnapshot("exercise-b"));
  return database;
}

function serviceFor(
  database: NodeSQLiteConnection,
  remote: RemoteUserExercisePreferenceAdapter,
  events: string[],
): UserExercisePreferencePullService {
  return new UserExercisePreferencePullService(
    userId,
    {
      synchronize: async () => {
        events.push("push");
        return successfulSyncResult;
      },
    },
    remote,
    new SQLiteLocalUserExercisePreferenceRepository(database),
  );
}

class RemotePreferences implements RemoteUserExercisePreferenceAdapter {
  constructor(
    private readonly snapshots: CloudUserExercisePreferenceSnapshot[],
    private readonly events: string[],
  ) {}

  async fetchOwnPreferences(): Promise<CloudUserExercisePreferenceSnapshot[]> {
    this.events.push("fetch");
    return this.snapshots;
  }

  async upsertOwnPreference() { return {}; }
  async deleteOwnPreference() { return undefined; }
}

function snapshot(id: string, exerciseId: string): CloudUserExercisePreferenceSnapshot {
  return {
    preference: {
      id,
      userId,
      exerciseId,
      isFavorite: true,
      notes: "Seat position four",
      restDurationSeconds: 150,
      createdAt,
      updatedAt: serverUpdatedAt,
    },
    serverUpdatedAt,
  };
}

function exerciseSnapshot(id: string) {
  return {
    exercise: {
      id,
      name: id,
      primaryMuscleGroup: "chest" as const,
      secondaryMuscleGroups: [],
      equipmentType: "barbell" as const,
      measurementType: "weight_reps" as const,
      isSystem: true,
      isArchived: false,
      createdAt,
      updatedAt: serverUpdatedAt,
    },
    serverUpdatedAt,
  };
}

function queue(database: NodeSQLiteConnection): Promise<object[]> {
  return database.getAllAsync(
    "SELECT user_id, entity_type, entity_id, operation FROM sync_queue ORDER BY entity_id;",
  );
}

const successfulSyncResult: SyncResult = {
  success: true,
  processed: 0,
  succeeded: 0,
  failed: 0,
  remainingQueueSize: 0,
  errors: [],
};
