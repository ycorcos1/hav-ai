# ADR 006: Supabase Edge Functions

## Status

Accepted

## Context

Some havAI operations require server-side execution: OpenAI API key security, server-trusted context assembly, resource authorization, and request validation. Ordinary cloud CRUD does not require an Edge Function wrapper.

V1 AI features (Coach, Explain Recommendation, Parse Workout) and their security boundaries are defined in `AI_SYSTEM.md`.

## Decision

Use **Supabase Edge Functions** for logic that must remain server-side. Do not wrap every ordinary Supabase table operation in an Edge Function.

V1 Edge Function examples:

```text
coach
explain-recommendation
parse-workout
```

## Reason

- Edge Functions keep secrets and provider credentials off the mobile device.
- Server-side context retrieval uses authenticated user identity to fetch authorized cloud data.
- AI provider calls, prompt assembly, and response validation belong on the server.
- Direct Supabase client CRUD remains appropriate for standard synchronized entity operations.

## Consequences

- Edge Functions live under `supabase/functions/` with shared AI infrastructure in `_shared/`.
- Mobile screens invoke typed API client layers, not raw Edge Function URLs.
- New server-side-only capabilities should use Edge Functions rather than introducing a custom API server.
- Adding Express, NestJS, or other standalone backend services requires a superseding ADR.
