import type {
  UUID,
  UndoSetCompletionResult,
} from "@/shared/contracts";

import { DeleteSetError, DeleteSetService } from "./deleteSet";
import type { SetPersistence } from "./setPersistenceTypes";

export class UndoSetCompletionError extends Error {
  readonly name = "UndoSetCompletionError";
}

type UndoSetCompletionServiceOptions = {
  now?: () => string;
};

export class UndoSetCompletionService {
  private readonly deleteSet: DeleteSetService;

  constructor(
    private readonly persistence: SetPersistence,
    options: UndoSetCompletionServiceOptions = {},
  ) {
    this.deleteSet = new DeleteSetService(persistence, options);
  }

  async undo(userId: UUID, setId: UUID): Promise<UndoSetCompletionResult> {
    const set = await this.persistence.setRepository.getById(userId, setId);
    if (!set) {
      throw new UndoSetCompletionError("The completed set is no longer available.");
    }

    try {
      await this.deleteSet.delete(userId, setId);
    } catch (error: unknown) {
      if (error instanceof DeleteSetError) {
        throw new UndoSetCompletionError(error.message);
      }
      throw error;
    }

    return {
      restoredDraft: {
        ...(set.weightKg === undefined ? {} : { weightKg: set.weightKg }),
        reps: set.reps,
        ...(set.rpe === undefined ? {} : { rpe: set.rpe }),
        ...(set.notes === undefined ? {} : { notes: set.notes }),
      },
    };
  }
}
