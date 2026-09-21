import { readWorkoutWebPreviewState } from "@/db/webPreview/workoutStorage";
import type { SyncResult, UUID } from "@/shared/contracts";

export async function countPendingSyncItems(userId: UUID): Promise<number> {
  const state = readWorkoutWebPreviewState();
  const ownedEntityIds = new Set<string>();
  for (const workout of state.workouts.filter((item) => item.userId === userId)) {
    ownedEntityIds.add(workout.id);
    for (const exercise of workout.exercises) {
      ownedEntityIds.add(exercise.id);
      exercise.sets.forEach((set) => ownedEntityIds.add(set.id));
    }
  }
  state.deletedSets
    .filter((set) => set.userId === userId)
    .forEach((set) => ownedEntityIds.add(set.id));
  state.recommendations
    .filter((item) => item.userId === userId)
    .forEach((item) => ownedEntityIds.add(item.id));
  return state.queue.filter(({ entityId }) => ownedEntityIds.has(entityId)).length;
}

export async function synchronizePendingItems(userId: UUID): Promise<SyncResult> {
  return {
    success: false,
    processed: 0,
    succeeded: 0,
    failed: 0,
    remainingQueueSize: await countPendingSyncItems(userId),
    errors: [],
  };
}
