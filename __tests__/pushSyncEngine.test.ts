import {
  PushSyncEngine,
  SyncEngineLock,
  SyncPreconditionError,
  SyncRemoteError,
  syncRetryPolicy,
} from "@/features/sync/services";
import type {
  LocalSyncEntityStore,
  RemoteSyncGateway,
  SyncMutation,
  SyncPrerequisites,
  SyncUpsertMutation,
} from "@/features/sync/services";
import type {
  RemoteMutationResult,
  SyncDependencyResolver,
  SyncEntityReference,
  SyncQueueItem,
  SyncResult,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from "@/shared/contracts";
import type { SyncQueueRepository } from "@/db/repositories";

const timestamp = "2026-09-15T18:00:00.000Z";
const userId = "user-a";

describe("PushSyncEngine", () => {
  it("verifies authenticated owner and actual request capability before loading the queue", async () => {
    const queue = new MemoryQueue([]);
    const unauthorized = engine({ queue, authenticatedUserId: "user-b" });
    await expect(unauthorized.synchronize()).rejects.toEqual(
      new SyncPreconditionError("SYNC_AUTH_REQUIRED"),
    );
    expect(queue.loadCount).toBe(0);

    const unavailable = engine({ queue, canAttemptRequest: false });
    await expect(unavailable.synchronize()).rejects.toEqual(
      new SyncPreconditionError("SYNC_REQUEST_UNAVAILABLE"),
    );
    expect(queue.loadCount).toBe(0);
  });

  it("reloads latest state, uploads in dependency order, and confirms each success", async () => {
    const fixtures = workoutChain();
    const queue = new MemoryQueue([fixtures.setItem, fixtures.exerciseItem, fixtures.workoutItem]);
    const store = new MemoryStore([
      upsert("workout", fixtures.workout),
      upsert("workout_exercise", fixtures.exercise),
      upsert("set", fixtures.set),
    ]);
    const gateway = new RecordingGateway();
    const result = await engine({
      queue,
      store,
      gateway,
      dependencies: new Map([
        [key(fixtures.exerciseItem), [ref("workout", fixtures.workout.id)]],
        [key(fixtures.setItem), [ref("workout_exercise", fixtures.exercise.id)]],
      ]),
    }).synchronize();

    expect(gateway.calls.map(mutationKey)).toEqual([
      "workout:workout-a",
      "workout_exercise:workout-exercise-a",
      "set:set-a",
    ]);
    expect(store.loaded).toEqual(gateway.calls.map(mutationKey));
    expect(store.confirmed).toEqual(gateway.calls.map(mutationKey));
    expect(result).toMatchObject({
      success: true,
      processed: 3,
      succeeded: 3,
      failed: 0,
      remainingQueueSize: 0,
    });
  });

  it("retains a failed parent and skips its dependent while processing independent work", async () => {
    const fixtures = workoutChain();
    const independent = workout("workout-independent");
    const independentItem = queueItem("q-independent", "workout", independent.id, 3);
    const queue = new MemoryQueue([
      fixtures.workoutItem,
      fixtures.exerciseItem,
      independentItem,
    ]);
    const store = new MemoryStore([
      upsert("workout", fixtures.workout),
      upsert("workout_exercise", fixtures.exercise),
      upsert("workout", independent),
    ]);
    const gateway = new RecordingGateway({
      "workout:workout-a": [new SyncRemoteError("validation")],
    });

    const result = await engine({
      queue,
      store,
      gateway,
      dependencies: new Map([
        [key(fixtures.exerciseItem), [ref("workout", fixtures.workout.id)]],
      ]),
    }).synchronize();

    expect(gateway.calls.map(mutationKey)).toEqual([
      "workout:workout-a",
      "workout:workout-independent",
    ]);
    expect(await queue.getPending()).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "q-workout" }),
      expect.objectContaining({ id: "q-exercise" }),
    ]));
    expect(result).toMatchObject({ processed: 2, succeeded: 1, failed: 1, remainingQueueSize: 2 });
  });

  it("keeps cycle members pending while processing an unrelated component", async () => {
    const recommendationItem = queueItem(
      "q-recommendation", "progression_recommendation", "recommendation-a", 1,
    );
    const exerciseItem = queueItem(
      "q-exercise", "workout_exercise", "workout-exercise-a", 2,
    );
    const independent = workout("workout-independent");
    const independentItem = queueItem("q-independent", "workout", independent.id, 0);
    const queue = new MemoryQueue([recommendationItem, exerciseItem, independentItem]);

    const result = await engine({
      queue,
      store: new MemoryStore([upsert("workout", independent)]),
      dependencies: new Map([
        [key(recommendationItem), [ref("workout_exercise", exerciseItem.entityId)]],
        [key(exerciseItem), [ref("progression_recommendation", recommendationItem.entityId)]],
      ]),
    }).synchronize();

    expect(result).toMatchObject({
      success: false,
      processed: 1,
      succeeded: 1,
      remainingQueueSize: 2,
    });
    expect(result.errors).toEqual([
      expect.objectContaining({ queueItemId: "q-recommendation", code: "SYNC_DEPENDENCY_CYCLE" }),
      expect.objectContaining({ queueItemId: "q-exercise", code: "SYNC_DEPENDENCY_CYCLE" }),
    ]);
    expect((await queue.getPending()).map(({ id }) => id)).toEqual([
      "q-recommendation",
      "q-exercise",
    ]);
  });

  it.each([
    ["network"],
    ["timeout"],
    ["server"],
  ] as const)("retries bounded transient %s failures", async (category) => {
    const fixture = workoutChain();
    const queue = new MemoryQueue([fixture.workoutItem]);
    const gateway = new RecordingGateway({
      "workout:workout-a": [
        new SyncRemoteError(category),
        new SyncRemoteError(category),
        new SyncRemoteError(category),
      ],
    });
    const delays: number[] = [];

    const result = await engine({
      queue,
      gateway,
      store: new MemoryStore([upsert("workout", fixture.workout)]),
      delay: async (milliseconds) => { delays.push(milliseconds); },
    }).synchronize();

    expect(gateway.calls).toHaveLength(syncRetryPolicy.maxAttemptsPerRun);
    expect(delays).toEqual([...syncRetryPolicy.backoffMilliseconds]);
    expect(result).toMatchObject({ success: false, failed: 1, remainingQueueSize: 1 });
    expect((await queue.getPending())[0]).toMatchObject({
      attemptCount: syncRetryPolicy.maxAttemptsPerRun,
      lastError: `SYNC_${category.toUpperCase()}_ERROR`,
    });
  });

  it.each([
    "authentication",
    "authorization",
    "constraint",
    "validation",
  ] as const)("does not aggressively retry permanent %s failures", async (category) => {
    const fixture = workoutChain();
    const queue = new MemoryQueue([fixture.workoutItem]);
    const gateway = new RecordingGateway({
      "workout:workout-a": [new SyncRemoteError(category)],
    });

    await engine({
      queue,
      gateway,
      store: new MemoryStore([upsert("workout", fixture.workout)]),
    }).synchronize();

    expect(gateway.calls).toHaveLength(1);
    expect(await queue.getPending()).toHaveLength(1);
  });

  it("keeps a newer local mutation queued when the uploaded snapshot is no longer current", async () => {
    const fixture = workoutChain();
    const queue = new MemoryQueue([fixture.workoutItem]);
    const store = new MemoryStore([upsert("workout", fixture.workout)]);
    store.confirmCurrent = false;

    const result = await engine({ queue, store }).synchronize();

    expect(store.confirmed).toEqual(["workout:workout-a"]);
    expect(await queue.getPending()).toHaveLength(1);
    expect(result).toMatchObject({ success: false, succeeded: 0, remainingQueueSize: 1 });
  });
});

