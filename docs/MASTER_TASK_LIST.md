# havAI V1 Master Implementation Task List

## 1. Purpose

This document breaks havAI V1 into small, dependency-ordered implementation tasks that Cursor can execute one at a time.

Each task is intentionally scoped so Cursor can:

1. read the relevant specifications
2. inspect the existing repository
3. produce a short implementation plan
4. implement one bounded piece of functionality
5. add or update relevant tests
6. run verification
7. report what changed
8. stop before beginning the next task

Cursor must not automatically continue into the next task.

---

# 2. Task Execution Rule

Cursor should normally receive **one numbered task at a time**.

Do not prompt Cursor with:

```text
Build havAI V1.
```

Instead use:

```text
Implement Task 9.2 from docs/MASTER_TASK_LIST.md.

Read all relevant specifications first.
Implement only that task and its subtasks.
Run verification.
Stop before beginning Task 9.3.
```

This prevents architecture drift and uncontrolled changes.

---

# 3. Specification Authority

Before implementing any task, Cursor must read:

```text
docs/CURSOR_RULES.md
```

and all documents relevant to the task.

Depending on the feature, this may include:

```text
PRD.md
USER_FLOWS.md
DESIGN_SPEC.md
ARCHITECTURE.md
DATABASE.md
PROGRESSION_ENGINE.md
AI_SYSTEM.md
OFFLINE_SYNC.md
API_CONTRACTS.md
TESTING.md
DEPLOYMENT.md
```

If two specifications appear to conflict:

```text
STOP
```

Cursor should report the conflict instead of inventing a compromise.

---

# 4. Project Phase Overview

Implementation is divided into:

```text
PHASE 0   Repository preparation

PHASE 1   Expo application foundation

PHASE 2   Navigation and application shell

PHASE 3   Design system

PHASE 4   Shared contracts and validation

PHASE 5   Local SQLite foundation

PHASE 6   Minimal Supabase, authentication, and profiles

PHASE 7   Onboarding

PHASE 8   Exercise library and custom exercises

PHASE 9   Local workout templates

PHASE 10  Active workout foundation

PHASE 11  Set logging

PHASE 12  Workout recovery and offline prototype

PHASE 13  Full Supabase cloud schema

PHASE 14  Cloud repositories and synchronization

PHASE 15  Workout completion and metrics

PHASE 16  Progression engine

PHASE 17  Recommendations and PR state

PHASE 18  Workout history

PHASE 19  Progress analytics

PHASE 20  AI backend

PHASE 21  AI mobile experience

PHASE 22  Profile and settings

PHASE 23  Edge cases and hardening

PHASE 24  Testing expansion

PHASE 25  Developer diagnostics

PHASE 26  Deployment preparation

PHASE 27  Final V1 validation
```

---

# 5. Critical Architectural Sequence

havAI should be built in this order:

```text
FOUNDATION
    ↓
LOCAL DATA
    ↓
LOCAL WORKOUT
    ↓
OFFLINE RELIABILITY
    ↓
CLOUD STORAGE
    ↓
SYNC
    ↓
METRICS
    ↓
PROGRESSION
    ↓
HISTORY / PROGRESS
    ↓
AI
    ↓
POLISH
```

AI must not be implemented before the non-AI workout tracker is independently useful.

---

# PHASE 0: REPOSITORY PREPARATION

## Task 0.1: Create Documentation Directory

### Goal

Place every approved specification inside the repository.

### Subtasks

Create:

```text
docs/
```

Add:

```text
docs/
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

Requirements:

- filenames must match exactly
- do not change specification contents during this task
- remove duplicate old-name copies if they exist

### Acceptance Criteria

- all canonical documents exist
- Cursor can search all documents
- no duplicate differently named versions remain
- no application code is changed

---

## Task 0.2: Create ADR Directory

### Goal

Record locked architecture decisions.

### Subtasks

Create:

```text
docs/adr/
```

Add:

```text
001-react-native-expo.md
002-expo-router.md
003-supabase-postgres.md
004-supabase-auth.md
005-expo-sqlite-local-first.md
006-supabase-edge-functions.md
007-openai-server-side-only.md
008-deterministic-progression-engine.md
009-client-generated-uuids.md
010-no-custom-backend-v1.md
011-kilograms-canonical-weight-unit.md
```

Each ADR should contain:

```text
Status
Context
Decision
Reason
Consequences
```

### Acceptance Criteria

- ADRs match `ARCHITECTURE.md`
- canonical weight is explicitly kilograms
- no new unsupported architectural decision is introduced

---

## Task 0.3: Repository Hygiene

### Goal

Prepare the repository for safe development.

### Subtasks

Create or update:

```text
.gitignore
README.md
```

Ensure `.gitignore` includes:

```text
node_modules/
.env
.env.local
.env.*.local
.expo/
dist/
coverage/
.DS_Store
__MACOSX/
```

README should initially contain:

```text
havAI
Project status
Documentation location
Prerequisites
Current development stage
```

Remove stale starter-template instructions.

### Acceptance Criteria

- secrets are ignored
- `.DS_Store` and `__MACOSX` are ignored
- README contains only current information

---

# PHASE 1: EXPO APPLICATION FOUNDATION

## Task 1.1: Scaffold Expo Application

### Goal

Create the React Native application.

### Subtasks

- use current supported Expo tooling
- use TypeScript
- use Expo Router
- prefer `src/app/` routing structure if supported cleanly
- preserve `/docs`

Do not add product functionality yet.

### Acceptance Criteria

- application launches
- Expo Router initializes
- TypeScript compiles
- no unnecessary dependencies added

---

## Task 1.2: Remove Starter Boilerplate

### Goal

Reduce the application to the minimum havAI shell.

### Subtasks

Remove:

- tutorial screens
- starter tabs
- sample assets not needed
- sample components
- sample navigation content

Create minimal:

```text
src/app/_layout.tsx
src/app/index.tsx
```

Initial output:

```text
havAI
```

### Acceptance Criteria

- app launches cleanly
- no starter-demo code remains
- no broken imports

---

## Task 1.3: Configure TypeScript

### Subtasks

- enable strict TypeScript where compatible
- configure `@/` alias for `src/`
- verify aliases work in TypeScript and Expo

### Acceptance Criteria

```text
typecheck passes
```

Example imports work:

```ts
import { something } from "@/...";
```

---

## Task 1.4: Configure Linting

### Goal

Create predictable code-quality checks.

### Subtasks

- configure Expo-compatible linting
- avoid excessive stylistic rules
- ensure TypeScript files are covered

### Acceptance Criteria

```text
npm run lint
```

passes on the scaffold.

---

## Task 1.5: Configure Test Runner

### Goal

Establish test infrastructure before business logic is added.

### Subtasks

Choose tooling compatible with the current Expo project.

Support:

```text
unit tests
React Native component tests later
```

Add one trivial sanity test.

### Acceptance Criteria

```text
npm test
```

passes.

---

## Task 1.6: Add Core Project Scripts

### Subtasks

Add working scripts for:

```text
dev
typecheck
lint
test
test:watch
```

Only add scripts supported by installed tooling.

### Acceptance Criteria

Every script executes successfully.

---

## Task 1.7: Configure Environment Handling

### Goal

Centralize safe environment access.

### Subtasks

Create:

```text
.env.example
src/lib/environment/
```

Support:

```text
EXPO_PUBLIC_APP_ENV
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Create runtime validation.

Do not add:

```text
OPENAI_API_KEY
service role key
```

to client configuration.

### Acceptance Criteria

- environment access centralized
- missing variables produce clear development error
- no privileged secret committed

---

# PHASE 2: NAVIGATION AND APPLICATION SHELL

## Task 2.1: Create Root Routing Strategy

### Goal

Establish application-level route groups.

### Subtasks

Create:

```text
src/app/
├── (auth)/
├── (onboarding)/
├── (tabs)/
├── workout/
├── template/
└── exercise/
```

Create minimal layouts where required.

### Acceptance Criteria

- route groups compile
- no business logic added

---

## Task 2.2: Create Main Tab Navigation

### Goal

Implement the primary authenticated app shell.

### Subtasks

Create:

```text
src/app/(tabs)/_layout.tsx
```

Create placeholder routes:

