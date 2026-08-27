# ADR 004: Supabase Auth

## Status

Accepted

## Context

havAI requires user authentication for cloud sync, profile management, and secure access to user-owned data. Each authenticated user must have exactly one havAI profile. Authentication must integrate with Supabase RLS so cloud data is isolated per user.

V1 does not implement custom authentication servers or alternative identity providers as primary auth.

## Decision

Use **Supabase Auth** as the sole V1 authentication mechanism. Do not create custom authentication.

## Reason

- Supabase Auth integrates directly with PostgreSQL RLS using the authenticated user identity.
- It supports the required signup, login, session, and password-reset flows defined in the product specifications.
- Profile creation follows an idempotent `ensureProfile()` use case mapping `Supabase Auth User → profiles`.
- Custom auth would duplicate security-sensitive infrastructure without V1 product benefit.

## Consequences

- All authenticated cloud operations use Supabase session tokens.
- RLS policies reference `auth.uid()` for ownership enforcement.
- Application startup routing depends on session and onboarding state: no session → auth; session with incomplete onboarding → onboarding; session with complete onboarding → main tabs.
- Custom auth implementations (Express sessions, self-hosted JWT servers) are out of scope for V1.
