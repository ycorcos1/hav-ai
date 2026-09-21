import { authService } from "@/lib/supabase/services";

import { synchronizePendingItems } from "@/features/profile/services/logoutSafetyPersistence.web";
import type { SyncProcessor } from "./syncTypes";

export const applicationSyncProcessor: SyncProcessor = {
  async synchronize() {
    const session = await authService.getSession();
    if (!session) {
      return {
        success: true,
        processed: 0,
        succeeded: 0,
        failed: 0,
        remainingQueueSize: 0,
        errors: [],
      };
    }
    return synchronizePendingItems(session.user.id);
  },
};
