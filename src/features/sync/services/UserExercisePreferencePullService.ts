import type { LocalUserExercisePreferenceHydrationRepository } from "@/db/repositories";
import type { RemoteUserExercisePreferenceAdapter } from "@/lib/supabase/repositories";
import type { UUID } from "@/shared/contracts";

import type { SyncProcessor } from "./syncTypes";

export type UserExercisePreferencePullResult = {
  hydrated: number;
  removed: number;
  preservedDirty: number;
};

export class UserExercisePreferencePullService {
  constructor(
    private readonly userId: UUID,
    private readonly pushProcessor: SyncProcessor,
    private readonly remotePreferences: RemoteUserExercisePreferenceAdapter,
    private readonly localPreferences: LocalUserExercisePreferenceHydrationRepository,
  ) {}

  async pullUpdates(): Promise<UserExercisePreferencePullResult> {
    await this.pushProcessor.synchronize();
    const snapshots = await this.remotePreferences.fetchOwnPreferences();
    return this.localPreferences.reconcileFromCloud(this.userId, snapshots);
  }
}
