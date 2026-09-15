const mockFrom = jest.fn();
const mockGetUser = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import {
  RemoteRecommendationAdapterError,
  SupabaseRemoteRecommendationAdapter,
  type RemoteRecommendationAdapter,
} from "@/lib/supabase/repositories";
import type { ProgressionRecommendation } from "@/shared/contracts";

const userId = "a0000000-0000-4000-8000-00000000000a";
const timestamp = "2026-09-15T15:00:00.000Z";
const recommendation: ProgressionRecommendation = {
  id: "fa300000-0000-4000-8000-000000000001",
  userId,
  exerciseId: "10000000-0000-4000-8000-000000000001",
  recommendationType: "increase_weight",
  recommendedWeightKg: 82.5,
  targetSets: 3,
  targetMinReps: 8,
  targetMaxReps: 10,
  confidence: "high",
  reasonCodes: ["TOP_OF_REP_RANGE_REACHED"],
  status: "active",
  engineVersion: "progression-v1",
  createdAt: timestamp,
  updatedAt: timestamp,
};

describe("SupabaseRemoteRecommendationAdapter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
  });

  it("upserts a complete owned recommendation and returns server metadata", async () => {
    const single = jest.fn().mockResolvedValue({
      data: { updated_at: timestamp }, error: null,
    });
    const upsert = jest.fn(() => ({ select: jest.fn(() => ({ single })) }));
    mockFrom.mockReturnValue({ upsert });

    await expect(
      new SupabaseRemoteRecommendationAdapter().upsertOwnRecommendation(recommendation),
    ).resolves.toEqual({ serverUpdatedAt: timestamp });
    expect(mockFrom).toHaveBeenCalledWith("progression_recommendations");
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      id: recommendation.id,
      user_id: userId,
      reason_codes: ["TOP_OF_REP_RANGE_REACHED"],
    }), { onConflict: "id" });
  });

  it("updates only status fields through explicit recommendation and owner filters", async () => {
    const single = jest.fn().mockResolvedValue({
      data: { updated_at: timestamp }, error: null,
    });
    const select = jest.fn(() => ({ single }));
    const ownerEq = jest.fn(() => ({ select }));
    const idEq = jest.fn(() => ({ eq: ownerEq }));
    const update = jest.fn(() => ({ eq: idEq }));
    mockFrom.mockReturnValue({ update });

    await expect(new SupabaseRemoteRecommendationAdapter().updateOwnRecommendationStatus({
      id: recommendation.id,
      status: "consumed",
      consumedAt: timestamp,
    })).resolves.toEqual({ serverUpdatedAt: timestamp });
    expect(update).toHaveBeenCalledWith({ status: "consumed", consumed_at: timestamp });
    expect(idEq).toHaveBeenCalledWith("id", recommendation.id);
    expect(ownerEq).toHaveBeenCalledWith("user_id", userId);
  });

  it("rejects unauthenticated, cross-owner, and provider failures with sanitized errors", async () => {
    const adapter = new SupabaseRemoteRecommendationAdapter();
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(adapter.upsertOwnRecommendation(recommendation)).rejects.toBeInstanceOf(
      RemoteRecommendationAdapterError,
    );
    expect(mockFrom).not.toHaveBeenCalled();

    const foreignRequest = adapter.upsertOwnRecommendation({
      ...recommendation,
      userId: "foreign-user",
    });
    await expect(foreignRequest).rejects.toMatchObject({
      code: "REMOTE_RECOMMENDATION_ADAPTER_ERROR",
      operation: "upsertOwnRecommendation",
    });
    await expect(foreignRequest).rejects.not.toThrow("foreign-user");
    expect(mockFrom).not.toHaveBeenCalled();

    const single = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "raw ancestry error" },
    });
    mockFrom.mockReturnValue({
      upsert: jest.fn(() => ({ select: jest.fn(() => ({ single })) })),
    });
    const providerRequest = adapter.upsertOwnRecommendation(recommendation);
    await expect(providerRequest).rejects.toBeInstanceOf(RemoteRecommendationAdapterError);
    await expect(providerRequest).rejects.not.toThrow("raw ancestry error");
  });

  it("exposes individual remote operations without staged-write orchestration", () => {
    const adapter: RemoteRecommendationAdapter = new SupabaseRemoteRecommendationAdapter();
    expect(adapter).not.toHaveProperty("planDependencies");
    expect(adapter).not.toHaveProperty("processQueue");
  });
});
