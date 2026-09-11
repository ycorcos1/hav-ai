import type { Workout } from "@/shared/contracts";

export interface RecoveryStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export function recoveryKey(userId: string, workoutId: string): string {
  return `workout-exercise:v1:${encodeURIComponent(userId)}:${encodeURIComponent(workoutId)}`;
}

function ownsInstance(workout: Workout, userId: string, instanceId: string): boolean {
  return workout.userId === userId && workout.status === "active"
    && workout.exercises.some((exercise) => exercise.id === instanceId
      && exercise.userId === userId && exercise.workoutId === workout.id);
}

// Advisory UI context: storage failure must never invalidate workout recovery.
export async function readRecoveryBookmark(
  storage: RecoveryStorage, userId: string, activeWorkout: Workout,
): Promise<string | undefined> {
  if (activeWorkout.userId !== userId || activeWorkout.status !== "active") return undefined;
  const key = recoveryKey(userId, activeWorkout.id);
  try {
    const id = await storage.getItem(key);
    if (!id) return undefined;
    if (ownsInstance(activeWorkout, userId, id)) return id;
    await storage.removeItem(key);
  } catch { /* The canonical workout remains usable without a bookmark. */ }
  return undefined;
}

export async function writeRecoveryBookmark(
  storage: RecoveryStorage, userId: string, activeWorkout: Workout, instanceId: string,
): Promise<void> {
  if (!ownsInstance(activeWorkout, userId, instanceId)) return;
  try { await storage.setItem(recoveryKey(userId, activeWorkout.id), instanceId); }
  catch { /* Bookmark persistence is independent from workout persistence. */ }
}
