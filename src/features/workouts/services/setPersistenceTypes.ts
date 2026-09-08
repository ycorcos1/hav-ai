import type {
  LocalSetRepository,
  LocalWorkoutRepository,
} from "@/db/repositories/types";
import type { WorkoutSet } from "@/shared/contracts";

export type SetPersistence = {
  commitCompletedSet(set: WorkoutSet): Promise<void>;
  commitEditedSet(set: WorkoutSet): Promise<void>;
  deleteCompletedSet(
    userId: string,
    setId: string,
    deletedAt: string,
  ): Promise<SetDeleteResult>;
  setRepository: LocalSetRepository;
  workoutRepository: LocalWorkoutRepository;
};

export type SetDeleteResult = "deleted-local" | "missing" | "tombstoned";
