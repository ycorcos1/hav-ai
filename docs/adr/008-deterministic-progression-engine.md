# ADR 008: Deterministic Progression Engine

## Status

Accepted

## Context

havAI must generate weight and rep recommendations after workouts based on session performance, recent history, targets, user preferences, and exercise configuration. Progression must be predictable, testable, and independent of AI. V1 explicitly excludes machine-learning progression models.

Recommendation semantics are locked and defined in `PROGRESSION_ENGINE.md` and `API_CONTRACTS.md`.

## Decision

Implement progression as a **pure deterministic module** (`calculateProgression() → ProgressionResult`). AI does not replace or override deterministic progression logic.

The progression engine does not:

```text
save recommendations
generate UUIDs
mark recommendations active
sync recommendations
call AI
```

Application use cases perform persistence, UUID generation, sync queuing, and lifecycle management.

## Reason

- Deterministic logic is unit-testable and produces reproducible outcomes for the same inputs.
- Progression must work offline immediately after a workout completes.
- AI in V1 explains recommendations and coaches users; it does not compute progression outcomes.
- Separating the pure engine from application concerns preserves clear boundaries and testability.

## Consequences

- Progression logic lives in a dedicated module with no I/O dependencies.
- Locked recommendation types (`increase_weight`, `increase_reps`, `repeat_target`, `maintain_weight`, `decrease_weight`, `insufficient_data`) must not be redefined in UI or AI layers.
- Recommendations are stored locally first, then synced to Supabase.
- Introducing ML-based progression requires a superseding ADR.
