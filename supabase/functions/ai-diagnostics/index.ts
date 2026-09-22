import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import { loadAIConfig } from "../_shared/ai/index.ts";
import { createAIRequestAuthenticator } from "../_shared/auth.ts";
import { createAIDiagnosticsHandler } from "./handler.ts";

type EdgeRuntime = typeof globalThis & {
  Deno: {
    env: { get(name: string): string | undefined };
    serve(handler: (request: Request) => Response | Promise<Response>): void;
  };
};

const runtime = globalThis as EdgeRuntime;
const environment = (name: string) => runtime.Deno.env.get(name);
const config = loadAIConfig(environment);
const supabaseUrl = environment("SUPABASE_URL");
const supabaseKey = environment("SUPABASE_ANON_KEY") ?? environment("SUPABASE_PUBLISHABLE_KEY");
if (!supabaseUrl || !supabaseKey) throw new Error("Supabase Edge Function configuration is missing.");

const authenticate = createAIRequestAuthenticator((authorization) =>
  createClient<Database>(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  }),
);

runtime.Deno.serve(createAIDiagnosticsHandler({ authenticate, config }));
