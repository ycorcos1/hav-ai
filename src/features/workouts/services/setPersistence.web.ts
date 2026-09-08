import {
  deleteWorkoutSetInPreviewState,
  WebPreviewLocalSetRepository,
  saveWorkoutSetInPreviewState,
} from "@/db/webPreview/WebPreviewLocalSetRepository";
import { WebPreviewLocalWorkoutRepository } from "@/db/webPreview/WebPreviewLocalWorkoutRepository";
import { browserWebPreviewStorage, type WebPreviewStorage } from "@/db/webPreview/storage";
import {
  enqueueWorkoutWebPreviewMutation,
  readWorkoutWebPreviewState,
  writeWorkoutWebPreviewState,
} from "@/db/webPreview/workoutStorage";
import type { WorkoutSet } from "@/shared/contracts";

import type { SetDeleteResult, SetPersistence } from "./setPersistenceTypes";

export class WebPreviewSetPersistence implements SetPersistence {
  readonly setRepository: WebPreviewLocalSetRepository;
  readonly workoutRepository: WebPreviewLocalWorkoutRepository;

  constructor(private readonly storage: WebPreviewStorage = browserWebPreviewStorage()) {
    this.setRepository = new WebPreviewLocalSetRepository(storage);
    this.workoutRepository = new WebPreviewLocalWorkoutRepository(storage);
  }

  async commitCompletedSet(set: WorkoutSet): Promise<void> {
    const state = readWorkoutWebPreviewState(this.storage);
    saveWorkoutSetInPreviewState(state, set);
    enqueueWorkoutWebPreviewMutation(state, "set", set.id, set.completedAt);
    writeWorkoutWebPreviewState(this.storage, state);
  }

  async commitEditedSet(set: WorkoutSet): Promise<void> {
    const state = readWorkoutWebPreviewState(this.storage);
    saveWorkoutSetInPreviewState(state, set);
    enqueueWorkoutWebPreviewMutation(state, "set", set.id, set.updatedAt);
    writeWorkoutWebPreviewState(this.storage, state);
  }

  async deleteCompletedSet(
    userId: string,
    setId: string,
    deletedAt: string,
  ): Promise<SetDeleteResult> {
    const state = readWorkoutWebPreviewState(this.storage);
    const result = deleteWorkoutSetInPreviewState(state, userId, setId, deletedAt);
    if (result !== "missing") writeWorkoutWebPreviewState(this.storage, state);
    return result;
  }
}

export async function createSetPersistence(): Promise<SetPersistence> {
  return new WebPreviewSetPersistence();
}
