import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { configureLocalDatabase } from "@/db/bootstrap";
import {
  SQLiteLocalSetRepository,
  SQLiteLocalWorkoutRepository,
} from "@/db/repositories";
import { CompleteSetService } from "@/features/workouts/services/completeSet";
import { SQLiteSetPersistence } from "@/features/workouts/services/setPersistence.native";
import type { Workout } from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const userId = "00000000-0000-4000-8000-000000000001";
const workoutId = "00000000-0000-4000-8000-000000000002";
const workoutExerciseId = "00000000-0000-4000-8000-000000000003";
const exerciseId = "00000000-0000-4000-8000-000000000004";
const startedAt = "2026-09-11T14:00:00.000Z";

const workout: Workout = {
  id: workoutId,
  userId,
  sourceTemplateId: "00000000-0000-4000-8000-000000000005",
  name: "Durable Workout",
  status: "active",
  startedAt,
  notes: "Persist this workout",
  exercises: [{
    id: workoutExerciseId,
    userId,
    workoutId,
    exerciseId,
    position: 0,
    targetSets: 3,
    targetMinReps: 6,
    targetMaxReps: 8,
    targetWeightKg: 80,
    sets: [],
    createdAt: startedAt,
    updatedAt: startedAt,
  }],
  createdAt: startedAt,
  updatedAt: startedAt,
};

type QueueRow = {
  attempt_count: number;
  created_at: string;
  entity_id: string;
  entity_type: string;
  id: string;
  last_attempt_at: string | null;
  last_error: string | null;
  operation: string;
};

function createFileDatabase(prefix: string): {
  directory: string;
  filename: string;
  open: () => NodeSQLiteConnection;
} {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  const filename = join(directory, "havai.db");
  return {
    directory,
    filename,
    open: () => new NodeSQLiteConnection(new DatabaseSync(filename)),
  };
}

describe("local durability integration", () => {
  it("preserves the exact active workout aggregate after closing and reopening its file", async () => {
    const file = createFileDatabase("havai-active-durability-");
    let database = file.open();
    try {
      await configureLocalDatabase(database);
      await new SQLiteLocalWorkoutRepository(database).create(structuredClone(workout));
      database.close();

      database = file.open();
      await configureLocalDatabase(database);
      const repository = new SQLiteLocalWorkoutRepository(database);
      await expect(repository.getActiveForUser(userId)).resolves.toEqual(workout);
      await expect(repository.getById(userId, workoutId)).resolves.toEqual(workout);
      await expect(repository.getActiveForUser("another-user")).resolves.toBeNull();
      await expect(database.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) AS count FROM local_workouts WHERE user_id=?;",
        userId,
      )).resolves.toEqual({ count: 1 });
    } finally {
      database.close();
      rmSync(file.directory, { recursive: true, force: true });
    }
  });

  it("preserves a completed set and the same unattempted queue records across reopen", async () => {
    const file = createFileDatabase("havai-set-queue-durability-");
    let database = file.open();
    try {
      await configureLocalDatabase(database);
      await new SQLiteLocalWorkoutRepository(database).create(structuredClone(workout));
      const completed = await new CompleteSetService(
        new SQLiteSetPersistence(database),
        {
          createId: () => "00000000-0000-4000-8000-000000000006",
          now: () => "2026-09-11T14:05:00.000Z",
        },
      ).complete(userId, {
        workoutId,
        workoutExerciseId,
        exerciseId,
        setType: "working",
        weightKg: 82.5,
        reps: 7,
        rpe: 8.5,
        notes: "Durable set note",
      });
      const queueBeforeClose = await database.getAllAsync<QueueRow>(
        "SELECT * FROM sync_queue ORDER BY entity_type, entity_id;",
      );
      expect(queueBeforeClose).toHaveLength(3);
      expect(queueBeforeClose.every(({ attempt_count, last_attempt_at, last_error }) => (
        attempt_count === 0 && last_attempt_at === null && last_error === null
      ))).toBe(true);
      database.close();

      database = file.open();
      await configureLocalDatabase(database);
      const setRepository = new SQLiteLocalSetRepository(database);
      const workoutRepository = new SQLiteLocalWorkoutRepository(database);
      await expect(setRepository.getById(userId, completed.set.id)).resolves.toEqual(completed.set);
      await expect(setRepository.getForWorkoutExercise(userId, workoutExerciseId))
        .resolves.toEqual([completed.set]);
      const recovered = await workoutRepository.getActiveForUser(userId);
      expect(recovered?.exercises[0].sets).toEqual([completed.set]);
      expect(recovered?.exercises[0]).toMatchObject({
        id: workoutExerciseId,
        userId,
        workoutId,
        exerciseId,
        position: 0,
      });
      expect(await database.getAllAsync<QueueRow>(
        "SELECT * FROM sync_queue ORDER BY entity_type, entity_id;",
      )).toEqual(queueBeforeClose);
      await expect(database.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) AS count FROM sync_queue WHERE attempt_count > 0 OR last_attempt_at IS NOT NULL;",
      )).resolves.toEqual({ count: 0 });
    } finally {
      database.close();
      rmSync(file.directory, { recursive: true, force: true });
    }
  });
});
