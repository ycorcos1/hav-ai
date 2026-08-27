# ADR 003: Supabase PostgreSQL

## Status

Accepted

## Context

havAI requires secure cloud storage for authenticated user data, long-term workout history, templates, exercise libraries, recommendations, and persistent personal-record state. The cloud layer must support row-level security and integrate with the mobile client without a custom backend server.

V1 excludes MongoDB, Firebase, custom Node backends, GraphQL, and Redis.

## Decision

Use **Supabase** with **PostgreSQL** as the V1 cloud database, including **Row Level Security (RLS)**.

## Reason

- Supabase provides managed PostgreSQL with authentication, RLS, and client SDK integration suitable for a solo-developer workflow.
- PostgreSQL supports relational workout data, migrations, and the schema defined in `DATABASE.md`.
- RLS enforces per-user data isolation at the database layer.
- Direct authenticated Supabase client CRUD is appropriate for ordinary table operations; not every operation requires an Edge Function.
- This avoids operating a custom database server or introducing an additional persistence technology.

## Consequences

- Cloud schema is defined and migrated through Supabase migrations.
- All cloud tables enforce RLS policies scoped to the authenticated user.
- The mobile app uses the authenticated Supabase client for appropriate cloud CRUD.
- Server-controlled `created_at` and `updated_at` timestamps apply to cloud records.
- Replacing Supabase or PostgreSQL requires a superseding ADR.
