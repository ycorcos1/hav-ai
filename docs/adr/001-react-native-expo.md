# ADR 001: React Native with Expo

## Status

Accepted

## Context

havAI V1 is a mobile-first workout application that must support fast gym interactions, offline usability, and reliable local persistence. The product must remain understandable and maintainable by a small team using Cursor for implementation.

V1 explicitly excludes microservices, custom backend servers, and complex infrastructure that would increase operational cost without serving current product requirements.

## Decision

Build havAI V1 as a **React Native** application using **Expo** and **TypeScript**.

## Reason

- React Native provides a mature cross-platform mobile foundation for iOS and Android from one codebase.
- Expo reduces native toolchain complexity and supports the approved development workflow (Expo Go, simulators, EAS Build).
- TypeScript aligns with the repository's contract-first, testable architecture goals.
- This stack supports fast iteration, low infrastructure cost, and future extensibility without introducing a custom mobile platform.

## Consequences

- All mobile UI, application logic, repositories, and local persistence live in the Expo/React Native project.
- Native modules must be compatible with the Expo workflow unless a deliberate architecture change supersedes this ADR.
- Deployment uses Expo tooling (Expo Go for development, EAS Build for store releases).
- Alternative mobile frameworks (Flutter, native-only iOS/Android) are out of scope for V1.
