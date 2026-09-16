import type { RecentExerciseSessionCacheRepository } from "@/db/repositories";
import type { RemoteExerciseHistoryRepository } from "@/lib/supabase/repositories";
import type { UUID } from "@/shared/contracts";

import type { SyncProcessor } from "./syncTypes";

export type RecentExerciseHistoryPullResult = {
  sessionsCached: number;
};

export class RecentExerciseHistoryPullService {
  constructor(
    private readonly userId: UUID,
    private readonly pushProcessor: SyncProcessor,
    private readonly remoteHistory: RemoteExerciseHistoryRepository,
    private readonly localCache: RecentExerciseSessionCacheRepository,
  ) {}

  async pullRecentHistory(): Promise<RecentExerciseHistoryPullResult> {
    await this.pushProcessor.synchronize();
    const sessions = await this.remoteHistory.fetchOwnCompletedSessions();
    const sessionsCached = await this.localCache.replaceForUser(
      this.userId,
      sessions,
      recentSessionLimit,
    );
    return { sessionsCached };
  }
}

export const recentSessionLimit = 5;
