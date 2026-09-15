import { SyncEngineLock } from "@/features/sync/services";

describe("SyncEngineLock", () => {
  it("shares one active processor across concurrent triggers", async () => {
    const lock = new SyncEngineLock();
    const deferred = createDeferred();
    const firstProcessor = jest.fn(async () => deferred.promise);
    const overlappingProcessor = jest.fn(async () => undefined);

    const reconnectRun = lock.run(firstProcessor);
    const foregroundRun = lock.run(overlappingProcessor);
    const manualRun = lock.run(overlappingProcessor);
    await flushMicrotasks();

    expect(lock.isRunning()).toBe(true);
    expect(firstProcessor).toHaveBeenCalledTimes(1);
    expect(overlappingProcessor).not.toHaveBeenCalled();
    expect(foregroundRun).toBe(reconnectRun);
    expect(manualRun).toBe(reconnectRun);

    deferred.resolve();
    await Promise.all([reconnectRun, foregroundRun, manualRun]);
    expect(lock.isRunning()).toBe(false);
  });

  it("allows a later pass after the active processor completes", async () => {
    const lock = new SyncEngineLock();
    const processor = jest.fn(async () => undefined);

    await lock.run(processor);
    await lock.run(processor);

    expect(processor).toHaveBeenCalledTimes(2);
  });

  it("releases the lock when the processor fails", async () => {
    const lock = new SyncEngineLock();
    const failure = new Error("sanitized sync failure");

    await expect(lock.run(async () => Promise.reject(failure))).rejects.toBe(failure);
    expect(lock.isRunning()).toBe(false);

    const recovery = jest.fn(async () => undefined);
    await expect(lock.run(recovery)).resolves.toBeUndefined();
    expect(recovery).toHaveBeenCalledTimes(1);
  });

  it("does not start a nested processor during the active run", async () => {
    const lock = new SyncEngineLock();
    const nestedProcessor = jest.fn(async () => undefined);
    let nestedRun: Promise<void> | undefined;

    const outerRun = lock.run(async () => {
      nestedRun = lock.run(nestedProcessor);
    });
    await outerRun;

    expect(nestedProcessor).not.toHaveBeenCalled();
    expect(nestedRun).toBe(outerRun);
  });
});

function createDeferred(): {
  promise: Promise<void>;
  resolve: () => void;
} {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
