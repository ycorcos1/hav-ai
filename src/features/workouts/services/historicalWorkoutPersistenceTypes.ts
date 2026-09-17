import type { UUID } from "@/shared/contracts";

export type HistoricalWorkoutDeleteResult = {
  exerciseIds: UUID[];
  status: "deleted-local" | "missing" | "queued-delete";
};

export interface HistoricalWorkoutPersistence {
  deleteCompletedWorkout(
    userId: UUID,
    workoutId: UUID,
    deletedAt: string,
  ): Promise<HistoricalWorkoutDeleteResult>;
}
