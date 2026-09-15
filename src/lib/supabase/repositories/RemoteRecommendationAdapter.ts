import type {
  ProgressionRecommendation,
  RemoteMutationResult,
  UUID,
} from "@/shared/contracts";

export type UpdateRecommendationStatusInput = Pick<
  ProgressionRecommendation,
  "status" | "consumedAt"
> & {
  id: UUID;
};

export interface RemoteRecommendationAdapter {
  updateOwnRecommendationStatus(
    input: UpdateRecommendationStatusInput,
  ): Promise<RemoteMutationResult>;
  upsertOwnRecommendation(
    recommendation: ProgressionRecommendation,
  ): Promise<RemoteMutationResult>;
}

export type RemoteRecommendationAdapterOperation =
  | "updateOwnRecommendationStatus"
  | "upsertOwnRecommendation";

export class RemoteRecommendationAdapterError extends Error {
  readonly code = "REMOTE_RECOMMENDATION_ADAPTER_ERROR";

  constructor(readonly operation: RemoteRecommendationAdapterOperation) {
    super(`Remote recommendation operation failed: ${operation}.`);
    this.name = "RemoteRecommendationAdapterError";
  }
}
