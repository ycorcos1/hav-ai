import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

export type AuthenticatedAIRequest = {
  user: User;
  client: SupabaseClient<Database>;
};

export type AuthenticateAIRequest = (request: Request) => Promise<AuthenticatedAIRequest | null>;

export function createAIRequestAuthenticator(
  createClient: (authorization: string) => SupabaseClient<Database>,
): AuthenticateAIRequest {
  return async (request) => {
    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return null;
    const client = createClient(authorization);
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) return null;
    return { user: data.user, client };
  };
}

