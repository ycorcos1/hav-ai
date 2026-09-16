import { detectPersonalRecords } from "@/features/metrics";
import type { WorkoutSet } from "@/shared/contracts";

const exerciseId = "exercise-a";
const workoutId = "workout-current";

describe("canonical personal-record detection", () => {
  it("detects strict max-weight, e1RM, and same-load rep improvements", () => {
    const history = [set("history-1", 80, 8, { workoutId: "workout-history" })];
    const current = [set("current-1", 82.5, 9)];

    const records = detectPersonalRecords(current, history);
    expect(records.map(({ type }) => type)).toEqual([
      "max_weight",
      "estimated_1rm",
      "rep_pr",
    ]);
    expect(records).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "max_weight",
        setId: "current-1",
        weightKg: 82.5,
      }),
      expect.objectContaining({
        type: "estimated_1rm",
        estimated1RMKg: 82.5 * (1 + 9 / 30),
      }),
      expect.objectContaining({
        type: "rep_pr",
        reps: 9,
      }),
    ]));
  });

  it("does not detect ties and excludes warm-ups", () => {
    const history = [set("history-1", 80, 8, { workoutId: "workout-history" })];
    expect(detectPersonalRecords([set("current-1", 80, 8)], history)).toEqual([]);
    expect(detectPersonalRecords([
      set("warmup", 100, 10, { setType: "warmup" }),
    ], history)).toEqual([]);
  });

  it("detects a new e1RM without requiring a max-weight record", () => {
    const history = [set("history-1", 100, 1, { workoutId: "workout-history" })];
    const records = detectPersonalRecords([set("current-1", 90, 8)], history);
    expect(records.map(({ type }) => type)).not.toContain("max_weight");
    expect(records.map(({ type }) => type)).toContain("estimated_1rm");
  });

  it("detects rep PRs at the same normalized load, including bodyweight", () => {
    const history = [
      set("history-weight", 80, 8, { workoutId: "workout-history" }),
      set("history-bodyweight", undefined, 10, { workoutId: "workout-history" }),
    ];
    const records = detectPersonalRecords([
      set("current-weight", 80.00001, 9),
      set("current-bodyweight", undefined, 11),
    ], history);
    expect(records.filter(({ type }) => type === "rep_pr")).toEqual([
      expect.objectContaining({ setId: "current-bodyweight", reps: 11 }),
      expect.objectContaining({ setId: "current-weight", reps: 9 }),
    ]);
  });

  it("does not use above-cutoff sets as e1RM evidence", () => {
    const records = detectPersonalRecords(
      [set("current-high-rep", 100, 16)],
      [set("history-1", 90, 10, { workoutId: "workout-history" })],
    );
    expect(records.map(({ type }) => type)).not.toContain("estimated_1rm");
  });

  it("recalculates deterministically from the supplied edited or deleted history", () => {
    const current = [set("current", 100, 5)];
    const editedHistory = [set("edited-history", 110, 5, { workoutId: "history" })];
    expect(detectPersonalRecords(current, editedHistory).map(({ type }) => type))
      .not.toContain("max_weight");
    expect(detectPersonalRecords(current, []).map(({ type }) => type))
      .toContain("max_weight");
    expect(detectPersonalRecords(current, [])).toEqual(detectPersonalRecords(current, []));
  });
});

function set(
  id: string,
  weightKg: number | undefined,
  reps: number,
  overrides: Partial<WorkoutSet> = {},
): WorkoutSet {
  return {
    id,
    userId: "user-a",
    workoutId,
    workoutExerciseId: "workout-exercise-a",
    exerciseId,
    position: 0,
    setType: "working",
    ...(weightKg === undefined ? {} : { weightKg }),
    reps,
    completedAt: "2026-09-16T12:00:00.000Z",
    createdAt: "2026-09-16T12:00:00.000Z",
    updatedAt: "2026-09-16T12:00:00.000Z",
    ...overrides,
  };
}
