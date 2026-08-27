# ADR 002: Expo Router

## Status

Accepted

## Context

havAI requires structured navigation across authentication, onboarding, main tabs, and deep-linked workout flows. Route files must remain thin, with business logic kept out of navigation components.

The approved application structure defines route groups for auth, onboarding, tabs, and feature-specific screens.

## Decision

Use **Expo Router** as the V1 navigation and routing framework.

## Reason

- Expo Router is the approved file-based routing solution for Expo applications.
- It supports the required route structure: `(auth)`, `(onboarding)`, `(tabs)`, and feature routes such as `workout/`, `template/`, and `exercise/`.
- File-based routing keeps navigation discoverable and aligns with Expo conventions.
- Route files can remain thin delegators to feature screens and hooks.

## Consequences

- Navigation is defined under `src/app/` using Expo Router conventions.
- Deep linking and tab structure follow Expo Router patterns.
- Alternative navigation libraries (React Navigation configured independently without Expo Router, or other routing frameworks) require a superseding ADR.
- Screen components live in feature modules; route files should not contain business logic.
