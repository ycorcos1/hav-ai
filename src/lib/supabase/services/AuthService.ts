import type { AuthErrorCode, AuthResult, AuthSession } from "@/shared/contracts";

export type EmailPasswordCredentials = {
  email: string;
  password: string;
};

export type SessionListener = (session: AuthSession | null) => void;

export interface AuthService {
  signUp(credentials: EmailPasswordCredentials): Promise<AuthResult>;
  signIn(credentials: EmailPasswordCredentials): Promise<AuthResult>;
  signOut(): Promise<void>;
  getSession(): Promise<AuthSession | null>;
  subscribeToSession(listener: SessionListener): () => void;
}

export type AuthServiceOperation =
  | "signUp"
  | "signIn"
  | "signOut"
  | "getSession"
  | "subscribeToSession";

export class AuthServiceError extends Error {
  constructor(
    readonly operation: AuthServiceOperation,
    readonly code: AuthErrorCode,
  ) {
    super(`Authentication operation failed: ${operation}.`);
    this.name = "AuthServiceError";
  }
}
