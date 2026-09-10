import { remainingRestMs, transitionRestTimer } from "@/features/workouts/services/restTimer";

describe("rest timer", () => {
  it("derives deadlines, pauses, resumes, resets, adds time and dismisses without persistence", () => {
    let timer = transitionRestTimer(null, { type: "start", setId: "a", durationSeconds: 120 }, 1000, 1)!;
    expect(remainingRestMs(timer, 31_000)).toBe(90_000);
    timer = transitionRestTimer(timer, { type: "pause" }, 31_000, 2)!;
    expect(remainingRestMs(timer, 500_000)).toBe(90_000);
    timer = transitionRestTimer(timer, { type: "add" }, 500_000, 2)!;
    expect(remainingRestMs(timer, 500_000)).toBe(120_000);
    timer = transitionRestTimer(timer, { type: "resume" }, 500_000, 2)!;
    expect(timer).toMatchObject({ deadline: 620_000, mode: "running" });
    timer = transitionRestTimer(timer, { type: "add" }, 501_000, 2)!;
    expect(timer).toMatchObject({ deadline: 650_000 });
    timer = transitionRestTimer(timer, { type: "reset" }, 510_000, 2)!;
    expect(timer).toMatchObject({ deadline: 630_000 });
    timer = transitionRestTimer(timer, { type: "pause" }, 520_000, 2)!;
    timer = transitionRestTimer(timer, { type: "reset" }, 530_000, 2)!;
    expect(timer).toMatchObject({ mode: "paused", remainingMs: 120_000 });
    expect(transitionRestTimer(timer, { type: "dismiss", setId: "other" }, 0, 2)).toBe(timer);
    expect(transitionRestTimer(timer, { type: "dismiss" }, 0, 2)).toBeNull();
  });
  it("completes once despite delayed ticks and replaces only with a valid start", () => {
    const timer = transitionRestTimer(null, { type: "start", setId: "a", durationSeconds: 1 }, 0, 1)!;
    const done = transitionRestTimer(timer, { type: "tick" }, 20_000, 2)!;
    expect(done.mode).toBe("completed");
    expect(transitionRestTimer(done, { type: "tick" }, 30_000, 2)).toBe(done);
    expect(() => transitionRestTimer(timer, { type: "start", setId: "b", durationSeconds: -1 }, 0, 2)).toThrow();
    expect(transitionRestTimer(done, { type: "start", setId: "b", durationSeconds: 30 }, 20_000, 2)).toMatchObject({ id: 2, setId: "b", deadline: 50_000 });
  });
});
