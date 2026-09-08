import type {
  LocalSetRepository,
  LocalWorkoutRepository,
} from "@/db/repositories/types";
import type { WorkoutSet } from "@/shared/contracts";

export type SetPersistence = {
  commitCompletedSet(set: WorkoutSet): Promise<void>;
  setRepository: LocalSetRepository;
  workoutRepository: LocalWorkoutRepository;
};
