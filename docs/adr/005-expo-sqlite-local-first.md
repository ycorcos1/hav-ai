# ADR 005: Expo SQLite Local-First

## Status

Accepted

## Context

havAI's core architectural principle is **local-first for workout-critical data**. Users must create templates, log sets, finish workouts, and receive progression recommendations without network connectivity. Active workouts, templates, custom exercises, and recommendations may exist locally before ever reaching the cloud.

React state and query caches are not durable authorities for workout data.

## Decision

Use **Expo SQLite** as the authoritative local persistence layer for workout-critical data, following a **local-first** model.

SQLite stores authoritative local data including:

```text
workout templates and template exercises
custom exercises
workouts, workout exercises, and sets
progression recommendations
sync queue
```

## Reason

- Gym usage requires immediate durability even when Supabase is unavailable.
- Active workouts must survive app restarts and live in SQLite, not solely in React state or Supabase.
- Templates and custom exercises must be creatable and editable offline; their UUIDs are generated locally and later become cloud UUIDs.
- Recommendations generated after offline workouts must persist locally until sync succeeds.
- Read caches (e.g. recent exercise sessions) are replaceable and distinct from authoritative unsynced user data.

## Consequences

- All workout-critical mutations commit to SQLite inside transactions before UI confirmation.
- A sync queue tracks entities pending cloud upload.
- Cloud pull must never overwrite active local workout state (exercise order, targets, completed sets, notes, recommendation snapshot).
- Push-before-pull ordering protects newer local work from older cloud state.
- Replacing SQLite or abandoning local-first semantics requires a superseding ADR.
