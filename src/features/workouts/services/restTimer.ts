export type RestTimer = {
  id: number;
  setId: string;
  durationMs: number;
} & (
  | { mode: "running"; deadline: number }
  | { mode: "paused"; remainingMs: number }
  | { mode: "completed" }
);

export type RestTimerAction =
  | { type: "start"; setId: string; durationSeconds: number }
  | { type: "pause" | "resume" | "reset" | "add" | "tick" }
  | { type: "dismiss"; setId?: string };

export function remainingRestMs(timer: RestTimer, now: number): number {
  if (timer.mode === "completed") return 0;
  return timer.mode === "paused" ? timer.remainingMs : Math.max(0, timer.deadline - now);
}

export function transitionRestTimer(
  timer: RestTimer | null,
  action: RestTimerAction,
  now: number,
  nextId: number,
): RestTimer | null {
  if (action.type === "start") {
    if (!Number.isSafeInteger(action.durationSeconds) || action.durationSeconds <= 0) {
      throw new Error("Rest duration must be a positive whole number.");
    }
    return { id: nextId, setId: action.setId, durationMs: action.durationSeconds * 1000,
      mode: "running", deadline: now + action.durationSeconds * 1000 };
  }
  if (!timer) return timer;
  if (action.type === "dismiss") {
    return !action.setId || timer.setId === action.setId ? null : timer;
  }
  const base = { id: timer.id, setId: timer.setId, durationMs: timer.durationMs };
  const remaining = remainingRestMs(timer, now);
  if (timer.mode === "completed") return timer;
  if (action.type === "tick") {
    return timer.mode === "running" && remaining === 0 ? { ...base, mode: "completed" } : timer;
  }
  if (action.type === "pause" && timer.mode === "running") {
    return remaining === 0 ? { ...base, mode: "completed" }
      : { ...base, mode: "paused", remainingMs: remaining };
  }
  if (action.type === "resume" && timer.mode === "paused") {
    return { ...base, mode: "running", deadline: now + remaining };
  }
  if (action.type === "reset") {
    return timer.mode === "paused" ? { ...base, mode: "paused", remainingMs: timer.durationMs }
      : { ...base, mode: "running", deadline: now + timer.durationMs };
  }
  if (action.type === "add") {
    return timer.mode === "paused" ? { ...base, mode: "paused", remainingMs: remaining + 30_000 }
      : { ...base, mode: "running", deadline: timer.deadline + 30_000 };
  }
  return timer;
}
