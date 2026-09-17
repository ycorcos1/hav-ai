const mockFrom = jest.fn();
const mockGetUser = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import {
  RemoteUserExercisePreferenceAdapterError,
  SupabaseRemoteUserExercisePreferenceAdapter,
} from "@/lib/supabase/repositories";
import type { UserExercisePreference } from "@/shared/contracts";

const userId = "a0000000-0000-4000-8000-00000000000a";
const timestamp = "2026-09-16T12:00:00.000Z";
const preference: UserExercisePreference = {
  id: "preference-a",
  userId,
  exerciseId: "exercise-a",
  isFavorite: true,
  notes: "Seat position four",
  restDurationSeconds: 150,
  createdAt: timestamp,
  updatedAt: timestamp,
};

describe("SupabaseRemoteUserExercisePreferenceAdapter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
  });

  it("upserts the complete owned preference and returns server metadata", async () => {
    const single = jest.fn().mockResolvedValue({
      data: { updated_at: timestamp }, error: null,
    });
    const upsert = jest.fn(() => ({ select: jest.fn(() => ({ single })) }));
    mockFrom.mockReturnValue({ upsert });

    await expect(new SupabaseRemoteUserExercisePreferenceAdapter()
      .upsertOwnPreference(preference)).resolves.toEqual({ serverUpdatedAt: timestamp });
    expect(upsert).toHaveBeenCalledWith({
      id: preference.id,
      user_id: userId,
      exercise_id: preference.exerciseId,
      is_favorite: true,
      notes: "Seat position four",
      rest_duration_seconds: 150,
    }, { onConflict: "id" });
  });

  it("fetches a complete owner-scoped snapshot for pull reconciliation", async () => {
    const query = pagedQuery([cloudRow]);
    mockFrom.mockReturnValue(query);

    await expect(new SupabaseRemoteUserExercisePreferenceAdapter()
      .fetchOwnPreferences()).resolves.toEqual([{
      preference,
      serverUpdatedAt: timestamp,
    }]);
    expect(query.eq).toHaveBeenCalledWith("user_id", userId);
  });

  it("deletes idempotently through explicit ID and owner filters", async () => {
    const select = jest.fn().mockResolvedValue({ data: [], error: null });
    const ownerEq = jest.fn(() => ({ select }));
    const idEq = jest.fn(() => ({ eq: ownerEq }));
    const remove = jest.fn(() => ({ eq: idEq }));
    mockFrom.mockReturnValue({ delete: remove });

    await expect(new SupabaseRemoteUserExercisePreferenceAdapter()
      .deleteOwnPreference(preference.id)).resolves.toBeUndefined();
    expect(idEq).toHaveBeenCalledWith("id", preference.id);
    expect(ownerEq).toHaveBeenCalledWith("user_id", userId);
  });

  it("rejects foreign ownership and provider failures with sanitized errors", async () => {
    const adapter = new SupabaseRemoteUserExercisePreferenceAdapter();
    const foreignRequest = adapter.upsertOwnPreference({
      ...preference,
      userId: "foreign-user",
    });
    await expect(foreignRequest).rejects.toBeInstanceOf(
      RemoteUserExercisePreferenceAdapterError,
    );
    await expect(foreignRequest).rejects.not.toThrow("foreign-user");
    expect(mockFrom).not.toHaveBeenCalled();

    mockFrom.mockReturnValue(pagedQuery([], { message: "raw provider detail" }));
    const providerRequest = adapter.fetchOwnPreferences();
    await expect(providerRequest).rejects.toBeInstanceOf(
      RemoteUserExercisePreferenceAdapterError,
    );
    await expect(providerRequest).rejects.not.toThrow("raw provider detail");
  });
});

type PagedQuery = {
  select: jest.Mock;
  eq: jest.Mock;
  order: jest.Mock;
  range: jest.Mock;
};

function pagedQuery(data: object[], error: object | null = null): PagedQuery {
  const query: PagedQuery = {
    select: jest.fn(),
    eq: jest.fn(),
    order: jest.fn(),
    range: jest.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.range.mockResolvedValue({ data, error });
  return query;
}

const cloudRow = {
  id: preference.id,
  user_id: userId,
  exercise_id: preference.exerciseId,
  is_favorite: true,
  notes: preference.notes,
  rest_duration_seconds: preference.restDurationSeconds,
  created_at: timestamp,
  updated_at: timestamp,
};
