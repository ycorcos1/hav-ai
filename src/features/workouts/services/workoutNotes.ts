import type { LocalWorkoutRepository } from "@/db/repositories";
import type { UpdateWorkoutNoteInput, UUID, Workout } from "@/shared/contracts";

export class WorkoutNoteError extends Error {
  readonly name = "WorkoutNoteError";
}

export async function updateActiveWorkoutNote(
  repository: LocalWorkoutRepository,
  userId: UUID,
  input: UpdateWorkoutNoteInput,
  now: string = new Date().toISOString(),
): Promise<Workout> {
  const workout = await repository.getById(userId, input.workoutId);
  if (!workout || workout.status !== "active") {
    throw new WorkoutNoteError("The active workout note could not be saved.");
  }

  const normalizedNotes = input.notes?.trim() || undefined;
  const updatedWorkout: Workout = {
    ...workout,
    ...(normalizedNotes ? { notes: normalizedNotes } : { notes: undefined }),
    updatedAt: now,
  };
  await repository.update(updatedWorkout);
  return updatedWorkout;
}
