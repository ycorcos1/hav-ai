import { DatabaseSync } from "node:sqlite";

import {
  configureLocalDatabase,
  SQLiteLocalExerciseRepository,
  SQLiteLocalTemplateRepository,
} from "@/db";
import type {
  CloudExerciseSnapshot,
  CloudTemplateSnapshot,
} from "@/db/repositories";
import { ExerciseTemplatePullService } from "@/features/sync/services";
import type {
  ExerciseRepository,
  TemplateRepository,
} from "@/lib/supabase/repositories";
import type { SyncResult } from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const userId = "a0000000-0000-4000-8000-00000000000a";
const createdAt = "2026-09-16T12:00:00.000Z";
const serverUpdatedAt = "2026-09-16T13:00:00.000Z";
const exerciseId = "10000000-0000-4000-8000-000000000001";

describe("exercise and template pull synchronization", () => {
  it("pushes first, hydrates without queue writes, and never mutates an active snapshot", async () => {
    const database = await openDatabase();
    try {
      await seedActiveWorkout(database);
      const activeBefore = await activeSnapshot(database);
      const queueBefore = await queueSnapshot(database);
      const events: string[] = [];
      const exercises = new RemoteExercises([exerciseSnapshot("Cloud Bench")], events);
      const templates = new RemoteTemplates([templateSnapshot("Cloud Push")], events);
      const service = serviceFor(database, exercises, templates, events);

      await expect(service.pullUpdates()).resolves.toEqual({
        exercisesHydrated: 1,
        exercisesPreservedDirty: 0,
        templatesHydrated: 1,
        templatesPreservedDirty: 0,
      });
      expect(events[0]).toBe("push");
      expect(events.slice(1).sort()).toEqual(["fetch-exercises", "fetch-templates"]);
      await expect(activeSnapshot(database)).resolves.toEqual(activeBefore);
      await expect(queueSnapshot(database)).resolves.toEqual(queueBefore);
      await expect(new SQLiteLocalTemplateRepository(database).getById(
        userId, "template-cloud",
      )).resolves.toMatchObject({ name: "Cloud Push" });
    } finally {
      database.close();
    }
  });

  it("preserves dirty local authorship and does not infer hard deletes from absent rows", async () => {
    const database = await openDatabase();
    try {
      const events: string[] = [];
      const exercises = new RemoteExercises([customExerciseSnapshot("Cloud Custom")], events);
      const templates = new RemoteTemplates([templateSnapshot("Cloud Push")], events);
      const service = serviceFor(database, exercises, templates, events);
      await service.pullUpdates();

      const localExercises = new SQLiteLocalExerciseRepository(database);
      const localTemplates = new SQLiteLocalTemplateRepository(database);
      const custom = (await localExercises.getById(userId, "custom-cloud"))!;
      const template = (await localTemplates.getById(userId, "template-cloud"))!;
      await localExercises.upsert({
        ...custom,
        name: "Local Dirty Custom",
        updatedAt: "2026-09-16T14:00:00.000Z",
      });
      await localTemplates.update({
        ...template,
        name: "Local Dirty Push",
        updatedAt: "2026-09-16T14:00:00.000Z",
      });
      const queueBefore = await queueSnapshot(database);

      await expect(service.pullUpdates()).resolves.toMatchObject({
        exercisesPreservedDirty: 1,
        templatesPreservedDirty: 1,
      });
      await expect(localExercises.getById(userId, custom.id)).resolves.toMatchObject({
        name: "Local Dirty Custom",
      });
      await expect(localTemplates.getById(userId, template.id)).resolves.toMatchObject({
        name: "Local Dirty Push",
      });
      await expect(queueSnapshot(database)).resolves.toEqual(queueBefore);

      exercises.snapshots = [];
      templates.snapshots = [];
      await service.pullUpdates();
      await expect(localExercises.getById(userId, custom.id)).resolves.not.toBeNull();
      await expect(localTemplates.getById(userId, template.id)).resolves.not.toBeNull();
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

function serviceFor(
  database: NodeSQLiteConnection,
  exercises: ExerciseRepository,
  templates: TemplateRepository,
  events: string[],
) {
  return new ExerciseTemplatePullService(
    userId,
    { synchronize: async () => {
      events.push("push");
      return successfulSyncResult;
    } },
    exercises,
    templates,
    new SQLiteLocalExerciseRepository(database),
    new SQLiteLocalTemplateRepository(database),
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

class RemoteExercises implements ExerciseRepository {
  constructor(
    public snapshots: CloudExerciseSnapshot[],
    private readonly events: string[],
  ) {}

  async fetchAccessible(): Promise<CloudExerciseSnapshot[]> {
    this.events.push("fetch-exercises");
    return this.snapshots;
  }

  async upsertOwnCustomExercise() {
    return {};
  }
}

class RemoteTemplates implements TemplateRepository {
  constructor(
    public snapshots: CloudTemplateSnapshot[],
    private readonly events: string[],
  ) {}

  async fetchOwnTemplates(): Promise<CloudTemplateSnapshot[]> {
    this.events.push("fetch-templates");
    return this.snapshots;
  }

  async archiveOwnTemplate() { return {}; }
  async deleteOwnTemplateExercise() { throw new Error("Not used by pull tests."); }
  async upsertOwnTemplate() { return {}; }
  async upsertOwnTemplateExercise() { return {}; }
}

function exerciseSnapshot(name: string): CloudExerciseSnapshot {
  return {
    exercise: {
      id: exerciseId,
      name,
      primaryMuscleGroup: "chest",
      secondaryMuscleGroups: ["triceps"],
      equipmentType: "barbell",
      measurementType: "weight_reps",
      isSystem: true,
      isArchived: false,
      createdAt,
      updatedAt: serverUpdatedAt,
    },
    serverUpdatedAt,
  };
}

function customExerciseSnapshot(name: string): CloudExerciseSnapshot {
  return {
    ...exerciseSnapshot(name),
    exercise: {
      ...exerciseSnapshot(name).exercise,
      id: "custom-cloud",
      ownerUserId: userId,
      isSystem: false,
    },
  };
}

function templateSnapshot(name: string): CloudTemplateSnapshot {
  return {
    template: {
      id: "template-cloud",
      userId,
      name,
      isArchived: false,
      createdAt,
      updatedAt: serverUpdatedAt,
      exercises: [{
        id: "template-child-cloud",
        userId,
        templateId: "template-cloud",
        exerciseId,
        position: 0,
        targetSets: 3,
        targetMinReps: 8,
        targetMaxReps: 10,
        createdAt,
        updatedAt: serverUpdatedAt,
      }],
    },
    serverUpdatedAt,
    exerciseServerUpdatedAtById: {
      "template-child-cloud": serverUpdatedAt,
    },
  };
}

async function seedActiveWorkout(database: NodeSQLiteConnection): Promise<void> {
  await database.execAsync(`
    INSERT INTO local_exercises
      (id, owner_user_id, name, primary_muscle_group, secondary_muscle_groups_json,
       equipment_type, measurement_type, is_system, is_archived, sync_status,
       created_at, updated_at)
    VALUES ('${exerciseId}', NULL, 'Local Bench', 'chest', '["triceps"]', 'barbell',
            'weight_reps', 1, 0, 'synced', '${createdAt}', '${createdAt}');
    INSERT INTO local_workouts
      (id, user_id, name, status, started_at, sync_status, created_at, updated_at)
    VALUES ('active-workout', '${userId}', 'Active', 'active', '${createdAt}', 'synced',
            '${createdAt}', '${createdAt}');
    INSERT INTO local_workout_exercises
      (id, user_id, workout_id, exercise_id, position, target_sets, target_min_reps,
       target_max_reps, notes, sync_status, created_at, updated_at)
    VALUES ('active-exercise', '${userId}', 'active-workout', '${exerciseId}', 0, 3, 8,
            10, 'Snapshot note', 'synced', '${createdAt}', '${createdAt}');
  `);
}

function activeSnapshot(database: NodeSQLiteConnection) {
  return database.getAllAsync(
    `SELECT id, workout_id, exercise_id, position, target_sets, target_min_reps,
            target_max_reps, notes
     FROM local_workout_exercises WHERE workout_id='active-workout';`,
  );
}

function queueSnapshot(database: NodeSQLiteConnection) {
  return database.getAllAsync(
    "SELECT entity_type, entity_id, operation FROM sync_queue ORDER BY entity_type, entity_id;",
  );
}
