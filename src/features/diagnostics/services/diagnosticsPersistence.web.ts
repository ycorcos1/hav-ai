import { readWorkoutWebPreviewState } from "@/db/webPreview/workoutStorage";
import type { SyncQueueItem, UUID } from "@/shared/contracts";

export type PersistenceDiagnostics = {
  activeWorkoutId?: UUID;
  pendingItems: SyncQueueItem[];
  schemaVersion: string;
};

export async function loadPersistenceDiagnostics(
  userId: UUID,
): Promise<PersistenceDiagnostics> {
  const state = readWorkoutWebPreviewState();
  const workouts = state.workouts.filter((workout) => workout.userId === userId);
  const ownedIds = new Set<string>();
  workouts.forEach((workout) => {
    ownedIds.add(workout.id);
    workout.exercises.forEach((exercise) => {
      ownedIds.add(exercise.id);
      exercise.sets.forEach((set) => ownedIds.add(set.id));
    });
  });
  state.deletedSets
    .filter((set) => set.userId === userId)
    .forEach((set) => ownedIds.add(set.id));
  state.recommendations
    .filter((recommendation) => recommendation.userId === userId)
    .forEach((recommendation) => ownedIds.add(recommendation.id));

  return {
    ...(workouts.find((workout) => workout.status === "active")
      ? { activeWorkoutId: workouts.find((workout) => workout.status === "active")?.id }
      : {}),
    pendingItems: state.queue.filter((item) => ownedIds.has(item.entityId)),
    schemaVersion: "native-only (web preview)",
  };
}
