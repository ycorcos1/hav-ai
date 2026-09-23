# Production Environment Checklist

Do not create or connect production infrastructure until external or beta use requires it. Complete this checklist deliberately before any production build is distributed.

## Separate Supabase project

- [ ] Create a production Supabase project owned by the intended production organization.
- [ ] Confirm development and production project references are different.
- [ ] Prevent development builds and automated tests from targeting production.
- [ ] Record production ownership, access, backup, and recovery responsibilities outside the repository.

## Migrations and seed data

- [ ] Replay every committed migration against a clean local database.
- [ ] Run the full pgTAP suite and database lint before production deployment.
- [ ] Review the linked production migration plan with `supabase db push --linked --dry-run`.
- [ ] Apply only reviewed, source-controlled migrations in chronological order.
- [ ] Do not apply development fixture data to production.
- [ ] Seed only the canonical idempotent system-exercise dataset when explicitly intended.
- [ ] Regenerate and verify public database types from the production-equivalent schema.

## RLS and authorization

- [ ] Confirm RLS is enabled on every user-owned table.
- [ ] Run the two-user read/write and cross-user child/parent reference attack suite.
- [ ] Confirm authenticated users can read but cannot mutate system exercises.
- [ ] Confirm Edge Functions reject missing, invalid, and cross-owner authorization.
- [ ] Confirm service-role credentials are used only in trusted server environments.

## Production environment variables

- [ ] Configure `EXPO_PUBLIC_APP_ENV=production` in the production EAS environment.
- [ ] Configure the production Supabase URL and publishable client key.
- [ ] Confirm no development URL or project reference is present in the production build configuration.
- [ ] Confirm no service-role key, database password, OpenAI key, access token, or signing secret is bundled into the client.
- [ ] Run `npm run security:secrets` against the release commit.

## OpenAI and Edge Functions

- [ ] Store the production OpenAI key only as a production Supabase server secret.
- [ ] Deploy `ai-diagnostics`, `coach`, `explain-recommendation`, and `parse-workout` from the reviewed commit.
- [ ] Record and verify the production provider, model names, and prompt versions.
- [ ] Verify authentication, ownership, input limits, structured output validation, sanitized failures, and rate controls.
- [ ] Confirm AI failure cannot block workouts, deterministic progression, history, metrics, or synchronization.

## Release verification

- [ ] Create the production EAS project/environment only after the production backend is ready.
- [ ] Verify the bundle identifier is `com.yahavcorcos.havai`.
- [ ] Complete signing, provisioning, installation, and physical-device checks through an approved Apple/EAS workflow.
- [ ] Run the full automated regression checklist from `docs/TESTING.md`.
- [ ] Complete the manual pre-gym and real-gym checks before external distribution.
- [ ] Record the release commit, migration state, function versions, build ID, and rollback plan.

## Current status

Production infrastructure has not been created. Apple/EAS signing, provisioning, installation, and physical-device verification are **DEFERRED — Apple/EAS/physical-device environment unavailable**.
