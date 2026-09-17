import {
  calculateWorkoutSummary,
  WorkoutSummaryCalculationError,
} from "@/features/metrics";
import type { Workout, WorkoutSet } from "@/shared/contracts";

const userId = "user-a";
const workoutId = "workout-current";
const completedAt = "2026-09-17T13:04:00.000Z";

describe("basic workout summary calculator", () => {
  it("derives duration, working totals, previous-session deltas, best sets, and PR events", () => {
    const workout = createWorkout();
    const history = [
      historicalSet("history-a-1", "exercise-a", "history-a", 80, 7, "2026-09-10T12:00:00.000Z"),
      historicalSet("history-a-2", "exercise-a", "history-a", 80, 6, "2026-09-10T12:01:00.000Z"),
      historicalSet("older-a", "exercise-a", "older-a", 70, 20, "2026-09-01T12:00:00.000Z"),
      historicalSet("history-b", "exercise-b", "history-b", undefined, 9, "2026-09-11T12:00:00.000Z"),
      historicalSet("foreign", "exercise-a", "foreign-workout", 200, 20, "2026-09-16T12:00:00.000Z", "user-b"),
    ];

    const result = calculateWorkoutSummary(workout, history);

    expect(result.summary).toEqual({
      workoutId,
      durationSeconds: 3840,
      exerciseCount: 2,
      workingSetCount: 3,
      exerciseSummaries: [
        {
          exerciseId: "exercise-a",
          totalWorkingSets: 2,
          totalReps: 17,
          previousTotalReps: 13,
          repDelta: 4,
          bestSet: { weightKg: 82.5, reps: 9, rpe: 8 },
          detectedPRs: ["max_weight", "estimated_1rm", "rep_pr"],
        },
        {
          exerciseId: "exercise-b",
          totalWorkingSets: 1,
          totalReps: 10,
          previousTotalReps: 9,
          repDelta: 1,
          bestSet: { reps: 10 },
          detectedPRs: ["rep_pr"],
        },
      ],
    });
    expect(result.personalRecords).toEqual(expect.arrayContaining([
      expect.objectContaining({ exerciseId: "exercise-a", type: "max_weight" }),
      expect.objectContaining({ exerciseId: "exercise-a", type: "estimated_1rm" }),
      expect.objectContaining({ exerciseId: "exercise-b", type: "rep_pr" }),
    ]));
  });

  it("excludes warm-ups, keeps exercises without working sets, and omits absent history", () => {
    const workout = createWorkout();
    workout.exercises[0].sets = [set("warmup", "exercise-a", undefined, 12, "warmup")];
    workout.exercises[1].sets = [];

    expect(calculateWorkoutSummary(workout)).toEqual({
      personalRecords: [],
      summary: {
        workoutId,
        durationSeconds: 3840,
        exerciseCount: 2,
        workingSetCount: 0,
        exerciseSummaries: [
          {
            exerciseId: "exercise-a",
            totalWorkingSets: 0,
            totalReps: 0,
            detectedPRs: [],
          },
          {
            exerciseId: "exercise-b",
            totalWorkingSets: 0,
            totalReps: 0,
            detectedPRs: [],
          },
        ],
      },
    });
  });

  it("groups repeated exercise instances deterministically", () => {
    const workout = createWorkout();
    workout.exercises.push({
      ...workout.exercises[0],
      id: "workout-exercise-a-2",
      position: 2,
      sets: [set("current-a-3", "exercise-a", 70, 12)],
    });

    const result = calculateWorkoutSummary(workout);
    expect(result.summary.exerciseCount).toBe(2);
    expect(result.summary.exerciseSummaries[0]).toMatchObject({
      exerciseId: "exercise-a",
      totalWorkingSets: 3,
      totalReps: 29,
    });
  });

  it.each([
    { completedAt: undefined },
    { completedAt: "invalid" },
    { completedAt: "2026-09-17T11:59:59.000Z" },
  ])("rejects an invalid completed-workout time boundary", ({ completedAt: value }) => {
    const workout = createWorkout();
    workout.completedAt = value;
    expect(() => calculateWorkoutSummary(workout)).toThrow(WorkoutSummaryCalculationError);
  });
});

function createWorkout(): Workout {
  return {
    id: workoutId,
    userId,
    name: "Push",
    status: "completed",
    startedAt: "2026-09-17T12:00:00.000Z",
    completedAt,
    exercises: [
      {
        id: "workout-exercise-a",
        userId,
        workoutId,
        exerciseId: "exercise-a",
        position: 0,
        sets: [
          set("current-a-warmup", "exercise-a", 40, 12, "warmup"),
          set("current-a-1", "exercise-a", 82.5, 8),
          set("current-a-2", "exercise-a", 82.5, 9, "working", 8),
        ],
        createdAt: "2026-09-17T12:00:00.000Z",
        updatedAt: completedAt,
      },
      {
        id: "workout-exercise-b",
        userId,
        workoutId,
        exerciseId: "exercise-b",
        position: 1,
        sets: [set("current-b-1", "exercise-b", undefined, 10)],
        createdAt: "2026-09-17T12:00:00.000Z",
        updatedAt: completedAt,
      },
    ],
    createdAt: "2026-09-17T12:00:00.000Z",
    updatedAt: completedAt,
  };
}

function set(
  id: string,
  exerciseId: string,
  weightKg: number | undefined,
  reps: number,
  setType: WorkoutSet["setType"] = "working",
  rpe?: WorkoutSet["rpe"],
): WorkoutSet {
  return {
    id,
    userId,
    workoutId,
    workoutExerciseId: `workout-${exerciseId}`,
    exerciseId,
    position: 0,
    setType,
    ...(weightKg === undefined ? {} : { weightKg }),
    reps,
    ...(rpe === undefined ? {} : { rpe }),
    completedAt,
    createdAt: completedAt,
    updatedAt: completedAt,
  };
}

function historicalSet(
  id: string,
  exerciseId: string,
  historicalWorkoutId: string,
  weightKg: number | undefined,
  reps: number,
  timestamp: string,
  historicalUserId = userId,
): WorkoutSet {
  return {
    ...set(id, exerciseId, weightKg, reps),
    userId: historicalUserId,
    workoutId: historicalWorkoutId,
    completedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