```text
home.tsx
workouts.tsx
progress.tsx
coach.tsx
profile.tsx
```

Tabs:

```text
Home
Workouts
Progress
Coach
Profile
```

Implement active/inactive styling from the Design Spec.

### Acceptance Criteria

- all five tabs accessible
- active state uses approved blood orange
- inactive state uses muted styling
- no feature logic yet

---

## Task 2.3: Create Placeholder Screen Components

### Goal

Keep route files thin.

### Subtasks

Create feature-level screen placeholders rather than large route implementations.

Example:

```text
HomeScreen
WorkoutsScreen
ProgressScreen
CoachScreen
ProfileScreen
```

Route files should mostly render these screens.

### Acceptance Criteria

- route files remain minimal
- placeholder screens render correct titles

---

## Task 2.4: Create Route Guard Skeleton

### Goal

Prepare routing for auth/onboarding state.

### Subtasks

Create root routing logic capable of distinguishing:

```text
loading
unauthenticated
authenticated + onboarding incomplete
authenticated + onboarding complete
```

Temporary mocked state is acceptable until auth is implemented.

### Acceptance Criteria

- route guard structure exists
- no actual Supabase dependency required yet

---

# PHASE 3: DESIGN SYSTEM

## Task 3.1: Create Theme Tokens

### Subtasks

Create:

```text
src/theme/
├── colors.ts
├── spacing.ts
├── radius.ts
├── typography.ts
├── sizing.ts
└── index.ts
```

Implement approved palette.

### Acceptance Criteria

- tokens exported centrally
- no repeated literal brand colors in components

---

## Task 3.2: Create Typography System

### Subtasks

Implement variants:

```text
display
screenTitle
sectionHeading
exerciseName
body
metadata
button
```

Support:

```text
primary
secondary
muted
```

text colors.

### Acceptance Criteria

- system font only
- text scaling supported reasonably

---

## Task 3.3: Create Button Components

Create:

```text
PrimaryButton
SecondaryButton
TextButton
IconButton
```

Support:

```text
disabled
pressed
loading when appropriate
accessibility
```

### Acceptance Criteria

- touch targets comply with spec
- primary orange and destructive styling remain separate

---

## Task 3.4: Create Form/UI Primitives

Create:

```text
Screen
Card
SectionHeader
TextInput
SearchInput
Chip
FilterChip
EmptyState
ErrorState
```

### Acceptance Criteria

- token-driven styling
- no feature logic

---

## Task 3.5: Create Status Components

Create:

```text
OfflineBanner
SyncIndicator
PRBanner
```

No networking logic yet.

### Acceptance Criteria

All relevant visual states render.

---

## Task 3.6: Create Bottom Sheet Foundation

### Goal

Provide one consistent sheet implementation.

### Subtasks

- choose Expo-compatible implementation
- create shared wrapper
- support dismissal
- respect safe area
- support configurable content

### Acceptance Criteria

Reusable sheet works on device.

---

# PHASE 4: SHARED CONTRACTS AND VALIDATION

## Task 4.1: Create Common Contracts

Create:

```text
src/shared/contracts/common.ts
```

Define:

```text
UUID
ISODateTime
WeightKg
DisplayWeight
AppEnvironment
```

### Acceptance Criteria

Matches `API_CONTRACTS.md`.

---

## Task 4.2: Create Profile Contracts

Create:

```text
src/shared/contracts/auth.ts
```

Define:

```text
UserProfile
WeightUnit
PrimaryGoal
RpePreference
ProgressionStyle
```

---

## Task 4.3: Create Exercise Contracts

Define:

```text
Exercise
MuscleGroup
EquipmentType
MeasurementType
```

---

## Task 4.4: Create Workout Contracts

Define:

```text
Workout
WorkoutExercise
WorkoutSet
WorkoutTemplate
WorkoutTemplateExercise
CompleteSetInput
EditSetInput
FinishWorkoutInput
WorkoutSummary
ExerciseWorkoutSummary
```

Requirements:

```text
canonical weight = kg
position = 0-based
```

---

## Task 4.5: Create Progression Contracts

Define:

```text
ProgressionInput
ProgressionResult
ProgressionRecommendation
ProgressionReasonCode
ExerciseTrend
```

Ensure final reason-code list includes all approved codes.

---

## Task 4.6: Create Personal Record Contracts

### Goal

Separate detected PR events from persistent PR state.

### Subtasks

Define:

```ts
type DetectedPersonalRecordType = "max_weight" | "estimated_1rm" | "rep_pr";

type PersistedPersonalRecordType = "max_weight" | "estimated_1rm";
```

Create corresponding result types.

### Acceptance Criteria

- rep PR can be surfaced without requiring permanent PR row
- cloud PR persistence only covers approved persistent record types

---

## Task 4.7: Create Sync Contracts

Define syncable raw/local entities.

V1 sync entities:

```text
workout
workout_exercise
set
progression_recommendation
```

Do **not** include:

```text
personal_record
```

in the offline queue.

Persistent PR state will be recalculated from canonical history.

### Acceptance Criteria

Sync contract matches `OFFLINE_SYNC.md`.

---

## Task 4.8: Create AI Contracts

Define:

```text
CoachRequestV1
CoachResponseV1
ExplainRecommendationRequestV1
RecommendationExplanationV1
ParseWorkoutRequestV1
ParseWorkoutResponseV1
ApiSuccess
ApiErrorResponse
ApiErrorCode
```

---

## Task 4.9: Add Runtime Validation

### Subtasks

Create schemas for:

```text
environment
RPE
weight unit
profile settings
AI requests
AI responses
```

### Acceptance Criteria

Untrusted external data is runtime validated.

---

# PHASE 5: LOCAL SQLITE FOUNDATION

## Task 5.1: Install and Configure Expo SQLite

### Subtasks

- install Expo-compatible SQLite package
- create connection manager
- enable appropriate foreign-key behavior
- create local DB bootstrap

### Acceptance Criteria

Test query succeeds.

---

## Task 5.2: Create Local Migration Runner

### Subtasks

Implement:

```text
schema version
ordered migration execution
transactional migrations
```

### Acceptance Criteria

- migrations run once
- DB reopen preserves version
- failures do not wipe DB

---

## Task 5.3: Create Local Workout Tables

Create:

```text
local_workouts
local_workout_exercises
local_sets
```

Follow `DATABASE.md`.

### Acceptance Criteria

Insert/read/update/delete integration tests pass.

---

## Task 5.4: Create Authoritative Local Template Tables

### Goal

Provide real local template storage instead of an ambiguous cache-only implementation.

Create:

```text
local_workout_templates
local_workout_template_exercises
```

These are the local authoritative copies used by the app.

They will later synchronize with Supabase.

### Required fields

Must include everything necessary to reconstruct the domain template model, including:

```text
id
user_id
name
notes
is_archived
position
exercise_id
target_sets
target_min_reps
target_max_reps
created_at
updated_at
sync_status
```

as appropriate to each table.

### Acceptance Criteria

- templates can be created entirely offline
- template exercises preserve ordering
- app does not depend on cloud for local template CRUD

---

## Task 5.5: Create Local Progression Recommendation Table

### Goal

Store recommendations generated while offline as real local data.

Create:

```text
local_progression_recommendations
```

Must contain all fields needed to later synchronize the recommendation:

```text
id
user_id
exercise_id
source_workout_id
source_workout_exercise_id
recommendation_type
recommended_weight_kg
target_sets
target_min_reps
target_max_reps
target_set_reps
confidence
reason_codes
status
engine_version
consumed_at
created_at
updated_at
sync_status
```

### Acceptance Criteria

- full domain recommendation can round-trip through SQLite
- recommendation does not depend on a reduced cache schema

---

## Task 5.6: Create Sync Queue Table

Create:

```text
sync_queue
```

Fields include:

```text
id
entity_type
entity_id
operation
attempt_count
last_error
created_at
last_attempt_at
```

Unique logical pending operation per:

```text
entity_type + entity_id
```

### Acceptance Criteria

Queue persists across DB restart.

---

## Task 5.7: Create Read Cache Tables

### Goal

Cache cloud/read-only data that is not locally authored.

Create:

```text
cached_exercises
cached_recent_exercise_sessions
```

Do not duplicate authoritative local templates or recommendations into separate ambiguous cache tables.

