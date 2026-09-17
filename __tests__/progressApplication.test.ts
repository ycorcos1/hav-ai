import type { Exercise, WorkoutSet } from "@/shared/contracts";

const mockCreateWorkoutPersistence = jest.fn();
const mockPopulateExerciseFixture = jest.fn();

jest.mock("@/features/routing/localRecovery", () => ({
  requireCurrentLocalOwner: async () => ({ userId: "user-a", assertCurrent: () => undefined }),
}));
jest.mock("@/features/workouts/services/workoutPersistence", () => ({
  createWorkoutPersistence: (...args: unknown[]) => mockCreateWorkoutPersistence(...args),
}));
jest.mock("@/features/exercises/services/populateExerciseFixture", () => ({
  populateExerciseFixture: (...args: unknown[]) => mockPopulateExerciseFixture(...args),
}));

import {
  loadCurrentUserExerciseProgress,
  loadCurrentUserProgressHome,
} from "@/features/progress/services/progressApplication";

const time = "2026-09-03T10:00:00.000Z";
const exercise: Exercise = {
  id: "bench",
  name: "Bench Press",
  primaryMuscleGroup: "chest",
  secondaryMuscleGroups: [],
  equipmentType: "barbell",
  measurementType: "weight_reps",
  isSystem: true,
  isArchived: false,
  createdAt: time,
  updatedAt: time,
};
const recordSet: WorkoutSet = {
  id: "set-1",
  userId: "user-a",
  workoutId: "workout-1",
  workoutExerciseId: "workout-exercise-1",
  exerciseId: exercise.id,
  position: 0,
  setType: "working",
  weightKg: 100,
  reps: 5,
  completedAt: time,
  createdAt: time,
  updatedAt: time,
};

function persistence() {
  const exerciseHistoryRepository = {
    getRecentSessions: jest.fn().mockResolvedValue([{
      workoutId: "workout-1",
      completedAt: time,
      sets: [{ weightKg: 100, reps: 5 }],
    }]),
    getBestSet: jest.fn().mockResolvedValue(recordSet),
    getCompletedSetsForExercises: jest.fn(),
  };
  const progressHistoryRepository = {
    getBestEstimatedOneRepMaxSet: jest.fn().mockResolvedValue(recordSet),
    getCurrentPersonalRecordCandidates: jest.fn().mockResolvedValue([recordSet]),
  };
  return {
    exerciseHistoryRepository,
    exerciseRepository: {
      getById: jest.fn().mockResolvedValue(exercise),
      listAccessible: jest.fn().mockResolvedValue([exercise]),
    },
    profileCacheRepository: { get: jest.fn().mockResolvedValue({ weightUnit: "kg" }) },
    progressHistoryRepository,
  };
}

describe("progress application", () => {
  beforeEach(() => jest.clearAllMocks());

  it("builds recent current records from focused candidates rather than lifetime rows", async () => {
    const repositories = persistence();
    mockCreateWorkoutPersistence.mockResolvedValue(repositories);
    const result = await loadCurrentUserProgressHome();

    expect(result.exercises).toEqual([exercise]);
    expect(result.recentRecords.map(({ record }) => record.type).sort()).toEqual([
      "estimated_1rm",
      "max_weight",
    ]);
    expect(repositories.progressHistoryRepository.getCurrentPersonalRecordCandidates)
      .toHaveBeenCalledWith({ userId: "user-a", exerciseIds: [exercise.id] });
    expect(repositories.exerciseHistoryRepository.getCompletedSetsForExercises).not.toHaveBeenCalled();
  });

  it("combines recent sessions with focused all-time aggregate candidates", async () => {
    const repositories = persistence();
    mockCreateWorkoutPersistence.mockResolvedValue(repositories);
    const result = await loadCurrentUserExerciseProgress(exercise.id);

    expect(result?.metrics).toMatchObject({
      currentEstimated1RMKg: expect.any(Number),
      bestEstimated1RMKg: expect.any(Number),
      bestWeightKg: 100,
      bestSet: { weightKg: 100, reps: 5 },
    });
    expect(repositories.exerciseHistoryRepository.getRecentSessions).toHaveBeenCalledWith({
      userId: "user-a",
      exerciseId: exercise.id,
      limit: 20,
    });
  });
});
