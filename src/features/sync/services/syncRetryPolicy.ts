export type SyncFailureCategory =
  | "network"
  | "timeout"
  | "server"
  | "authentication"
  | "authorization"
  | "constraint"
  | "validation"
  | "unknown";

export const syncRetryPolicy = {
  maxAttemptsPerRun: 3,
  backoffMilliseconds: [250, 1_000] as const,
};

export class SyncRemoteError extends Error {
  readonly code: string;

  constructor(readonly category: SyncFailureCategory) {
    super("Remote synchronization failed.");
    this.name = "SyncRemoteError";
    this.code = syncFailureCode(category);
  }
}

export function classifySyncFailure(error: unknown): {
  code: string;
  retryable: boolean;
} {
  if (!(error instanceof SyncRemoteError)) {
    return { code: "SYNC_UNKNOWN_ERROR", retryable: false };
  }
  return {
    code: error.code,
    retryable: error.category === "network"
      || error.category === "timeout"
      || error.category === "server",
  };
}

function syncFailureCode(category: SyncFailureCategory): string {
  return `SYNC_${category.toUpperCase()}_ERROR`;
}