describe("push synchronization idempotency", () => {
  it("converges to one cloud entity when commit succeeds but its acknowledgement is lost", async () => {
    const fixture = workoutChain();
    const queue = new MemoryQueue([fixture.workoutItem]);
    const store = new MemoryStore([upsert("workout", fixture.workout)]);
    const gateway = new IdempotentGateway(true);

    const result = await engine({ queue, store, gateway }).synchronize();

    expect(result.success).toBe(true);
    expect(gateway.rows.size).toBe(1);
    expect(gateway.calls.map(mutationKey)).toEqual([
      "workout:workout-a",
      "workout:workout-a",
    ]);
    expect(await queue.getPending()).toEqual([]);
  });

  it("coalesces duplicate triggers through the shared lock", async () => {
    const fixture = workoutChain();
    const queue = new MemoryQueue([fixture.workoutItem]);
    const store = new MemoryStore([upsert("workout", fixture.workout)]);
    const deferred = createDeferred<RemoteMutationResult>();
    const started = createDeferred<void>();
    const gateway: RemoteSyncGateway = {
      apply: jest.fn(() => {
        started.resolve();
        return deferred.promise;
      }),
    };
    const syncEngine = engine({ queue, store, gateway });

    const reconnect = syncEngine.synchronize();
    const foreground = syncEngine.synchronize();
    await started.promise;
    expect(gateway.apply).toHaveBeenCalledTimes(1);

    deferred.resolve({ serverUpdatedAt: timestamp });
    await expect(Promise.all([reconnect, foreground])).resolves.toEqual([
      expect.objectContaining({ success: true }),
      expect.objectContaining({ success: true }),
    ]);
    expect(gateway.apply).toHaveBeenCalledTimes(1);
  });

  it("retries safely after an app-style engine restart and repeated later invocation", async () => {
    const fixture = workoutChain();
    const queue = new MemoryQueue([fixture.workoutItem]);
    const store = new MemoryStore([upsert("workout", fixture.workout)]);
    const gateway = new IdempotentGateway(false);
    gateway.failNext = new SyncRemoteError("authentication");

    await engine({ queue, store, gateway }).synchronize();
    expect(await queue.getPending()).toHaveLength(1);

    const restartedEngine = engine({ queue, store, gateway });
    await expect(restartedEngine.synchronize()).resolves.toMatchObject({ success: true });
    await expect(restartedEngine.synchronize()).resolves.toMatchObject({
      success: true,
      processed: 0,
    });
    expect(gateway.rows.size).toBe(1);
  });
});

