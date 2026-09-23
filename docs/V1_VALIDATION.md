# havAI V1 Validation Record

Date: 2026-09-23

This record separates implementation and automated evidence from external native verification. It does not claim that havAI has been installed or tested on a physical iPhone.

## Phase 26 deployment preparation

- GitHub CI runs secret-boundary validation, TypeScript, ESLint, the Jest suite, and selected offline/durability/sync integration tests.
- Installation, environment, Supabase, migration, seed, type-generation, test, and Edge Function workflows are documented.
- EAS development, preview, and production profiles exist.
- The iOS bundle identifier is `com.yahavcorcos.havai`.
- Production infrastructure remains intentionally uncreated; `PRODUCTION_ENVIRONMENT_CHECKLIST.md` is the release checklist.
- Cloud signing, provisioning, device registration, installation, and physical-device verification are **DEFERRED — Apple/EAS/physical-device environment unavailable**.

## Phase 27 task status

### 27.1 Fresh Install Test

Implementation and automated flow coverage are complete for signup, profile creation, onboarding, template creation, custom exercise creation, and workout start. A literal fresh physical installation is deferred with the external native environment.

Evidence: authentication service and screens, ensure-profile, onboarding, template creation, custom exercise, workout-start, root-routing, local migration, and bootstrap tests.

### 27.2 Full Happy Path

Automated verification is complete for workout start, previous performance, target display, set logging/editing, finish, summary, recommendation, history, progress, and Coach boundaries.

Evidence: `fullLocalWorkoutFlow`, active logging, summary, history, progress, Coach, and navigation suites. A physical end-to-end interaction pass remains deferred.

### 27.3 Full Offline Workout Test

Automated verification is complete for cached-data start, offline logging/editing, file close/reopen, active-workout recovery, finish, recommendation persistence, queue preservation, retry, idempotency, and exact-once convergence. No lost or duplicate set behavior is known.

Evidence: `fullLocalWorkoutFlow`, `localDurabilityIntegration`, startup recovery, cached-template start, push sync, dependency graph, queue, and sync-trigger suites. Actual airplane-mode and iOS force-close lifecycle behavior remains deferred.

### 27.4 Offline Template Test

Automated verification is complete. Offline create/edit state coalesces to the latest UUID-preserving graph and uploads once; archive/delete behavior converges without contradictory mutations.

### 27.5 Offline Custom Exercise Test

Automated verification is complete. Local custom exercise identity is preserved through synchronization, archived state converges, system exercises are never queued, and concrete-ID dependency ordering protects template/workout references.

### 27.6 Authentication Expiration Test

Automated verification is complete. An expired persisted owner can continue only through the validated offline-recovery path, local workout operations remain available, sign-out invalidates stale ownership, and sync requires current authenticated request capability before loading the queue. Physical token-expiration behavior remains deferred.

### 27.7 AI Outage Test

Automated verification is complete. Deterministic targets and recommendations remain visible when AI explanation fails; Coach is isolated; workouts, metrics, history, progression, and sync have no AI dependency.

### 27.8 RLS Multi-User Test

Complete against the disposable local Supabase stack. The database suite includes two-user read/write isolation, system/custom exercise policies, cross-user child/parent reference attacks, server-controlled metadata, foreign keys, and Edge Function ownership boundaries.

### 27.9 Real Gym Usability Test

**DEFERRED — Apple/EAS/physical-device environment unavailable.**

Tap count, one-handed use, keyboard friction, real screen readability, phone lock/recovery, target clarity, previous-performance visibility, and reception changes cannot be validated truthfully through Node, web export, or static source review.

### 27.10 Fix Real-Gym P0/P1 Issues

No P0/P1 issue is known from automated coverage or static review. Fixes driven by Task 27.9 remain deferred until real-gym evidence exists. No speculative feature or workaround was added.

### 27.11 Full Regression Checklist

Automated regression is complete:

- TypeScript: pass
- ESLint: pass
- Jest: 161 suites, 738 tests, 0 failures
- focused Phase 27 flows: 27 suites, 158 tests, 0 failures
- local Supabase migration replay: pass
- pgTAP: 10 files, 420 assertions, 0 failures
- database lint: no schema errors
- Expo dependency check: pass using the installed SDK compatibility map
- static web export: pass, 36 routes
- iOS JavaScript/Hermes export: pass
- secret boundary and tracked-local-state scans: pass
- `git diff --check`: pass

Platform graph:

- web: 1,165 sources; 0 `expo-sqlite`; 12 web-preview persistence sources
- iOS: 1,628 sources; 16 `expo-sqlite`; 0 web-preview persistence sources

Database state:

- local SQLite schema version: 8
- cloud migration files: 9
- migrations replay cleanly from an empty local Supabase database

### 27.12 Declare Personal V1 Ready

Implementation and automated release criteria are green: no known data-loss or duplicate-sync bug, recovery and offline completion are file-backed integration-tested, recommendations persist, and the deterministic progression golden suite passes.

Personal V1 is **not yet declared physically ready** because mandatory phone lifecycle and real-gym usability gates remain deferred. Readiness may be declared after Tasks 27.1–27.3, 27.6, and 27.9 receive their remaining physical evidence and any resulting Task 27.10 P0/P1 issues are resolved.

## Known deferred external verification

- Task 26.6: standalone cloud build, signing, provisioning, installation, launch without the Mac server, and native SQLite/offline smoke test.
- Task 27.1: literal fresh installation on a physical device.
- Task 27.2: physical full happy path.
- Task 27.3: airplane-mode, force-close, relaunch, and reconnect on iOS.
- Task 27.6: real device behavior across an expired session and reauthentication.
- Task 27.9: real-gym usability evaluation.
- Task 27.10: any fixes that can only be identified by Task 27.9.
- Task 27.12: final Personal V1 physical-readiness declaration.

All deferred items share the approved status: **DEFERRED — Apple/EAS/physical-device environment unavailable**.
