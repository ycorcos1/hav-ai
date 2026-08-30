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
cp .env.example .env.local
npm run dev
```

Replace the values in `.env.local` with the public configuration for your development Supabase project. Expo exposes every `EXPO_PUBLIC_` value to the client, so never place private keys or server secrets there.

Use `npm run ios`, `npm run android`, or `npm run web` for a specific platform. See `docs/DEPLOYMENT.md` for the complete environment specification.

## Supabase Development Workflow

The Supabase CLI is installed as a project development dependency. Run it through `npx` so the
version recorded in `package-lock.json` is used consistently.

havAI initially links to one development Supabase project. On a new development machine:

```sh
npx supabase login
npx supabase link --project-ref <development-project-ref>
```

Find the non-secret project reference in the development project’s dashboard URL. Enter access
tokens and database passwords only in the local CLI prompt; never add them to this repository or
paste them into application environment files. Supabase stores link and authentication state
locally, and `supabase/.gitignore` excludes that machine-specific state.

Cloud schema changes must be represented by timestamped migration files:

```sh
npx supabase migration new <descriptive_name>
# Edit and review supabase/migrations/<timestamp>_<descriptive_name>.sql
npx supabase db push --dry-run
npx supabase db push
```

When a local container runtime is available, validate migrations from a clean database with
`npx supabase start` and `npx supabase db reset` before applying them to the linked development
project. Dashboard-only schema changes are not an approved workflow: committed files under
`supabase/migrations/` are the source of truth. Production and preview Supabase projects are not
part of the current development stage.

After applying a cloud migration, regenerate the linked development project's public-schema types:

```sh
npm run supabase:types
```

This replaces `src/lib/supabase/database.types.ts` with official Supabase CLI output. Treat that
file as generated code and never edit it manually.

## Current Development Stage

```text
Phase 0: Repository preparation — complete
Task 1.1: Expo application scaffold — complete
Task 1.2: Minimal havAI shell — complete
Task 1.3: Strict TypeScript and source alias — complete
Task 1.4: Expo-compatible linting — complete
Task 1.5: Jest test infrastructure — complete
Task 1.6: Core project scripts — complete
Task 1.7: Environment handling — complete
Task 2.1: Root routing strategy — complete
Task 2.2: Main tab navigation — complete
Task 2.3: Feature-level placeholder screens — complete
Task 2.4: Route guard skeleton — complete
Task 3.1: Theme tokens — complete
Task 3.2: Typography system — complete
Task 3.3: Button components — complete
Task 3.4: Form/UI primitives — complete
Task 3.5: Status components — complete
Task 3.6: Bottom sheet foundation — complete; physical-device verification deferred
Task 4.1: Common contracts — complete
Task 4.2: Profile contracts — complete
Task 4.3: Exercise contracts — complete
Task 4.4: Workout contracts — complete
Task 4.5: Progression contracts — complete
Task 4.6: Personal record contracts — complete
Task 4.7: Sync contracts — complete
Task 4.8: AI contracts — complete
Task 4.9: Runtime validation — complete
Task 5.1: Expo SQLite connection and bootstrap — complete
Task 5.2: Local migration runner — complete
Task 5.3: Local workout tables — complete
Task 5.4: Authoritative local template tables — complete
Task 5.5: Local progression recommendation table — complete
Task 5.6: Sync queue table — complete
Task 5.7: Local exercise storage and recent-history cache — complete
Task 5.8: Local database mappers — complete
Task 5.9: Local repository interfaces and implementations — complete
Task 5.10: Local exercise preferences and note persistence — complete
Task 6.1: Supabase CLI and project structure — complete
Task 6.2: Mobile Supabase client — complete
Task 6.3: Profiles migration and row-level security — complete
Task 6.4: Generated Supabase database types — complete
Task 6.5: Profile repository and cloud mapping boundary — complete
Task 6.6: Authentication service and provider mapping boundary — complete
Next: Task 6.7 — Create Auth Routes
```

Execute one task at a time from `docs/MASTER_TASK_LIST.md`. Do not skip ahead.
