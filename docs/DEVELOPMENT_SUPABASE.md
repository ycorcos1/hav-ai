# Development Supabase Workflow

Supabase migrations, seed data, database tests, generated types, and Edge Functions are source-controlled. The linked project is development-only; never run destructive tests against production.

## Local database

Docker must be running. Start the local stack, rebuild it from committed migrations and seed data, then run database tests and lint:

```sh
npx supabase start
npx supabase db reset --local
npx supabase test db
npx supabase db lint --local --schema public
```

`supabase/migrations/` is the schema source of truth. `supabase/seed.sql` is idempotent canonical seed data. Do not make dashboard-only schema changes.

## Link the development project

Authentication and linking are manual, machine-local steps:

```sh
npx supabase login
npx supabase link --project-ref <development-project-ref>
npx supabase migration list
```

Never commit CLI authentication, database passwords, or local Supabase state.

## Apply migrations and seed data

Review the linked migration plan before writing to the development project:

```sh
npx supabase db push --linked --dry-run
npx supabase db push --linked
```

Seed only when the target and data impact are intentional:

```sh
npx supabase db push --linked --include-seed --dry-run
npx supabase db push --linked --include-seed
```

Do not push migrations or seed data to a linked project from automated tests.

## Generate database types

After the linked development schema is current:

```sh
npm run supabase:types
npm run typecheck
git diff -- src/lib/supabase/database.types.ts
```

`src/lib/supabase/database.types.ts` is generated output; do not hand-edit it.

## Deploy Edge Functions

Deploy only to the explicitly linked development project:

```sh
npx supabase functions deploy ai-diagnostics
npx supabase functions deploy coach
npx supabase functions deploy explain-recommendation
npx supabase functions deploy parse-workout
```

Set `OPENAI_API_KEY` and other privileged values only as server-side Supabase secrets. They must never appear in `EXPO_PUBLIC_*`, mobile source, app configuration, logs, or committed files.

After deployment, verify authentication, ownership/RLS behavior, sanitized errors, and a representative function response against the development project.
