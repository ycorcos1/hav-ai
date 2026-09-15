import type {
  SyncDependencyResolver,
  SyncEntityReference,
  SyncQueueItem,
  SyncResult,
  UUID,
} from "@/shared/contracts";
import type { SyncQueueRepository } from "@/db/repositories";

import { planSyncDependencies } from "./syncDependencyGraph";
import { SyncEngineLock } from "./SyncEngineLock";
import {
  classifySyncFailure,
  syncRetryPolicy,
} from "./syncRetryPolicy";
import type {
  LocalSyncEntityStore,
  RemoteSyncGateway,
  SyncMutation,
  SyncPrerequisites,
  SyncProcessor,
} from "./syncTypes";

export class SyncPreconditionError extends Error {
  constructor(readonly code: "SYNC_AUTH_REQUIRED" | "SYNC_REQUEST_UNAVAILABLE") {
    super("Synchronization is not currently available.");
    this.name = "SyncPreconditionError";
  }
}

export class PushSyncEngine implements SyncProcessor {
  constructor(
    private readonly ownerUserId: UUID,
    private readonly prerequisites: SyncPrerequisites,
    private readonly queueRepository: SyncQueueRepository,
    private readonly dependencyResolver: SyncDependencyResolver,
    private readonly localStore: LocalSyncEntityStore,
    private readonly remoteGateway: RemoteSyncGateway,
    private readonly lock: SyncEngineLock<SyncResult>,
    private readonly delay: (milliseconds: number) => Promise<void> = defaultDelay,
  ) {}

  synchronize(): Promise<SyncResult> {
    return this.lock.run(() => this.processOnce());
  }

  private async processOnce(): Promise<SyncResult> {
    const authenticatedUserId = await this.prerequisites.getAuthenticatedUserId();
    if (authenticatedUserId !== this.ownerUserId) {
      throw new SyncPreconditionError("SYNC_AUTH_REQUIRED");
    }
    if (!await this.prerequisites.canAttemptRequest()) {
      throw new SyncPreconditionError("SYNC_REQUEST_UNAVAILABLE");
    }

    const pending = await this.queueRepository.getPending();
    const plan = await planSyncDependencies(pending, this.dependencyResolver);
    const unavailable = new Set<string>();
    const errors: SyncResult["errors"] = [];
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const cycle of plan.cycles) {
      for (const member of cycle.members) {
        const item = pending.find((candidate) => sameReference(candidate, member));
        if (!item) continue;
        unavailable.add(referenceKey(item));
        errors.push(toResultError(item, cycle.code));
      }
    }

    for (const item of plan.processable) {
      const dependencies = await this.dependencyResolver.getDependencies(item);
      if (dependencies.some((dependency) => unavailable.has(referenceKey(dependency)))) {
        unavailable.add(referenceKey(item));
        continue;
      }

      processed += 1;
      const mutation = await this.localStore.loadLatest(item);
      if (!mutation) {
        failed += 1;
        unavailable.add(referenceKey(item));
        const code = "SYNC_LOCAL_ENTITY_UNAVAILABLE";
        await this.queueRepository.markAttempt(item.id, code);
        errors.push(toResultError(item, code));
        continue;
      }

      const outcome = await this.applyWithRetry(item, mutation);
      if (!outcome.success) {
        failed += 1;
        unavailable.add(referenceKey(item));
        errors.push(toResultError(item, outcome.code));
        continue;
      }

      const confirmed = mutation.operation === "delete"
        ? await this.localStore.confirmDelete(item)
        : await this.localStore.confirmUpsert(item, mutation, outcome.result);
      if (!confirmed) continue;

      await this.queueRepository.remove(item.id);
      succeeded += 1;
    }

    const remainingQueueSize = (await this.queueRepository.getPending()).length;
    return {
      success: failed === 0 && remainingQueueSize === 0,
      processed,
      succeeded,
      failed,
      remainingQueueSize,
      errors,
    };
  }

  private async applyWithRetry(
    item: SyncQueueItem,
    mutation: SyncMutation,
  ): Promise<
    | { success: true; result: Awaited<ReturnType<RemoteSyncGateway["apply"]>> }
    | { success: false; code: string }
  > {
    for (let attempt = 0; attempt < syncRetryPolicy.maxAttemptsPerRun; attempt += 1) {
      try {
        return { success: true, result: await this.remoteGateway.apply(mutation) };
      } catch (error) {
        const failure = classifySyncFailure(error);
        await this.queueRepository.markAttempt(item.id, failure.code);
        const hasAnotherAttempt = attempt + 1 < syncRetryPolicy.maxAttemptsPerRun;
        if (!failure.retryable || !hasAnotherAttempt) {
          return { success: false, code: failure.code };
        }
        await this.delay(syncRetryPolicy.backoffMilliseconds[attempt]);
      }
    }
    return { success: false, code: "SYNC_UNKNOWN_ERROR" };
  }
}

function sameReference(
  left: SyncQueueItem,
  right: SyncEntityReference,
): boolean {
  return left.entityType === right.entityType && left.entityId === right.entityId;
}

function referenceKey(reference: SyncEntityReference): string {
  return `${reference.entityType}:${reference.entityId}`;
}

function toResultError(item: SyncQueueItem, code: string): SyncResult["errors"][number] {
  return {
    queueItemId: item.id,
    entityType: item.entityType,
    entityId: item.entityId,
    code,
  };
}

function defaultDelay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