### Acceptance Criteria

- cache roles are clear
- cached data is distinguishable from authoritative unsynced local data

---

## Task 5.8: Create Local Database Mappers

Create mappers for:

```text
Workout
WorkoutExercise
WorkoutSet
WorkoutTemplate
WorkoutTemplateExercise
Exercise
ProgressionRecommendation
```

### Acceptance Criteria

Persistence-specific shapes do not leak into domain code.

---

## Task 5.9: Create Local Repository Interfaces and Implementations

Implement:

```text
LocalWorkoutRepository
LocalSetRepository
LocalTemplateRepository
LocalExerciseCacheRepository
LocalRecommendationRepository
```

### Acceptance Criteria

Basic CRUD integration tests pass.

---

## Task 5.10: Add Local Preference and Note Fields

Create the local user-exercise-preferences table and repository for favorites, persistent exercise notes, and rest overrides. Add set-note persistence and mapping to `local_sets`.

### Acceptance Criteria

- fields match `DATABASE.md` and `API_CONTRACTS.md`
- data survives SQLite reopen
- all user-owned queries are scoped by user ID

---

# PHASE 6: MINIMAL SUPABASE, AUTHENTICATION, AND PROFILES

This phase intentionally creates only the cloud infrastructure needed for identity and onboarding.

Full workout cloud schema remains later.

---

## Task 6.1: Initialize Supabase CLI

### Subtasks

Create:

```text
supabase/
```

configuration.

Document development project linkage.

### Acceptance Criteria

- Supabase project structure in repo
- no manual-only schema dependency

---

## Task 6.2: Configure Supabase Client

Create:

```text
src/lib/supabase/client.ts
```

Use only:

```text
Supabase URL
publishable client key
```

### Acceptance Criteria

Client initializes from validated environment config.

---

## Task 6.3: Create Profiles Migration

Create cloud:

```text
profiles
```

Implement:

```text
constraints
FK to auth.users
updated_at behavior
RLS
```

### Acceptance Criteria

Authenticated user can only access their own profile.

---

## Task 6.4: Generate Supabase Database Types

### Acceptance Criteria

Generated types are available and not manually edited.

---

## Task 6.5: Create Profile Repository

Support:

```text
getOwnProfile
createOwnProfile
updateOwnProfile
```

### Acceptance Criteria

Raw Supabase row types do not leak into UI.

---

## Task 6.6: Create Auth Service

Support:

```text
signUp
signIn
signOut
getSession
subscribeToSession
```

### Acceptance Criteria

UI does not call Supabase Auth directly.

---

## Task 6.7: Create Auth Routes

Create:

```text
src/app/(auth)/
├── _layout.tsx
├── welcome.tsx
├── login.tsx
└── signup.tsx
```

---

## Task 6.8: Implement Welcome Screen

Actions:

```text
Create Account
Log In
```

### Acceptance Criteria

Correct routing.

---

## Task 6.9: Implement Signup Screen

### Subtasks

- email
- password
- confirm password
- validation
- loading/error states

### Acceptance Criteria

New account can be created.

---

## Task 6.10: Implement Login Screen

### Acceptance Criteria

Existing account can authenticate and session persists.

---

## Task 6.11: Implement Ensure Profile Use Case

### Goal

Guarantee every authenticated user has a profile row.

### Subtasks

On authenticated startup:

```text
fetch profile
↓
profile exists?
```

If no:

```text
create default incomplete profile
```

If yes:

```text
use existing profile
```

Must be idempotent.

### Acceptance Criteria

- repeated startup does not create duplicate profiles
- authenticated user always resolves to a profile

---

## Task 6.12: Connect Root Route Guard to Auth/Profile State

Routing:

```text
no session
→ auth

session + onboarding incomplete
→ onboarding

session + onboarding complete
→ main tabs
```

### Acceptance Criteria

Routing survives app relaunch.

---

## Task 6.13: Add Default Rest Duration Profile Setting

Add the positive `default_rest_duration_seconds` profile field, default it to 120, map it through profile contracts/repositories, and preserve the onboarding RPE/progression defaults.

---

# PHASE 7: ONBOARDING

## Task 7.1: Create Compact Onboarding Route

Create:

```text
setup.tsx
```

Remove any planned multi-screen units, goal, RPE, and progression-style routes.

---

## Task 7.2: Build Compact Setup Screen

Include only:

```text
Weight Unit: Pounds / Kilograms
Primary Goal: Build Muscle / Get Stronger / Both
Start Training
```

### Acceptance Criteria

No tutorial, tour, advanced preference, or additional required question appears.

---

## Task 7.3: Persist Compact Onboarding Profile

### Subtasks

After `Start Training`:

- validate weight unit and primary goal
- update `profiles`
- set `rpe_preference = optional`
- set `progression_style = balanced`
- set:

```text
onboarding_completed = true
```

### Acceptance Criteria

- profile contains selections
- app routes to Home
- relaunch does not repeat onboarding

---

## Task 7.4: Implement Compact Onboarding Resume

### Goal

Handle app termination during onboarding.

### Acceptance Criteria

User returns to the compact setup safely without corrupting profile state or being routed through removed screens.

---

# PHASE 8: EXERCISE LIBRARY AND CUSTOM EXERCISES

## Task 8.1: Create Exercise Feature Structure

Create:

```text
src/features/exercises/
├── components/
├── repositories/
├── services/
├── hooks/
├── screens/
└── types/
```

---

## Task 8.2: Create Stable Development Exercise Fixture

Create approximately:

```text
20-30
```

common exercises for local UI development.

Use stable UUIDs.

### Acceptance Criteria

Major muscle/equipment groups represented.

---

## Task 8.3: Populate Local Exercise Cache from Fixture

### Acceptance Criteria

Exercise list can render without cloud exercise schema.

---

## Task 8.4: Build Exercise Library Screen

Support:

```text
search
muscle chips
exercise rows
empty result
```

---

## Task 8.5: Build Exercise Detail Screen

Display:

```text
name
primary muscle
secondary muscles
equipment
measurement type
```

History may remain placeholder.

---

## Task 8.6: Implement Local Custom Exercise Creation

### Goal

Fulfill the PRD's custom exercise requirement before cloud sync exists.

### Subtasks

Create form for:

```text
name
primary muscle
secondary muscles optional
equipment
measurement type
```

Create UUID locally.

Store in exercise cache/local user-exercise storage.

If necessary, extend local exercise table so custom exercises can be marked:

```text
owner_user_id
is_system = false
is_archived = false
sync_status
```

### Acceptance Criteria

- custom exercise can be created offline
- appears in exercise picker
- stable UUID assigned
- does not impersonate a system exercise

---

## Task 8.7: Implement Edit Custom Exercise

### Acceptance Criteria

Only user-created exercises editable.

---

## Task 8.8: Implement Archive Custom Exercise

### Acceptance Criteria

- archived exercise hidden from normal picker
- existing workout references remain valid

---

## Task 8.9: Build Exercise Discovery Sections

Expose Popular, Favorites, Muscle Groups, and Search in the shared exercise picker. Use curated/deterministic Popular ordering and the canonical muscle taxonomy.

---

## Task 8.10: Implement Exercise Favorites

Toggle favorites for system or custom exercises through local user exercise preferences. The picker must update immediately offline.

---

## Task 8.11: Implement Persistent Exercise Notes

Create/edit a user-owned note without updating the global/system exercise definition. Verify the note survives restart and is available to workout screens.

---

## Task 8.12: Implement Per-Exercise Rest Override

Create/edit/clear a positive rest-duration override with fallback to the profile default.

---

# PHASE 9: LOCAL WORKOUT TEMPLATES

## Task 9.1: Create Template Service

Use the authoritative local template repository.

Support:

```text
create
edit
duplicate
archive
get
list
```

---

## Task 9.2: Build Workouts Tab Template List

### Subtasks

Display:

```text
template name
exercise count
```

Actions:

```text
open
start
```

### Acceptance Criteria

- local templates display
- empty state implemented

---

## Task 9.3: Build New Template Screen

Fields:

```text
name
notes optional
exercise list
```

### Acceptance Criteria

Cannot save without:

```text
name
at least one exercise
```

---

## Task 9.4: Build Template Exercise Picker

Reuse Exercise Library.