type EngineOptions = {
  authenticatedUserId?: string | null;
  canAttemptRequest?: boolean;
  delay?: (milliseconds: number) => Promise<void>;
  dependencies?: Map<string, SyncEntityReference[]>;
  gateway?: RemoteSyncGateway;
  queue: SyncQueueRepository;
  store?: LocalSyncEntityStore;
};

function engine(options: EngineOptions): PushSyncEngine {
  const prerequisites: SyncPrerequisites = {
    getAuthenticatedUserId: async () => options.authenticatedUserId === undefined
      ? userId
      : options.authenticatedUserId,
    canAttemptRequest: async () => options.canAttemptRequest ?? true,
  };
  const resolver: SyncDependencyResolver = {
    getDependencies: async (item) => options.dependencies?.get(key(item)) ?? [],
  };
  return new PushSyncEngine(
    userId,
    prerequisites,
    options.queue,
    resolver,
    options.store ?? new MemoryStore([]),
    options.gateway ?? new RecordingGateway(),
    new SyncEngineLock<SyncResult>(),
    options.delay ?? (async () => undefined),
  );
}

class MemoryQueue implements SyncQueueRepository {
  readonly items: SyncQueueItem[];
  loadCount = 0;

  constructor(items: SyncQueueItem[]) {
    this.items = items.map((item) => ({ ...item }));
  }

  async enqueueOrCoalesce(item: SyncQueueItem): Promise<void> {
    this.items.push({ ...item });
  }

  async getPending(): Promise<SyncQueueItem[]> {
    this.loadCount += 1;
    return this.items.map((item) => ({ ...item }));
  }

  async markAttempt(id: string, error?: string): Promise<void> {
    const item = this.items.find((candidate) => candidate.id === id);
    if (!item) return;
    item.attemptCount += 1;
    item.lastError = error;
    item.lastAttemptAt = timestamp;
  }

  async remove(id: string): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index >= 0) this.items.splice(index, 1);
  }
}

class MemoryStore implements LocalSyncEntityStore {
  readonly mutations: Map<string, SyncMutation>;
  readonly loaded: string[] = [];
  readonly confirmed: string[] = [];
  confirmCurrent = true;

  constructor(mutations: SyncMutation[]) {
    this.mutations = new Map(mutations.map((mutation) => [mutationKey(mutation), mutation]));
  }

  async loadLatest(item: SyncQueueItem): Promise<SyncMutation | null> {
    this.loaded.push(key(item));
    return this.mutations.get(key(item)) ?? null;
  }

