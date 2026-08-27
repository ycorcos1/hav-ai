# ADR 011: Kilograms as Canonical Weight Unit

## Status

Accepted

## Context

havAI supports user display preferences for pounds or kilograms, but all persisted load values must use a single canonical unit to avoid ambiguous storage, inconsistent calculations, and sync conflicts. Weight fields must be unambiguous in domain models, SQLite schemas, Supabase columns, and API contracts.

## Decision

**All internal and stored load values use kilograms.**

```text
ALL INTERNAL/STORED LOAD VALUES = KILOGRAMS
```

Example: a user entering `185 lb` is stored internally as approximately `83.9146 kg`.

Domain and infrastructure fields use explicit naming:

```text
weightKg
recommendedWeightKg
estimated1RMKg
```

Avoid ambiguous field names such as `weight` where the unit is unclear.

## Reason

- A single canonical unit eliminates ambiguity in SQLite, Supabase, progression calculations, and sync payloads.
- Display preference (`lb` or `kg`) affects rendering, input conversion, and formatting only — it does not rewrite stored workout history.
- Explicit `*Kg` field naming makes unit expectations enforceable in types, contracts, and code review.
- Conversion occurs at the UI/input mapper boundary (`lbToKg()` on input; reverse on display).

## Consequences

- All repositories, mappers, and contracts store and transmit weights in kilograms.
- UI layers convert between display units and canonical kilograms at input/output boundaries.
- Tests must use kilograms for persisted values unless explicitly testing display conversion.
- Changing the canonical unit requires a superseding ADR, schema migration, and contract updates across all layers.