Support custom exercises.

---

## Task 9.5: Build Template Exercise Configuration Sheet

Configure:

```text
target sets
minimum reps
maximum reps
notes
```

### Acceptance Criteria

Invalid ranges rejected.

---

## Task 9.6: Implement Template Reordering

Maintain:

```text
0-based positions
```

### Acceptance Criteria

Order persists after reload.

---

## Task 9.7: Implement Template Editing

### Acceptance Criteria

Changes update template but do not affect already-started workouts.

---

## Task 9.8: Implement Template Duplication

### Acceptance Criteria

- new template UUID
- new template-exercise UUIDs
- same exercise configuration

---

## Task 9.9: Implement Template Delete UX as Archive

### Goal

UI may say:

```text
Delete Workout
```

or:

```text
Delete Template
```

but V1 persistence behavior is:

```text
archive
```

### Acceptance Criteria

- template disappears from normal list
- historical workouts unaffected

---

# PHASE 10: ACTIVE WORKOUT FOUNDATION

## Task 10.1: Create Start Workout Use Case

### Subtasks

Generate workout UUID.

Snapshot:

```text
template name
exercise order
target sets
rep ranges
active recommendation if available
```

Create local:

```text
workout
workout exercises
```

in one transaction.

Set:

```text
status = active
```

Queue raw entities for future cloud sync.

### Acceptance Criteria

- works without internet
- template changes later do not alter workout

---

## Task 10.2: Enforce One Active Workout Locally

Before starting another:

return state offering:

```text
Resume
Discard
Cancel
```

### Acceptance Criteria

No active workout silently replaced.

---

## Task 10.3: Create Home Screen Base

### Goal

Replace placeholder Home tab with real workout-oriented state.

Without active workout, show:

```text
Ready to Train
workout templates
recent information placeholder
```

### Acceptance Criteria

Template can be started from Home.

---

## Task 10.4: Create Active Workout Home State

When active workout exists:

```text
Workout in Progress
elapsed time
progress
Resume Workout
```

dominates Home.

---

## Task 10.5: Create Active Workout Overview

Display:

```text
workout name
elapsed time
exercise order
completion state
finish action
add exercise placeholder
```

---

## Task 10.6: Implement Timestamp-Based Workout Timer

Canonical:

```text
now - startedAt
```

### Acceptance Criteria

Lock/background does not reset duration.

---

## Task 10.7: Create Exercise Logging Screen Skeleton

Display:

```text
exercise name
today target
previous performance placeholder
today sets
Complete Set
```

---

## Task 10.8: Implement Exercise Switching

Support:

```text
overview selection
next
previous
```

---

## Task 10.9: Render Last Comparable Workout Beside Target

Replace the placeholder with real locally available comparable performance. Show the prior sets next to today's target and optionally compute a truthful total-rep delta. Render an explicit no-history state instead of fabricated data.

---

## Task 10.10: Surface Persistent Exercise Note During Training

Load the current user's exercise preference and show its note near the active exercise context without presenting it as a structured target or global instruction.

---

## Task 10.11: Add Active Workout Note Editing

Add optional free-form workout note editing through the local workout repository and queue the workout upsert. The note must survive restart without network access.

---

# PHASE 11: SET LOGGING

## Task 11.1: Implement Local Set Repository

Support:

```text
create
update
delete/tombstone
getForWorkoutExercise
```

---

## Task 11.2: Implement `completeSet()`

### Subtasks

- validate input
- calculate next position
- create UUID
- write set locally
- enqueue set upsert
- commit atomically
- return completed set

### Acceptance Criteria

Cloud is not consulted.

---

## Task 11.3: Build Set Input Row

Support:

```text
weight
reps
optional RPE
```

Prefill weight intelligently.

---

## Task 11.4: Connect Complete Set Flow

### Subtasks

- invoke `completeSet`
- immediate completed state after local success
- haptic feedback
- duplicate-tap prevention
- move to next entry state

### Acceptance Criteria

Rapid tapping creates one set.

---

## Task 11.5: Implement Add Extra Set

### Acceptance Criteria

Session changes only.

Template unchanged.

---

## Task 11.6: Implement Warm-Up Sets

Store:

```text
setType = warmup
```

### Acceptance Criteria

Warm-ups excluded from normal progression metrics.

---

## Task 11.7: Implement Edit Completed Set

Queue latest state as:

```text
upsert
```

---

## Task 11.8: Implement Delete Completed Set

Handle:

### Case A

Never synced:

```text
remove local row
remove pending upsert
```

### Case B

Previously synced:

```text
tombstone/hide
queue delete
```

### Acceptance Criteria

Correct queue behavior.

---

## Task 11.9: Add Basic Previous Set Prefill

If previous working set exists:

```text
weight = previous weight
```

Reps blank.

RPE blank.

---

## Task 11.10: Add Quick Weight Adjustment Controls

Support ±5/±10/±25/±45 for pounds and ±2.5/±5/±10/±20 for kilograms in a compact control. Preserve manual numeric input and convert only at the canonical-kilogram boundary.

---

## Task 11.11: Add Quick Rep Adjustment Controls

Add large one-handed `[-] reps [+]` controls with valid boundaries while retaining manual numeric entry.

---

## Task 11.12: Add Set Notes

Add optional note entry/editing to set drafts, `completeSet()`, completed-set editing, local persistence, and set display. Keep the field progressively disclosed.

---

## Task 11.13: Implement Immediate Set Completion Undo

Expose a brief non-modal Undo after local success. Restore the exact pre-completion draft and transactionally remove/coalesce an unsynced mutation or queue the safe cloud-known delete/update path. Do not show destructive confirmation.

---

## Task 11.14: Build Isolated Rest Timer State Machine

Implement timestamp-derived start, pause, resume, reset, add-time, dismiss, and completion states. Timer state must not depend on foreground ticks or write workout data.

---

## Task 11.15: Start Rest Timer After Working-Set Commit

Trigger the resolved profile/per-exercise duration only after `completeSet()` commits. Keep all workout interaction enabled and isolate timer failures from the saved set and queue.

---

## Task 11.16: Add Rest Timer Completion Feedback

Provide appropriate haptic/sound/notification feedback across foreground, background, and lock states, respecting platform capability and permissions without making notification permission a workout requirement.

---

# PHASE 12: WORKOUT RECOVERY AND OFFLINE PROTOTYPE

## Task 12.1: Restore Active Workout at Startup

Startup:

```text
open SQLite
↓
load active workout
```

### Acceptance Criteria

Force-close does not lose completed sets.

---

## Task 12.2: Restore Active Exercise Context

Optional but recommended:

persist/restore last active exercise ID.

### Acceptance Criteria

Resume returns user near where they left off.

---

## Task 12.3: Create Network Status Abstraction

Support:

```text
online
offline
subscription
```

Network state is advisory only.

---

## Task 12.4: Connect Offline Banner

Display:

```text
Offline · Saved on device
```

during workout.

---

## Task 12.5: Implement Cached Template Offline Start

Because templates are locally authoritative, starting an existing template must work offline automatically.

### Acceptance Criteria

No cloud dependency.

---

## Task 12.6: Verify Full Local Workout Flow

Test manually and automatically where practical:

```text
create template
↓
start workout
↓
log sets
↓
edit set
↓
add set
↓
lock phone
↓
background
↓
force close
↓
reopen
↓
resume
↓
finish placeholder
```

### Acceptance Criteria

No internet required.

---

## Task 12.7: Add Local Durability Integration Tests

Cover:

```text
DB close/reopen
active workout recovery
completed set preservation
pending queue preservation
```

---

# PHASE 13: FULL SUPABASE CLOUD SCHEMA

## Task 13.1: Create Exercises Migration

Create:

```text
exercises
exercise_secondary_muscles
```

Implement:

```text
system exercises
custom exercises
archive behavior
RLS
```

### Ownership Requirement

RLS must protect ownership and parent/reference consistency.

---

## Task 13.2: Create Template Migrations

Create:

```text
workout_templates
workout_template_exercises
```

Add complete constraints, indexes, FKs, and RLS.

### Critical Requirement

Child insert/update policies must validate the parent template belongs to the same authenticated user.

---

## Task 13.3: Create Workout Migrations

Create:

```text
workouts
workout_exercises
sets
```

