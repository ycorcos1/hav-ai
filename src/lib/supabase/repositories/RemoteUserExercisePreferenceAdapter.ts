import type { CloudUserExercisePreferenceSnapshot } from "@/db/repositories";
import type {
  RemoteMutationResult,
  UserExercisePreference,
  UUID,
} from "@/shared/contracts";

export interface RemoteUserExercisePreferenceAdapter {
  fetchOwnPreferences(): Promise<CloudUserExercisePreferenceSnapshot[]>;
  upsertOwnPreference(preference: UserExercisePreference): Promise<RemoteMutationResult>;
  deleteOwnPreference(id: UUID): Promise<void>;
}

export type RemoteUserExercisePreferenceOperation =
  | "fetchOwnPreferences"
  | "upsertOwnPreference"
  | "deleteOwnPreference";

export class RemoteUserExercisePreferenceAdapterError extends Error {
  readonly code = "REMOTE_USER_EXERCISE_PREFERENCE_ADAPTER_ERROR";

  constructor(readonly operation: RemoteUserExercisePreferenceOperation) {
    super(`Remote exercise preference operation failed: ${operation}.`);
    this.name = "RemoteUserExercisePreferenceAdapterError";
  }
}
