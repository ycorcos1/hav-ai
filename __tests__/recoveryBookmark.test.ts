import { readRecoveryBookmark, recoveryKey, writeRecoveryBookmark, type RecoveryStorage } from "@/features/workouts/services/recoveryBookmark";
import { createRecoveryStorage, recoveryPreviewPrefix } from "@/features/workouts/services/recoveryStorage.web";
import type { Workout } from "@/shared/contracts";

const time = "2026-09-01T00:00:00.000Z";
const workout: Workout = { id: "w", userId: "u", name: "Training", status: "active", startedAt: time,
  createdAt: time, updatedAt: time, exercises: [0, 1].map((position) => ({ id: `instance-${position}`,
    userId: "u", workoutId: "w", exerciseId: "same-library-exercise", position, sets: [], createdAt: time, updatedAt: time })) };

function memory() {
  const values = new Map<string, string>();
  const storage: RecoveryStorage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
  };
  return { storage, values };
}

describe("recovery bookmark", () => {
  it("distinguishes duplicate library exercises and keeps only an instance ID", async () => {
    const { storage, values } = memory();
    await writeRecoveryBookmark(storage, "u", workout, "instance-1");
    expect(await readRecoveryBookmark(storage, "u", workout)).toBe("instance-1");
    expect([...values.entries()]).toEqual([[recoveryKey("u", "w"), "instance-1"]]);
    await writeRecoveryBookmark(storage, "u", workout, "instance-0");
    expect(await readRecoveryBookmark(storage, "u", workout)).toBe("instance-0");
  });
  it("isolates users and workouts and ignores missing, foreign, or inactive instances", async () => {
    const { storage, values } = memory();
    await writeRecoveryBookmark(storage, "u", workout, "instance-1");
    expect(await readRecoveryBookmark(storage, "other", workout)).toBeUndefined();
    expect(await readRecoveryBookmark(storage, "u", { ...workout, id: "new-workout" })).toBeUndefined();
    expect(await readRecoveryBookmark(storage, "u", { ...workout, status: "discarded" })).toBeUndefined();
    for (const exercises of [[], [{ ...workout.exercises[1], workoutId: "other" }], [{ ...workout.exercises[1], userId: "other" }]]) {
      values.set(recoveryKey("u", "w"), "instance-1");
      expect(await readRecoveryBookmark(storage, "u", { ...workout, exercises })).toBeUndefined();
      expect(values.has(recoveryKey("u", "w"))).toBe(false);
    }
    await writeRecoveryBookmark(storage, "other", workout, "instance-1");
    await writeRecoveryBookmark(storage, "u", workout, "missing");
    expect(values.size).toBe(0);
  });
  it("does not propagate bookmark storage failures", async () => {
    const fail = async () => { throw new Error("unavailable"); };
    const storage = { getItem: fail, setItem: fail, removeItem: fail };
    await expect(readRecoveryBookmark(storage, "u", workout)).resolves.toBeUndefined();
    await expect(writeRecoveryBookmark(storage, "u", workout, "instance-1")).resolves.toBeUndefined();
  });
  it("uses an isolated web namespace with the same logical contract", async () => {
    const values = new Map<string, string>();
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    } });
    try {
      await writeRecoveryBookmark(createRecoveryStorage(), "u", workout, "instance-1");
      expect(await readRecoveryBookmark(createRecoveryStorage(), "u", workout)).toBe("instance-1");
      expect([...values.keys()]).toEqual([recoveryPreviewPrefix + recoveryKey("u", "w")]);
    } finally {
      if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
      else Reflect.deleteProperty(globalThis, "localStorage");
    }
  });
});