### Critical Requirement

Do not rely only on:

```text
auth.uid() = child.user_id
```

Child writes must also verify parent ownership.

For example:

```text
workout_exercise → owned workout
set → owned workout + owned workout exercise
```

---

## Task 13.4: Create Recommendation Migration

Create:

```text
progression_recommendations
```

Include all fields required by the domain/local recommendation model.

---

## Task 13.5: Create Personal Records Migration

Create persistent PR state for:

```text
max_weight
estimated_1rm
```

Do not persist every rep-at-weight PR as a permanent current-record row.

---

## Task 13.6: Add Complete Foreign Keys and Delete Behavior

### Goal

Make FK behavior exhaustive and explicit.

Document and implement every relationship, including:

```text
source_template_id
source_recommendation_id
source_workout_id
source_workout_exercise_id
personal_records.set_id
personal_records.workout_id
```

Define intended:

```text
CASCADE
RESTRICT
SET NULL
```

for every FK.

---

## Task 13.7: Add Server-Controlled `updated_at`

Use database-controlled metadata.

### Acceptance Criteria

Client does not need to send authoritative `created_at`/`updated_at`.

---

## Task 13.8: Create System Exercise Seed

Seed approximately:

```text
50-100
```

common exercises.

Use stable UUIDs.

---

## Task 13.9: Regenerate Supabase Types

### Acceptance Criteria

Generated types reflect full schema.

---

## Task 13.10: Add RLS Security Integration Tests

Use at least two users.

Verify cross-user parent-reference attacks fail.

---

## Task 13.11: Add Cloud Exercise Preferences and Note Fields

Create `user_exercise_preferences` exactly as specified, add `sets.notes`, and verify existing `workouts.notes`. Add constraints, indexes, ownership/reference RLS, and generated types.

---

# PHASE 14: CLOUD REPOSITORIES AND SYNCHRONIZATION

## Task 14.1: Create Supabase Exercise Repository

Support:

```text
system exercises
own custom exercises
```

Pull into local exercise cache.

---

## Task 14.2: Create Supabase Template Repository

Support cloud:

```text
upsert
archive
fetch
```

Map to domain types.

---

## Task 14.3: Create Remote Workout Adapter

Support:

```text
upsert workout
upsert workout exercise
upsert set
delete set
```

### Critical Rule

Remote mappers must not send local:

```text
createdAt
updatedAt
```

as authoritative server metadata.

---

## Task 14.4: Create Remote Recommendation Adapter

Support:

```text
upsert recommendation
update status
```

---

## Task 14.5: Implement Sync Queue Repository

Support:

```text
enqueue
coalesce
getPending
markAttempt
remove
```

---

## Task 14.6: Implement Sync Dependency Graph

Dependencies:

```text
workout
   ↓
workout_exercise
   ↓
set
```

Recommendation dependency:

```text
source workout / workout exercise
   ↓
progression recommendation
```

Exercise preference dependency:

```text
accessible custom/system exercise
   ↓
user_exercise_preference
```

No offline personal-record sync.

---

## Task 14.7: Implement Sync Engine Lock

Prevent simultaneous processors.

---

## Task 14.8: Implement Push Synchronization

### Subtasks

- verify auth
- verify actual request capability
- sort dependencies
- load latest local entity state
- upsert/delete
- retain failures
- remove confirmed queue entries

---

## Task 14.9: Implement Retry Policy

No infinite rapid retry.

Persistent failure remains queued.

---

## Task 14.10: Implement Reconnect Sync Trigger

Online transition attempts sync.

---

## Task 14.11: Implement Foreground Sync Trigger

App foreground attempts sync.

---

## Task 14.12: Synchronize Local Templates

### Goal

Make authoritative local templates cloud-backed.

Flow:

```text
local create/edit/archive
↓
sync queue
↓
Supabase
```

Pull cloud changes when appropriate.

### Conflict Rule

V1 does not attempt sophisticated simultaneous multi-device template editing resolution.

---

## Task 14.13: Synchronize Custom Exercises

### Goal

Upload locally created custom exercises.

Ensure UUID remains unchanged.

---

## Task 14.14: Pull Exercise and Template Updates

### Critical Rule

Never overwrite an already-started active workout snapshot.

---

## Task 14.15: Synchronize Local Recommendations

Upload full `local_progression_recommendations`.

### Acceptance Criteria

Recommendation created offline can later appear in cloud with identical UUID and semantic data.

---

## Task 14.16: Implement Recent Exercise History Cache Pull

Cache enough completed raw session data for:

```text
previous-session display
offline comparison
offline progression
```

Recommended baseline:

```text
3-5 recent comparable sessions per used exercise
```

---

## Task 14.17: Recalculate Persistent PR State After Raw History Sync

### Goal

Avoid syncing PR rows through the offline queue.

After canonical raw workout history is synchronized:

```text
recalculate max_weight
recalculate estimated_1rm
persist cloud PR state
```

where appropriate.

### Acceptance Criteria

PR state derives from raw history.

---

## Task 14.18: Add Idempotency Tests

Critical case:

```text
server succeeds
client times out
client retries
```

Expected:

```text
one cloud row
```

---

## Task 14.19: Synchronize User Exercise Preferences and Notes

Push/pull favorites, persistent exercise notes, and rest overrides through `user_exercise_preference` after the referenced exercise exists. Include workout notes in workout payloads and set notes in set payloads. Cover offline create/edit/delete, queue coalescing, tombstones, RLS, and idempotent retry.

---

# PHASE 15: WORKOUT COMPLETION AND METRICS

## Task 15.1: Create Metrics Module

Implement pure:

```text
calculateTotalReps
calculateWorkingSetCount
calculateSessionDelta
```

---

## Task 15.2: Implement Canonical Epley e1RM

Special case:

```text
reps = 1
→ e1RM = weight
```

Use canonical kg.

---

## Task 15.3: Implement Detected PR Logic

Detect:

```text
max weight
estimated 1RM
rep PR at specific weight
```

Rep PR can be displayed without permanent PR-state storage.

---

## Task 15.4: Implement Basic Workout Summary Calculator

Return:

```text
duration
exercise count
working set count
exercise summaries
detected PR events
```

---

## Task 15.5: Implement `finishWorkout()` Foundation

Local transaction:

```text
mark workout completed
set completedAt
calculate summary
detect PR events
queue raw workout changes
```

Progression recommendation integration follows Phase 16/17.

### Acceptance Criteria

Fully offline.

---

## Task 15.6: Build Finish Workout Confirmation

Warn if planned work incomplete.

User may still finish.

---

## Task 15.7: Build Workout Summary Screen

Display:

```text
duration
working sets
exercise progress
PR events
next targets placeholder
```

---

# PHASE 16: PROGRESSION ENGINE

## Task 16.1: Create Module Structure

Create:

```text
src/features/progression/
├── domain/
├── metrics/
├── config/
├── types/
└── __tests__/
```

---

## Task 16.2: Implement Session Classification

Classify:

```text
perfect target completion
successful in-range
partial underperformance
severe underperformance
```

---

## Task 16.3: Implement Rep Metrics

Calculate:

```text
total reps
average reps
best set reps
```

---

## Task 16.4: Implement RPE Metrics

Calculate:

```text
coverage
average RPE
meaningful RPE change
```

---

## Task 16.5: Implement e1RM Trend Metrics

Reuse canonical e1RM.

---

## Task 16.6: Implement Trend Analysis

Return:

```text
improving
flat
declining
insufficient_data
```

---

## Task 16.7: Implement Plateau Detection

Return:

```text
none
possible
likely
```

No plateau before minimum history threshold.

---

## Task 16.8: Implement Rep Target Generation

Examples:

```text
8/7/6
→
8/7/7
```

Maintain sensible fatigue ordering.

---

## Task 16.9: Implement Weight Increment Selection

Support:

```text
practical increment
percentage guardrail
previous successful load fallback
downward increment
```

---

## Task 16.10: Lock Recommendation-Type Semantics

Implement the following meanings consistently:

### `increase_weight`

Load increases.

### `increase_reps`

Load remains the same **and** the engine provides a higher explicit rep objective.

Example:

```text
8/7/6
→
8/7/7
```

### `repeat_target`

Repeat substantially the same load and same intended target because evidence does not justify advancement.

