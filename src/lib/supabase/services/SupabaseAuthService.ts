import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import {
  authErrorCodeFromSupabase,
  authResultFromSupabase,
  authSessionFromSupabase,
} from "@/lib/supabase/mappers/authMapper";
import type { AuthResult, AuthSession } from "@/shared/contracts";

import {
  AuthServiceError,
  type AuthService,
  type AuthServiceOperation,
  type EmailPasswordCredentials,
  type SessionListener,
} from "./AuthService";

export class SupabaseAuthService implements AuthService {
  constructor(private readonly client: SupabaseClient<Database> = supabase) {}

  async signUp(credentials: EmailPasswordCredentials): Promise<AuthResult> {
    try {
      const { data, error } = await this.client.auth.signUp(credentials);

      if (error) throw serviceError("signUp", error);
      if (!data.user) throw serviceError("signUp");

      return authResultFromSupabase(data.user, data.session);
    } catch (error) {
      throw normalizeError("signUp", error);
    }
  }

  async signIn(credentials: EmailPasswordCredentials): Promise<AuthResult> {
    try {
      const { data, error } = await this.client.auth.signInWithPassword(credentials);

      if (error) throw serviceError("signIn", error);
      if (!data.user) throw serviceError("signIn");

      return authResultFromSupabase(data.user, data.session);
    } catch (error) {
      throw normalizeError("signIn", error);
    }
  }

  async signOut(): Promise<void> {
    try {
      const { error } = await this.client.auth.signOut();

      if (error) throw serviceError("signOut", error);
    } catch (error) {
      throw normalizeError("signOut", error);
    }
  }

  async getSession(): Promise<AuthSession | null> {
    try {
      const { data, error } = await this.client.auth.getSession();

      if (error) throw serviceError("getSession", error);

      return authSessionFromSupabase(data.session);
    } catch (error) {
      throw normalizeError("getSession", error);
    }
  }

  subscribeToSession(listener: SessionListener): () => void {
    try {
      const { data } = this.client.auth.onAuthStateChange((_event, session) => {
        listener(authSessionFromSupabase(session));
      });
      let subscribed = true;

      return () => {
        if (!subscribed) return;

        subscribed = false;
        data.subscription.unsubscribe();
      };
    } catch (error) {
      throw normalizeError("subscribeToSession", error);
    }
  }
}

function normalizeError(operation: AuthServiceOperation, error: unknown): AuthServiceError {
  return error instanceof AuthServiceError ? error : serviceError(operation, error);
}

function serviceError(operation: AuthServiceOperation, error?: unknown): AuthServiceError {
  return new AuthServiceError(operation, authErrorCodeFromSupabase(error));
}
