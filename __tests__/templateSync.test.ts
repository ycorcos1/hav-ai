import { DatabaseSync } from "node:sqlite";

import {
  configureLocalDatabase,
  SQLiteLocalSyncEntityStore,
  SQLiteLocalTemplateRepository,
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
  RemoteMutationResult,
  WorkoutTemplate,
  WorkoutTemplateExercise,
} from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const userId = "a0000000-0000-4000-8000-00000000000a";
const initialTime = "2026-09-15T20:00:00.000Z";
const editedTime = "2026-09-15T20:05:00.000Z";
const serverTime = "2026-09-15T20:10:00.000Z";

describe("local template synchronization", () => {
  it("coalesces offline create/edit state and uploads only the latest UUID-preserving graph", async () => {
    const database = await openDatabase();
    try {
      const repository = new SQLiteLocalTemplateRepository(database);
      const initial = template([
        child("child-a", "exercise-a", 0, initialTime),
        child("child-b", "exercise-b", 1, initialTime),
      ], initialTime);
      await repository.create(initial);
      await repository.update({
        ...initial,
        name: "Latest Push",
        updatedAt: editedTime,
        exercises: [
          child("child-c", "exercise-c", 0, editedTime),
          child("child-a", "exercise-a", 1, editedTime),
        ],
      });

      await expect(queueRows(database)).resolves.toEqual([
        { entity_type: "workout_template", entity_id: "template-a", operation: "upsert" },
        { entity_type: "workout_template_exercise", entity_id: "child-a", operation: "upsert" },
        { entity_type: "workout_template_exercise", entity_id: "child-c", operation: "upsert" },
      ]);

      const gateway = new TemplateMemoryGateway();
      const result = await sync(database, gateway);

      expect(result).toMatchObject({ success: true, succeeded: 3, remainingQueueSize: 0 });
      expect(gateway.template).toMatchObject({ id: "template-a", name: "Latest Push" });
      expect([...gateway.children.values()]
        .sort((left, right) => left.position - right.position)
        .map(({ id, position }) => ({ id, position })))
        .toEqual([{ id: "child-c", position: 0 }, { id: "child-a", position: 1 }]);
      expect(gateway.calls[0]).toBe("workout_template:template-a:upsert");
      expect(gateway.calls).not.toContain("workout_template_exercise:child-b:delete");
    } finally {
      database.close();
    }
  });

  it("deletes only a removed cloud-known child and converges archive state", async () => {
    const database = await openDatabase();
    try {
      const repository = new SQLiteLocalTemplateRepository(database);
      const initial = template([
        child("child-a", "exercise-a", 0, initialTime),
        child("child-b", "exercise-b", 1, initialTime),
      ], initialTime);
      await repository.create(initial);
      const gateway = new TemplateMemoryGateway();
      await sync(database, gateway);

      await repository.update({
        ...initial,
        updatedAt: editedTime,
        exercises: [child("child-a", "exercise-a", 0, editedTime)],
      });
      await expect(queueRows(database)).resolves.toEqual([
        { entity_type: "workout_template", entity_id: "template-a", operation: "upsert" },
        { entity_type: "workout_template_exercise", entity_id: "child-a", operation: "upsert" },
        { entity_type: "workout_template_exercise", entity_id: "child-b", operation: "delete" },
      ]);

      await expect(sync(database, gateway)).resolves.toMatchObject({
        success: true,
        succeeded: 3,
        remainingQueueSize: 0,
      });
      expect([...gateway.children.keys()]).toEqual(["child-a"]);
      expect(gateway.calls).toContain("workout_template_exercise:child-b:delete");

      await repository.archive(userId, initial.id);
      await expect(queueRows(database)).resolves.toEqual([
        { entity_type: "workout_template", entity_id: "template-a", operation: "upsert" },
      ]);
      await sync(database, gateway);
      expect(gateway.template?.isArchived).toBe(true);
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

function template(
  exercises: WorkoutTemplateExercise[],
  updatedAt: string,
): WorkoutTemplate {
  return {
    id: "template-a",
    userId,
    name: "Push",
    notes: "Offline template",
    isArchived: false,
    exercises,
    createdAt: initialTime,
    updatedAt,
  };
}

function child(
  id: string,
  exerciseId: string,
  position: number,
  updatedAt: string,
): WorkoutTemplateExercise {
  return {
    id,
    userId,
    templateId: "template-a",
    exerciseId,
    position,
    targetSets: 3,
    targetMinReps: 8,
    targetMaxReps: 10,
    notes: `${id} notes`,
    createdAt: initialTime,
    updatedAt,
  };
}

function queueRows(database: NodeSQLiteConnection) {
  return database.getAllAsync<{
    entity_id: string;
    entity_type: string;
    operation: string;
  }>(
    `SELECT entity_type, entity_id, operation
     FROM sync_queue
     WHERE user_id = ?
     ORDER BY entity_type, entity_id;`,
    userId,
  );
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

class TemplateMemoryGateway implements RemoteSyncGateway {
  readonly calls: string[] = [];
  readonly children = new Map<string, WorkoutTemplateExercise>();
  template: WorkoutTemplate | undefined;

  async apply(mutation: SyncMutation): Promise<RemoteMutationResult> {
    this.calls.push(`${mutation.entityType}:${
      mutation.operation === "delete" ? mutation.entityId : mutation.entity.id
    }:${mutation.operation}`);
    if (mutation.operation === "delete") {
      if (mutation.entityType !== "workout_template_exercise") {
        throw new Error("Unexpected template synchronization delete.");
      }
      this.children.delete(mutation.entityId);
      return {};
    }
    if (mutation.entityType === "workout_template") {
      this.template = structuredClone(mutation.entity);
      return { serverUpdatedAt: serverTime };
    }
    if (mutation.entityType === "workout_template_exercise") {
      this.children.set(mutation.entity.id, structuredClone(mutation.entity));
      return { serverUpdatedAt: serverTime };
    }
    throw new Error("Unexpected non-template synchronization mutation.");
  }
}