### `maintain_weight`

Load remains the same but no precise one-rep progression target is justified.

Typical examples:

```text
mixed working loads
ambiguous but not failing session
```

### `decrease_weight`

Load decreases.

### `insufficient_data`

No meaningful progression target can be safely generated.

### Acceptance Criteria

No progression branch returns ambiguous:

```text
X or Y depending on context
```

without explicitly implemented context rules.

---

## Task 16.11: Implement Balanced Policy

Follow deterministic decision table.

---

## Task 16.12: Implement Conservative Modifier

High effort may delay progression.

---

## Task 16.13: Implement Aggressive Modifier

Only progress early under explicitly defined strong conditions.

---

## Task 16.14: Implement Underperformance Logic

Cover:

```text
single poor session
repeated underperformance
repeated failed new-weight progression
weight decrease
```

---

## Task 16.15: Implement Confidence Logic

Return:

```text
low
medium
high
```

from deterministic evidence.

---

## Task 16.16: Implement Reason Codes

Ensure contracts include all used codes, including:

```text
REP_RANGE_MAXED
```

if retained by the final Progression spec.

---

## Task 16.17: Implement `calculateProgression()`

Compose all modules.

### Acceptance Criteria

- pure
- deterministic
- no database
- no React
- no OpenAI

---

## Task 16.18: Add Golden Progression Suite

Cover:

```text
balanced
conservative
aggressive
RPE
no RPE
plateau
failure
mixed loads
extra sets
missing sets
bodyweight
```

---

# PHASE 17: RECOMMENDATIONS AND PR STATE

## Task 17.1: Integrate Progression into Workout Completion

For each eligible exercise:

```text
calculate progression
↓
create local recommendation
↓
persist
↓
queue recommendation sync
```

---

## Task 17.2: Supersede Previous Active Recommendation

Logically ensure one active recommendation per:

```text
user + exercise
```

---

## Task 17.3: Consume Recommendation at Workout Start

Snapshot into workout exercise:

```text
sourceRecommendationId
targetWeightKg
target reps
```

Update recommendation status appropriately.

---

## Task 17.4: Add Next Targets to Workout Summary

Display generated recommendations immediately, including offline.

---

## Task 17.5: Build Recommendation Card

Display:

```text
recommended load
rep target
change direction
Why?
```

---

## Task 17.6: Implement Deterministic Explanation Mapping

Reason codes should produce offline-readable explanations.

AI is not required.

---

## Task 17.7: Implement Local PR State Calculation

Use raw local/cache history to determine:

```text
max weight
best e1RM
rep PR event
```

### Important

Only max-weight/e1RM current PR state is persisted long-term.

Rep PR remains a derived/detected event.

---

# PHASE 18: WORKOUT HISTORY

## Task 18.1: Create Workout History Query

Requirements:

```text
completed workouts only
newest first
pagination
```

---

## Task 18.2: Build Workout History List

Display:

```text
date
name
duration
exercise count
```

---

## Task 18.3: Build Workout Detail Screen

Display:

```text
exercise
working sets
warm-up sets
weight
reps
RPE
```

---

## Task 18.4: Implement Historical Set Editing

After edit:

```text
update raw set
queue sync
recalculate affected PR state
recalculate affected recommendation
```

---

## Task 18.5: Implement Historical Workout Delete

After deletion:

```text
remove dependent raw workout data
recalculate PR state
recalculate recommendation
```

No unrelated exercise recalculation.

---

## Task 18.6: Add History Offline State

Show cached recent history where available.

Older noncached history may require internet.

---

## Task 18.7: Display Workout and Set Notes in History

Show the optional workout note in workout detail and set notes on their corresponding sets where present. Keep absent notes visually silent and preserve historical edit behavior.

---

# PHASE 19: PROGRESS ANALYTICS

## Task 19.1: Create Exercise History Service

Group completed sets into exercise sessions.

---

## Task 19.2: Create Progress Metrics Service

Calculate:

```text
current e1RM
best e1RM
best weight
best set
recent change
last performed
```

Reuse canonical metric functions.

---

## Task 19.3: Build Progress Home

Display:

```text
recent PRs
exercise search/list
```

---

## Task 19.4: Build Exercise Progress Screen

Display:

```text
e1RM
best set
best weight
recent sessions
```

Handle insufficient data.

---

## Task 19.5: Add Strength Trend Chart

Use one canonical e1RM series.

Keep the chart visually minimal and hidden until the user selects `Show Graph`. Plot only real history points, never invent continuity, and label incomplete offline history as limited.

---

# PHASE 20: AI BACKEND

## Task 20.1: Create Edge Function Shared AI Infrastructure

Create:

```text
supabase/functions/_shared/
├── ai/
├── context/
└── prompts/
```

---

## Task 20.2: Implement AI Provider Abstraction

Support:

```text
mock
OpenAI
```

No provider-specific types in mobile contracts.

---

## Task 20.3: Add AI Configuration

Server-only:

```text
AI_PROVIDER
OPENAI_API_KEY
AI_COACH_MODEL
AI_EXPLANATION_MODEL
AI_PARSER_MODEL
```

---

## Task 20.4: Add Prompt Version Infrastructure

Create source-controlled:

```text
coach-v1
explanation-v1
parser-v1
```

---

## Task 20.5: Build Coach Context Builder

Use:

```text
profile preferences
current exercise
recent sessions
current recommendation
trend metrics
validated current-session local context
```

Do not send unrelated history.

---

## Task 20.6: Build Recommendation Explanation Context

Server resolves recommendation by ID and verifies ownership.

---

## Task 20.7: Implement Coach Edge Function

Requirements:

```text
authentication
request validation
resource authorization
context building
OpenAI call
response validation
standard response envelope
```

---

## Task 20.8: Implement Explain Recommendation Function

### Acceptance Criteria

AI explains canonical recommendation.

It does not silently replace it.

---

## Task 20.9: Implement Parse Workout Function

Natural-language logging is **included in havAI V1**.

Requirements:

```text
candidate sets only
ambiguities surfaced
no DB write
```

---

## Task 20.10: Implement AI Error Mapping

Support:

```text
unauthorized
forbidden
timeout
provider error
invalid AI response
rate limited
context error
```

---

## Task 20.11: Add AI Backend Tests

Cover auth, ownership, malformed output, provider failure, and successful contracts.

---

## Task 20.12: Add Minimized Note Context

Select only relevant persistent exercise, workout, and set notes; bound their size; label them user-authored subjective context; and keep structured workout facts authoritative. Add tests proving notes do not enter deterministic progression and unrelated notes are omitted.

---

# PHASE 21: AI MOBILE EXPERIENCE

## Task 21.1: Create AI API Client Layer

Create:

```text
coachApi
recommendationExplanationApi
workoutParserApi
```

Screens never invoke raw Edge Function URLs.

---

## Task 21.2: Build Coach Tab

Initial state:

```text
havAI Coach
suggested prompts
message input
```

---

## Task 21.3: Build Coach Conversation UI

Session-local only.

Support:

```text
user messages
assistant messages
loading
error/retry
```

---

## Task 21.4: Add Active Workout Coach Entry

Provide latest local current-session sets.

Cloud history remains server-resolved where possible.

---

## Task 21.5: Add AI Recommendation Explanation

`Why?` should first have deterministic explanation available.

AI may provide richer explanation online.

### Acceptance Criteria

AI failure never hides the target.

---

## Task 21.6: Build Natural-Language Quick Log UI

Flow:

```text
user text
↓
AI parse
↓
preview structured sets
↓
user edits/confirms
↓
normal completeSet path
```

### Acceptance Criteria

AI never writes directly to SQLite or Supabase.

---

## Task 21.7: Implement Offline AI States

When offline:

```text
Coach unavailable
Quick Log unavailable
AI explanation unavailable
```

Manual logging remains usable.

---

# PHASE 22: PROFILE AND SETTINGS

## Task 22.1: Build Profile Screen

Display/settings:

```text
units
goal
RPE preference
progression style
account
logout
```

---

## Task 22.2: Implement Unit Preference Change

### Acceptance Criteria

Stored kg values remain unchanged.

Only display changes.

---

## Task 22.3: Implement RPE Preference Change

Existing historical RPE remains intact.

---

