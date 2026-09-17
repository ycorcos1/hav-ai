import { calculateLocalPersonalRecordState } from "@/features/metrics";
import type { WorkoutSet } from "@/shared/contracts";

const time = "2026-09-17T12:00:00.000Z";

describe("local personal-record state", () => {
  it("derives current max-weight/e1RM state and keeps rep PRs event-only", () => {
    const state = calculateLocalPersonalRecordState(
      [set("current", 90, 8)],
      [set("history", 100, 1)],
    );
    expect(state.persistedState.map(({ type, setId }) => ({ type, setId }))).toEqual([
      { type: "max_weight", setId: "history" },
      { type: "estimated_1rm", setId: "current" },
    ]);
    expect(state.persistedState.map(({ type }) => type)).not.toContain("rep_pr");
    expect(state.repEvents).toEqual([
      expect.objectContaining({ type: "rep_pr", setId: "current", weightKg: 90, reps: 8 }),
    ]);
  });

  it("recalculates deterministically from edited or deleted raw local history", () => {
    const original = calculateLocalPersonalRecordState([], [
      set("older", 80, 8),
      set("newer", 100, 5),
    ]);
    const edited = calculateLocalPersonalRecordState([], [
      set("older", 80, 8),
      set("newer", 70, 5),
    ]);
    const deleted = calculateLocalPersonalRecordState([], [set("older", 80, 8)]);
    expect(original.persistedState.find(({ type }) => type === "max_weight")?.setId).toBe("newer");
    expect(edited.persistedState.every(({ setId }) => setId === "older")).toBe(true);
    expect(deleted.persistedState).toEqual(edited.persistedState);
    expect(calculateLocalPersonalRecordState([], [set("older", 80, 8)])).toEqual(deleted);
  });
});

function set(id: string, weightKg: number, reps: number): WorkoutSet {
  return {
    id,
    userId: "user-a",
    workoutId: `workout-${id}`,
    workoutExerciseId: `workout-exercise-${id}`,
    exerciseId: "exercise-a",
    position: 0,
    setType: "working",
    weightKg,
    reps,
    completedAt: time,
    createdAt: time,
    updatedAt: time,
  };
}
