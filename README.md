# havAI

havAI is a local-first mobile workout progression tracker for iOS and Android. It combines fast workout logging, deterministic progression logic, offline-first reliability, progress tracking, and optional AI coaching.

## Project Status

The Expo application foundation is scaffolded. Product functionality has not been implemented yet.

## Documentation Location

All approved specifications live in `/docs`:

```text
docs/
├── adr/
├── PRD.md
├── USER_FLOWS.md
├── DESIGN_SPEC.md
├── ARCHITECTURE.md
├── DATABASE.md
├── PROGRESSION_ENGINE.md
├── AI_SYSTEM.md
├── OFFLINE_SYNC.md
├── API_CONTRACTS.md
├── TESTING.md
├── DEPLOYMENT.md
├── CURSOR_RULES.md
└── MASTER_TASK_LIST.md
```

Implementation tasks are defined in `docs/MASTER_TASK_LIST.md`. Cursor behavior rules are in `docs/CURSOR_RULES.md`.

## Prerequisites

- Git
- A React Native-supported Node.js release (Node.js 22 LTS recommended) and npm
- Expo Go or a supported simulator for device testing

Install dependencies and start the Expo development server:

```sh
npm install
npm start
```

Use `npm run ios`, `npm run android`, or `npm run web` for a specific platform. See `docs/DEPLOYMENT.md` for the complete environment specification.

## Current Development Stage

```text
Phase 0: Repository preparation — complete
Task 1.1: Expo application scaffold — complete
Task 1.2: Minimal havAI shell — complete
Task 1.3: Strict TypeScript and source alias — complete
Task 1.4: Expo-compatible linting — complete
Task 1.5: Jest test infrastructure — complete
Next: Task 1.6 — Add Core Project Scripts
```

Execute one task at a time from `docs/MASTER_TASK_LIST.md`. Do not skip ahead.