## Task 22.4: Implement Goal Change

Only future calculations/context affected.

---

## Task 22.5: Implement Progression Style Change

Recalculate active/future recommendation state where required.

Historical raw data remains unchanged.

---

## Task 22.6: Implement Rest Timer Training Preference

Add a positive configurable default duration under Profile → Training Preferences and map it through the profile repository. Existing onboarding remains unchanged and does not ask for this value.

---

## Task 22.7: Implement Safe Logout

Before logout, inspect pending unsynced data.

If pending:

```text
Cancel
Try Sync
```

Do not silently orphan pending workout data.

---

# PHASE 23: EDGE CASES AND HARDENING

## Task 23.1: Finish Workout With Incomplete Exercises

Warn, but allow completion.

Do not create a Skip Exercise state or require every planned set/exercise to complete.

---

## Task 23.2: Add Exercise During Active Workout

### Acceptance Criteria

- session only
- template unchanged unless user later explicitly edits template
- exercise comes from the normal picker
- no dedicated Swap Exercise workflow exists

---

## Task 23.3: Remove Exercise During Workout

Completed data requires confirmation.

---

## Task 23.4: Reorder Exercises During Workout

Session ordering only.

---

## Task 23.5: Support Mixed Working Loads

UI must support:

```text
190
185
185
```

across sets.

Progression engine reduces confidence as specified.

---

## Task 23.6: Implement Manual Target Override

User can choose a different load.

No nagging or blocking.

---

## Task 23.7: Implement Insufficient Recommendation UI

Never show invented target when data is insufficient.

---

## Task 23.8: Harden Duplicate Mutation Protection

Cover:

```text
Complete Set
Finish Workout
Save Template
Create Custom Exercise
```

---

## Task 23.9: Implement Local Storage Failure UX

If SQLite fails:

```text
do not show successful save
```

Clearly tell user data was not safely stored.

---

## Task 23.10: Implement Persistent Sync Failure UX

If cloud sync fails repeatedly:

```text
Your workout is saved on this device.
[Retry]
```

---

## Task 23.11: Clarify V1 Multi-Device Behavior in Code/UX

### Goal

Explicitly enforce/document that advanced simultaneous multi-device conflict resolution is out of V1 scope.

### Requirements

- local active workout must never be overwritten by stale pull
- raw data should be preserved on conflict
- derived recommendations/PRs can be regenerated
- no complex field-level merge system

---

# PHASE 24: TESTING EXPANSION

## Task 24.1: Complete Progression Unit Suite

Cover all scenarios from `TESTING.md`.

---

## Task 24.2: Complete SQLite Integration Suite

Cover:

```text
transactions
reopen
migrations
active recovery
template persistence
recommendation persistence
queue durability
```

---

## Task 24.3: Complete Sync Suite

Cover:

```text
offline create
offline edit
offline delete
queue coalescing
retry
idempotency
partial failure
network flapping
mutex
restart
```

---

## Task 24.4: Complete RLS Security Suite

Use two users.

Explicitly test malicious parent-reference combinations.

Example:

```text
User A child row
→ User B parent UUID
```

Must fail.

---

## Task 24.5: Complete AI Evaluation Fixtures

Cover:

```text
hallucination
plateau
no history
high RPE
parser ambiguity
engine consistency
pain/safety boundary
```

---

## Task 24.6: Add High-Value Component Tests

Prioritize:

```text
SetInputRow
RecommendationCard
OfflineBanner
RPEInput
WorkoutTemplateCard
```

---

## Task 24.7: Add Navigation Tests

Cover:

```text
auth
onboarding
tabs
active workout
history
progress
```

---

## Task 24.8: Add E2E Happy Path

Where practical:

```text
signup
onboarding
create template
start workout
log sets
finish
summary
history
```

---

## Task 24.9: Add Recovery Scenario Test

```text
start workout
log sets
terminate app
relaunch
resume
```

---

## Task 24.10: Add Full Offline Scenario

Automate where possible, otherwise maintain mandatory manual procedure.

---

## Task 24.11: Test Compact Onboarding and Discovery

Cover the two-field single screen, advanced defaults, interruption, picker categories, deterministic Popular ordering, favorite isolation, canonical muscle browsing, and absence of Swap/Skip flows.

---

## Task 24.12: Test Fast Logging, Rest Timer, and Undo

Cover unit-specific weight increments, rep controls, one-action prefilled completion, commit-before-timer ordering, all timer controls/background correction, timer failure isolation, both Undo sync paths, and rapid interaction.

---

## Task 24.13: Test Notes Across Persistence and AI Boundaries

Cover offline/reopen/sync/history for exercise, workout, and set notes; exercise-definition immutability; RLS; AI minimization/authority; and deterministic progression invariance when note text changes.

---

## Task 24.14: Test Optional Progress Graph

Cover Show Graph disclosure, real-history-only points, no fake continuity, insufficient data, and incomplete offline-history labeling.

---

# PHASE 25: DEVELOPER DIAGNOSTICS

## Task 25.1: Create Central Logger

Support:

```text
debug
info
warn
error
```

No production secret logging.

---

## Task 25.2: Build Hidden Debug Screen

Display:

```text
environment
app version
SQLite schema version
user ID
active workout ID
network state
pending sync count
last sync
AI provider
```

---

## Task 25.3: Add Force Sync

Development only.

---

## Task 25.4: Add Simulated Offline Mode

Development only.

---

## Task 25.5: Add Sync Queue Viewer

Development only.

---

## Task 25.6: Add Mock AI Diagnostics

Show active AI provider and prompt versions in development diagnostics.

---

# PHASE 26: DEPLOYMENT PREPARATION

## Task 26.1: Add GitHub CI

Run:

```text
typecheck
lint
unit tests
selected integration tests
```

---

## Task 26.2: Finalize README

Document:

```text
install
environment setup
run Expo
Supabase setup
migrations
seeding
tests
Edge Functions
```

---

## Task 26.3: Document Development Supabase Workflow

Include:

```text
link project
apply migrations
seed
generate types
deploy functions
```

---

## Task 26.4: Validate Secret Boundaries

Search code/build configuration for:

```text
OPENAI_API_KEY
service role key
database password
```

### Acceptance Criteria

No privileged secret appears in mobile code.

---

## Task 26.5: Prepare EAS Configuration When Needed

Create:

```text
eas.json
```

with conceptual profiles:

```text
development
preview
production
```

Only when standalone builds become necessary.

---

## Task 26.6: Revisit Xcode / iOS Standalone Build

This task remains blocked until native build tooling is available or an alternative supported path is chosen.

### Eventual Acceptance Criteria

- havAI installs as standalone app
- Mac dev server is not required for normal execution
- local SQLite/offline flow still works

---

## Task 26.7: Create Production Environment Checklist

Do not create production Supabase until external/beta use requires it.

Checklist:

```text
separate Supabase project
production RLS
production OpenAI secret
production Edge Functions
production migrations
production environment variables
```

---

# PHASE 27: FINAL V1 VALIDATION

## Task 27.1: Fresh Install Test

Verify:

```text
install
signup
profile creation
onboarding
template creation
custom exercise creation
start workout
```

---

## Task 27.2: Full Happy Path

Verify:

```text
open app
start workout
see previous performance
see target
log sets
edit set
finish
summary
recommendation
history
progress
Coach
```

---

## Task 27.3: Full Offline Workout Test

Mandatory sequence:

```text
create/cache required data
↓
disconnect internet
↓
start workout
↓
log sets
↓
edit set
↓
kill app
↓
reopen
↓
resume
↓
finish
↓
see recommendation
↓
reconnect
↓
sync
```

### Acceptance Criteria

- no lost sets
- no duplicate sets
- recommendation preserved

---

## Task 27.4: Offline Template Test

Create/edit template offline.

Reconnect.

Verify cloud receives latest intended template state exactly once.

---

## Task 27.5: Offline Custom Exercise Test

Create custom exercise offline.

Use it in a workout.

Reconnect.

Verify:

```text
exercise syncs
template/workout references remain valid
```

---

## Task 27.6: Authentication Expiration Test

During active workout:

```text
auth expires
↓
continue locally
↓
finish
↓
reauthenticate
↓
sync
```

---

## Task 27.7: AI Outage Test

Disable/fail AI.

