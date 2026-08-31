export function reorderTemplateExercises<T>(
  exercises: T[],
  index: number,
  direction: "up" | "down",
): T[] {
  const destination = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || index >= exercises.length || destination < 0 || destination >= exercises.length) {
    return exercises;
  }
  const reordered = [...exercises];
  [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
  return reordered;
}
