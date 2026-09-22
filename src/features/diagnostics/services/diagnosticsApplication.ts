import { requireCurrentLocalOwner } from "@/features/routing/localRecovery";
import type { SyncQueueItem } from "@/shared/contracts";

import { loadPersistenceDiagnostics } from "./diagnosticsPersistence";

export type LocalDiagnostics = {
  activeWorkoutId?: string;
  pendingItems: SyncQueueItem[];
  schemaVersion: string;
  userId: string;
};

export async function loadLocalDiagnostics(): Promise<LocalDiagnostics> {
  const owner = await requireCurrentLocalOwner();
  const persistence = await loadPersistenceDiagnostics(owner.userId);
  owner.assertCurrent();
  return { ...persistence, userId: owner.userId };
}