Verify:

```text
workouts
metrics
progression
history
sync
```

all remain usable.

---

## Task 27.8: RLS Multi-User Test

Mandatory before external testers.

Include attempted cross-user child/parent reference attacks.

---

## Task 27.9: Real Gym Usability Test

Evaluate:

```text
tap count
one-handed use
keyboard friction
screen readability
phone lock/recovery
target clarity
previous-performance visibility
offline behavior
```

Record high-impact issues.

---

## Task 27.10: Fix Real-Gym P0/P1 Issues

Only fix usability/reliability blockers.

Do not add unrelated V1.1 features.

---

## Task 27.11: Run Full Regression Checklist

Use `TESTING.md`.

---

## Task 27.12: Declare Personal V1 Ready

Personal V1 is ready only when:

```text
no known data-loss bug

no known duplicate-sync bug

active workout recovery works

offline templates work

offline workout completion works

offline recommendation persistence works

progression golden suite passes

core gym UX is fast enough in real use
```

---

# 6. Recommended Initial Execution Order

Start in exactly this order:

```text
0.1
0.2
0.3

1.1
1.2
1.3
1.4
1.5
1.6
1.7

2.1
2.2
2.3
2.4

3.1
3.2
3.3
3.4
3.5
3.6

4.1
4.2
4.3
4.4
4.5
4.6
4.7
4.8
4.9

5.1
5.2
5.3
5.4
5.5
5.6
5.7
5.8
5.9

6.1
6.2
6.3
6.4
6.5
6.6
6.7
6.8
6.9
6.10
6.11
6.12

7.1
...
```

Do not skip dependency tasks simply because a later UI feature appears more interesting.

---

# 7. Major Development Milestones

## Milestone A: Application Foundation

Complete through:

```text
Phase 5
```

havAI has:

```text
Expo
navigation
design system
contracts
SQLite
local persistence primitives
```

No meaningful workout workflow yet.

---

## Milestone B: Identity and App Entry

Complete through:

```text
Phase 7
```

havAI has:

```text
authentication
profile
onboarding
main tabs
```

---

## Milestone C: Local Gym Tracker

Complete through:

```text
Phase 12
```

havAI can:

```text
create custom exercises
create templates
start workout
log sets
edit sets
close app
reopen
resume
```

without requiring cloud workout storage.

This is the first major product milestone.

---

## Milestone D: Cloud-Backed Offline Tracker

Complete through:

```text
Phase 15
```

havAI has:

```text
cloud workout storage
template sync
custom exercise sync
offline sync
history durability
metrics
```

---

## Milestone E: havAI Core

Complete through:

```text
Phase 19
```

havAI has:

```text
progression engine
recommendations
PR detection
history
progress analytics
```

At this point the product should already be useful with AI disabled.

---

## Milestone F: AI-Enhanced havAI

Complete through:

```text
Phase 21
```

Adds:

```text
Coach
Why?
Quick Log
```

---

## Milestone G: Personal V1 Candidate

Complete through:

```text
Phase 27
```

Ready for sustained real-gym usage.

---

# 8. Tasks Cursor Must Not Combine

Do not combine these into one implementation task:

```text
SQLite setup
+
full sync engine
```

Do not combine:

```text
progression engine
+
AI Coach
```

Do not combine:

```text
all database migrations
+
all repositories
+
all screens
```

Do not combine:

```text
auth
+
onboarding
+
profile settings
```

Do not combine:

```text
all offline behavior
```

into a single mega-task.

Each area must remain incrementally testable.

---

# 9. Explicit Dependency Examples

## `completeSet()`

Requires:

```text
contracts
SQLite
local set table
local set repository
sync queue
```

Does not require:

```text
Supabase workout schema
AI
progression
```

---

## Sync Engine

Requires:

```text
local SQLite schema
sync queue
cloud schema
remote adapters
authentication
```

---

## Progression Engine

Requires:

```text
contracts
metrics
test fixtures
```

Does not require:

```text
AI
Supabase
React Native UI
```

---

## AI Coach

Requires:

```text
auth
workout data
history
progression
AI contracts
Edge Functions
```

It must not be implemented as a substitute for unfinished progression logic.

---

# 10. Temporary Implementation Rule

Temporary local implementations are allowed only when the task list explicitly requires them.

Examples:

```text
development exercise fixture
local template persistence
mock AI provider
```

Temporary code must have a defined replacement or production path.

Do not create undocumented placeholders such as:

```text
TODO: fix backend later
```

for architectural requirements.

---

# 11. Cursor Implementation Prompt

Recommended reusable prompt:

```text
Implement Task X.X from docs/MASTER_TASK_LIST.md.

Before coding:

1. Read docs/CURSOR_RULES.md.
2. Read every specification relevant to Task X.X.
3. Inspect the existing repository before creating new abstractions.
4. Identify the dependencies this task relies on.
5. Give me a concise implementation plan.

Then implement only Task X.X and its listed subtasks.

Requirements:

- follow the existing architecture
- do not implement later tasks
- do not add unrelated dependencies
- add or update relevant tests
- run typecheck
- run lint
- run relevant tests

When finished, report:

- what was implemented
- files created or changed
- tests created or changed
- commands run and results
- any limitations
- any specification conflicts

Stop before starting the next task.
```

---

# 12. Cursor Completion Format

Cursor should finish each task with:

```text
TASK X.X COMPLETE

Implemented
- ...

Files changed
- ...

Tests
- ...

Verification
- typecheck: PASS / FAIL
- lint: PASS / FAIL
- tests: PASS / FAIL

Limitations
- none / ...

Spec conflicts
- none / ...

Next dependency-safe task
- X.X

STOPPED before beginning the next task.
```

---

# 13. No Mega-Task Rule

If Cursor determines a task has unexpectedly become too large:

```text
STOP
```

Cursor should propose smaller subdivisions.

It should not solve excessive scope by rewriting multiple unrelated modules.

---

# 14. V1 Scope Guard

Do not add these unless specifications are deliberately updated:

```text
Apple Health
Apple Watch
nutrition tracking
social feed
leaderboards
trainer marketplace
body photos
camera form analysis
push-notification coaching
automatic full-program generation
subscription system
payments
web dashboard
```

Future ideas may eventually be recorded separately.

They should not enter V1 accidentally.

---

# 15. V1 Product Definition of Done

havAI V1 should allow a user to:

```text
Create Account
      ↓
Complete Onboarding
      ↓
Create Custom Exercises
      ↓
Create Workout Templates
      ↓
Start Workout
      ↓
See Previous Performance
      ↓
See Current Target
      ↓
Log Sets Quickly
      ↓
Continue Without Internet
      ↓
Close and Reopen Without Losing Workout
      ↓
Finish Workout Offline
      ↓
Receive Deterministic Progression Recommendation
      ↓
Sync Later
      ↓
View Workout History
      ↓
View Exercise Progress
      ↓
Ask havAI Context-Aware Questions
      ↓
Understand Why a Recommendation Exists
      ↓
Use Natural-Language Quick Log
```

while preserving:

```text
local-first reliability
deterministic progression
secure per-user cloud data
server-side AI secrets
idempotent synchronization
canonical kilogram storage
historical workout integrity
```

---

# 16. Implementation Priority

When tradeoffs occur, prioritize:

```text
1. prevent workout data loss

2. preserve raw historical correctness

3. correct progression behavior

4. fast workout logging UX

5. offline reliability

6. user data security

7. maintainable architecture

8. AI usefulness

9. visual polish

10. speculative future extensibility
```

---

# 17. Final Implementation Principle

havAI should first become an excellent offline-capable workout tracker.

Then it becomes intelligent.

The project should progress:

```text
WORKOUT TRACKER
       ↓
RELIABLE LOCAL DATA
       ↓
CLOUD DURABILITY
       ↓
PROGRESSION INTELLIGENCE
       ↓
AI INTERPRETATION
```

not:

```text
AI CHAT
   ↓
SCREENS
   ↓
RANDOM FEATURES
   ↓
TRY TO FIX DATA ARCHITECTURE
```

The first serious proof of havAI should be simple:

> Start a workout, lose internet, log several sets, close the app, reopen it, finish the workout, reconnect, and find every set exactly once in the cloud.

Until that works reliably, later AI and polish features are secondary.
