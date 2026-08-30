import type { Database } from "@/lib/supabase/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

const profileTableName: keyof Database["public"]["Tables"] = "profiles";
const profileOwnerColumn: keyof ProfileRow = "user_id";

describe("generated Supabase database types", () => {
  it("exposes the public profiles table", () => {
    expect(profileTableName).toBe("profiles");
    expect(profileOwnerColumn).toBe("user_id");
  });
});
