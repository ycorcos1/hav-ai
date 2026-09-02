export function elapsedWorkoutSeconds(startedAt: string, nowMilliseconds: number): number {
  const startedAtMilliseconds = Date.parse(startedAt);
  if (!Number.isFinite(startedAtMilliseconds) || !Number.isFinite(nowMilliseconds)) return 0;
  return Math.max(0, Math.floor((nowMilliseconds - startedAtMilliseconds) / 1000));
}

export function formatWorkoutElapsedTime(elapsedSeconds: number): string {
  const wholeSeconds = Math.max(0, Math.floor(elapsedSeconds));
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const seconds = wholeSeconds % 60;

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}
