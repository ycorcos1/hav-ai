# ADR 009: Client-Generated UUIDs

## Status

Accepted

## Context

havAI operates local-first: templates, custom exercises, workouts, sets, and recommendations may be created offline before any cloud connection. Synchronizable entities must upsert idempotently so retries do not create duplicates. Custom exercises created offline are immediately referenced by templates and workouts using the same identifier that later becomes the cloud identifier.

## Decision

All synchronizable entities use **client-generated UUIDs**. The locally generated UUID is the canonical identifier that persists through sync to Supabase.

## Reason

- Offline creation requires stable identifiers before a server assigns IDs.
- Client-generated UUIDs enable idempotent upsert: retrying the same sync operation must not create duplicate records.
- A custom exercise UUID generated locally becomes the cloud UUID, preserving referential integrity across template, workout, and sync dependency graphs.
- Sync dependency ordering (custom exercise → template → template exercise; exercise → workout → workout exercise → set) relies on stable pre-sync identifiers.

## Consequences

- UUID generation occurs in application use cases, not inside the progression engine or UI components directly.
- Cloud upserts use the client UUID as the primary key.
- Server-assigned auto-increment IDs are not used for synchronizable domain entities.
- Changing to server-generated IDs or a different identity strategy requires a superseding ADR and sync contract updates.