  async confirmUpsert(
    _item: SyncQueueItem,
    mutation: SyncUpsertMutation,
    _result: RemoteMutationResult,
  ): Promise<boolean> {
    this.confirmed.push(mutationKey(mutation));
    return this.confirmCurrent;
  }

  async confirmDelete(item: SyncQueueItem): Promise<boolean> {
    this.confirmed.push(key(item));
    return true;
  }
}

class RecordingGateway implements RemoteSyncGateway {
  readonly calls: SyncMutation[] = [];

  constructor(private readonly failures: Record<string, Error[]> = {}) {}

  async apply(mutation: SyncMutation): Promise<RemoteMutationResult> {
    this.calls.push(mutation);
    const failure = this.failures[mutationKey(mutation)]?.shift();
    if (failure) throw failure;
    return { serverUpdatedAt: timestamp };
  }
}

class IdempotentGateway implements RemoteSyncGateway {
  readonly calls: SyncMutation[] = [];
  readonly rows = new Map<string, SyncMutation>();
  failNext: Error | undefined;

  constructor(private loseFirstAcknowledgement: boolean) {}

  async apply(mutation: SyncMutation): Promise<RemoteMutationResult> {
    this.calls.push(mutation);
    this.rows.set(mutationKey(mutation), mutation);
    if (this.loseFirstAcknowledgement) {
      this.loseFirstAcknowledgement = false;
      throw new SyncRemoteError("network");
    }
    if (this.failNext) {
      const failure = this.failNext;
      this.failNext = undefined;
      throw failure;
    }
    return { serverUpdatedAt: timestamp };
  }
}

function workoutChain(): {
  workout: Workout;
  exercise: WorkoutExercise;
  set: WorkoutSet;
  workoutItem: SyncQueueItem;
  exerciseItem: SyncQueueItem;
  setItem: SyncQueueItem;
} {
  const exercise: WorkoutExercise = {
    id: "workout-exercise-a",
    userId,
    workoutId: "workout-a",
    exerciseId: "exercise-a",
    position: 0,
    sets: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const set: WorkoutSet = {
    id: "set-a",
    userId,
    workoutId: "workout-a",
    workoutExerciseId: exercise.id,
    exerciseId: exercise.exerciseId,
    position: 0,
    setType: "working",
    reps: 8,
    completedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const workoutValue = workout("workout-a", [exercise]);
  return {
    workout: workoutValue,
    exercise,
    set,
    workoutItem: queueItem("q-workout", "workout", workoutValue.id, 0),
    exerciseItem: queueItem("q-exercise", "workout_exercise", exercise.id, 1),
    setItem: queueItem("q-set", "set", set.id, 2),
  };
}

function workout(id: string, exercises: WorkoutExercise[] = []): Workout {
  return {
    id,
    userId,
    name: id,
    status: "completed",
    startedAt: timestamp,
    completedAt: timestamp,
    exercises,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function upsert<Type extends SyncUpsertMutation["entityType"]>(
  entityType: Type,
  entity: Extract<SyncUpsertMutation, { entityType: Type }>["entity"],
): Extract<SyncUpsertMutation, { entityType: Type }> {
  return { entityType, operation: "upsert", entity } as Extract<
    SyncUpsertMutation,
    { entityType: Type }
  >;
}

function queueItem(
  id: string,
  entityType: SyncQueueItem["entityType"],
  entityId: string,
  seconds: number,
): SyncQueueItem {
  return {
    id,
    entityType,
    entityId,
    operation: "upsert",
    attemptCount: 0,
    createdAt: new Date(Date.parse(timestamp) + seconds * 1_000).toISOString(),
  };
}

function ref(
  entityType: SyncEntityReference["entityType"],
  entityId: string,
): SyncEntityReference {
  return { entityType, entityId };
}

function key(reference: SyncEntityReference): string {
  return `${reference.entityType}:${reference.entityId}`;
}

function mutationKey(mutation: SyncMutation): string {
  return mutation.operation === "upsert"
    ? `${mutation.entityType}:${mutation.entity.id}`
    : `${mutation.entityType}:${mutation.entityId}`;
}

function createDeferred<Value>(): {
  promise: Promise<Value>;
  resolve: (value: Value) => void;
} {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}
