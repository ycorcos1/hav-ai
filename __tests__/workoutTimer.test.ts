import {
  elapsedWorkoutSeconds,
  formatWorkoutElapsedTime,
} from "@/features/workouts/services/workoutTimer";

describe("timestamp-based workout timer", () => {
  const startedAt = "2026-09-02T12:00:00.000Z";

  it("derives elapsed duration from startedAt and controlled current time", () => {
    expect(elapsedWorkoutSeconds(startedAt, Date.parse(startedAt))).toBe(0);
    expect(elapsedWorkoutSeconds(startedAt, Date.parse(startedAt) + 42_018)).toBe(42);
    expect(elapsedWorkoutSeconds(startedAt, Date.parse(startedAt) + 3_661_999)).toBe(3661);
  });

  it("does not report negative or invalid elapsed duration", () => {
    expect(elapsedWorkoutSeconds(startedAt, Date.parse(startedAt) - 1000)).toBe(0);
    expect(elapsedWorkoutSeconds("invalid", Date.parse(startedAt))).toBe(0);
    expect(elapsedWorkoutSeconds(startedAt, Number.NaN)).toBe(0);
  });

  it("formats durations without storing a ticking counter", () => {
    expect(formatWorkoutElapsedTime(0)).toBe("0:00");
    expect(formatWorkoutElapsedTime(754)).toBe("12:34");
    expect(formatWorkoutElapsedTime(3661)).toBe("1:01:01");
  });
});
