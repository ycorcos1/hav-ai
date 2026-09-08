import { bootstrapLocalDatabase } from "@/db";
import {
  SQLiteLocalSetRepository,
  SQLiteLocalWorkoutRepository,
} from "@/db/repositories";
import { enqueueSyncUpsert } from "@/db/repositories/syncQueueUtils";
import type { TransactionalLocalDatabaseConnection } from "@/db/types";
import type { WorkoutSet } from "@/shared/contracts";

import type { SetPersistence } from "./setPersistenceTypes";

export class SQLiteSetPersistence implements SetPersistence {
  readonly setRepository: SQLiteLocalSetRepository;
  readonly workoutRepository: SQLiteLocalWorkoutRepository;

  constructor(private readonly database: TransactionalLocalDatabaseConnection) {
    this.setRepository = new SQLiteLocalSetRepository(database);
    this.workoutRepository = new SQLiteLocalWorkoutRepository(database);
  }

  async commitCompletedSet(set: WorkoutSet): Promise<void> {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await new SQLiteLocalSetRepository(transaction).create(set);
      await enqueueSyncUpsert(transaction, "set", set.id, set.completedAt);
    });
  }
}

export async function createSetPersistence(): Promise<SetPersistence> {
  return new SQLiteSetPersistence(await bootstrapLocalDatabase());
}
