# havAI

havAI is a local-first workout progression app built with Expo, React Native, TypeScript, SQLite, Supabase, and optional AI coaching. Native SQLite is the canonical local store; cloud synchronization is additive and workout logging remains available offline.

## Prerequisites

- Node.js 22 LTS and npm
- Git
- Docker for the local Supabase stack
- A supported Expo development build or simulator for native testing

## Install and configure

```sh
npm ci
cp .env.example .env
```

Set only the public development values in `.env`:

```text
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

Every `EXPO_PUBLIC_*` value is bundled into the client. Never place an OpenAI key, Supabase service-role key, database password, or other privileged secret in the mobile environment.

## Run Expo

```sh
npm run dev
```

Platform-specific commands are `npm run ios`, `npm run android`, and `npm run web`. Native SQLite is the production persistence path. The browser uses an isolated development-preview adapter for UI and flow testing; browser storage does not validate SQLite behavior.

## Quality checks

```sh
npm run typecheck
npm run lint
npm test
npm run security:secrets
npx expo install --check
```

Jest covers unit, component, repository, offline durability, sync, progression, and AI contract behavior. PostgreSQL/RLS tests run through the local Supabase stack:

```sh
npx supabase test db
npx supabase db lint --local --schema public
```

See [docs/TESTING.md](docs/TESTING.md) for the complete verification policy.

## Supabase development

Start and rebuild the local stack from source-controlled migrations and seed data:

```sh
npx supabase start
npx supabase db reset --local
```

The detailed workflow for linking the development project, reviewing and applying migrations, seeding, generating types, and deploying functions is in [docs/DEVELOPMENT_SUPABASE.md](docs/DEVELOPMENT_SUPABASE.md).

Edge Functions:

- `ai-diagnostics`
- `coach`
- `explain-recommendation`
- `parse-workout`

Privileged OpenAI and Supabase credentials belong only in server-side secret storage.

## Architecture and specifications

- Product behavior: [docs/PRD.md](docs/PRD.md) and [docs/USER_FLOWS.md](docs/USER_FLOWS.md)
- Architecture and persistence: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/DATABASE.md](docs/DATABASE.md), and [docs/OFFLINE_SYNC.md](docs/OFFLINE_SYNC.md)
- Development and deployment: [docs/TESTING.md](docs/TESTING.md) and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- Canonical implementation sequence: [docs/MASTER_TASK_LIST.md](docs/MASTER_TASK_LIST.md)

The implementation is complete through Phase 25. Deployment preparation and final V1 validation remain intentionally staged; production infrastructure is not created until external or beta use requires it.

Do not use broad dependency repair commands such as `npm audit fix --force`. Dependency changes must remain explicit and Expo-compatible.
