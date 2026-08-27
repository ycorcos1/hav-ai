# havAI V1 Database Schema Specification

## 1. Purpose

This document defines the database model for havAI V1.

It covers:

- Supabase PostgreSQL schema
- Expo SQLite schema
- entity relationships
- user ownership
- Row Level Security expectations
- local-first workout persistence
- authoritative local vs cached data
- synchronization metadata
- indexes
- constraints
- historical data integrity
- progression recommendation persistence
- personal-record persistence
- unit storage
- deletion behavior
- migration rules

The database architecture must support havAI V1 without requiring major redesign when the application later supports:

- public users
- multiple devices
- more advanced analytics
- richer progression systems
- expanded AI capabilities

---

# 2. Database Architecture

havAI uses two databases.

## Cloud Database

Technology:

```text
Supabase PostgreSQL
```

Responsibilities:

- canonical synchronized workout history
- authentication-linked user data
- workout templates
- exercise library
- custom exercises
- progression recommendations
- persistent personal-record state
- multi-device durability
- future analytics
- secure user isolation

---

## Local Database

Technology:

```text
Expo SQLite
```

Responsibilities:

- authoritative active workout state
- authoritative locally created templates before sync
- authoritative locally created custom exercises before sync
- authoritative locally generated progression recommendations before sync
- offline set logging
- active-workout recovery
- synchronization queue
- cached exercise library
- cached recent exercise history
- offline progression support

---

# 3. Core Data Principle

During active use:

```text
LOCAL SQLITE
```

is the immediate source of truth for unsynced user actions.

After successful synchronization:

```text
SUPABASE POSTGRESQL
```

is the canonical cloud copy.

The system must never require network access to safely persist a completed workout action.

---

# 4. Raw Data vs Derived Data

havAI distinguishes between:

## Raw Historical Facts

```text
workouts
workout_exercises
sets
```

These answer:

> What did the user actually do?

These records are high-value and must be preserved carefully.

---

## Structured Recommendations

```text
progression_recommendations
```

These answer:

> What did havAI recommend next?

Recommendations are derived from workout history but are persisted because:

- they are shown later
- they may be consumed by future workouts
- their engine version matters
- recommendation outcomes may become useful training data

---

## Persistent PR State

```text
personal_records
```

These answer:

> What is the user's current recognized best performance?

Only selected PR types are persisted.

---

## Derived / Ephemeral Metrics

Examples:

```text
total reps
session volume
rep PR at a specific weight
workout duration
trend direction
plateau state
```

These should generally be calculated from raw history rather than stored redundantly.

---

# 5. Cloud Tables

V1 cloud schema:

```text
profiles

exercises
exercise_secondary_muscles
user_exercise_preferences

workout_templates
workout_template_exercises

workouts
workout_exercises
sets

progression_recommendations

personal_records
```

Total:

```text
11 tables
```

---

# 6. Local SQLite Tables

V1 local schema:

```text
local_workout_templates
local_workout_template_exercises

local_workouts
local_workout_exercises
local_sets

local_exercises
local_user_exercise_preferences

local_progression_recommendations

cached_recent_exercise_sessions

sync_queue

local_schema_metadata
```

Total: 11 local tables.

A future implementation may split `local_exercises` into system-cache and custom-authoritative tables, but V1 can safely use one table with explicit ownership and sync metadata.

---

# 7. General Naming Conventions

PostgreSQL:

```text
snake_case
```

TypeScript/domain:

```text
camelCase
```

SQLite:

```text
snake_case
```

Primary keys:

```text
uuid
```

for cloud.

SQLite UUIDs stored as:

```text
TEXT
```

All user-created synchronizable entities should use client-generated UUIDs.

---

# 8. Timestamp Conventions

Cloud metadata:

```text
created_at
updated_at
```

uses:

```text
timestamptz
```

with server-controlled values.

Domain event timestamps:

```text
started_at
completed_at
set.completed_at
```

may originate on the device because workouts must function offline.

---

# 9. Server Metadata Rule

Cloud:

```text
created_at
updated_at
```

must not be treated as authoritative client-supplied values.

Recommended:

```sql
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

with a PostgreSQL trigger updating:

```text
updated_at
```

on mutation.

Remote repository mappers should omit local `createdAt` and `updatedAt` metadata when writing to PostgreSQL unless a specific migration/import flow explicitly requires otherwise.

---

# 10. Canonical Weight Unit

All stored load values use:

```text
kilograms
```

Field convention:

```text
weight_kg
```

The user's display preference may be:

```text
lb
kg
```

but historical data is never rewritten when the display unit changes.

---

# 11. Weight Precision

Cloud:

```sql
numeric
```

Local SQLite:

```text
REAL
```

Do not round destructively when storing.

Round only for:

```text
display
equipment selection
UI formatting
```

---

# 12. User Ownership Principle

Every private user-owned cloud record must be directly or indirectly traceable to:

```text
auth.users.id
```

For tables where direct ownership materially improves:

- RLS
- indexing
- synchronization
- debugging

store:

```text
user_id
```

directly.

---

# 13. Ownership Consistency Rule

Direct `user_id` fields create intentional denormalization.

Therefore the database must prevent impossible states such as:

```text
sets.user_id = User A

while

sets.workout_id belongs to User B
```

RLS must not rely only on:

```text
auth.uid() = row.user_id
```

for child tables.

Insert/update policies must also verify referenced parent records belong to the same authenticated user.

---

# 14. Profiles Table

Table:

```sql
profiles
```

Purpose:

Stores havAI-specific settings for one Supabase Auth user.

Schema:

```sql
profiles
--------
user_id uuid primary key
display_name text null

weight_unit text not null
primary_goal text not null
rpe_preference text not null
progression_style text not null
default_rest_duration_seconds integer not null default 120

onboarding_completed boolean not null default false

created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Foreign key:

```text
profiles.user_id
→ auth.users.id
```

Delete behavior:

```text
ON DELETE CASCADE
```

---

# 15. Profile Constraints

## weight_unit

```text
lb
kg
```

Constraint:

```sql
check (weight_unit in ('lb', 'kg'))
```

---

## primary_goal

```text
strength
hypertrophy
hybrid
```

---

## rpe_preference

```text
hidden
optional
preferred
```

---

## progression_style

```text
conservative
balanced
aggressive
```

New profiles use `rpe_preference = 'optional'` and `progression_style = 'balanced'`. `default_rest_duration_seconds` must be positive and is editable under Training Preferences.

---

# 16. Profile RLS

User may:

```text
SELECT
INSERT
UPDATE
```

only where:

```text
auth.uid() = user_id
```

Profile deletion normally occurs through account deletion rather than ordinary client UI.

---

# 17. Exercises Table

Table:

```sql
exercises
```

Purpose:

Stores:

- built-in system exercises
- user-created custom exercises

Schema:

```sql
exercises
---------
id uuid primary key

owner_user_id uuid null

name text not null
primary_muscle_group text not null
equipment_type text not null
measurement_type text not null

is_system boolean not null default false
is_archived boolean not null default false

created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

---

# 18. Exercise Ownership

System exercise:

```text
owner_user_id = null
is_system = true
```

Custom exercise:

```text
owner_user_id = authenticated user
is_system = false
```

---

# 19. Exercise Constraints

A system exercise must satisfy:

```text
is_system = true
AND
owner_user_id IS NULL
```

A custom exercise must satisfy:

```text
is_system = false
AND
owner_user_id IS NOT NULL
```

This can be enforced with a check constraint.

---

# 20. Measurement Types

V1:

```text
weight_reps
bodyweight_reps
reps_only
```

Future:

```text
duration
distance
assisted_weight
```

Do not include future values until product support exists.

---

# 21. Muscle Groups

Application-controlled values:

```text
chest
back
shoulders
biceps
triceps
quads
hamstrings
glutes
calves
core
forearms
full_body
other
```

---

# 22. Equipment Types

V1:

```text
barbell
dumbbell
machine
cable
bodyweight
smith_machine
plate_loaded
kettlebell
band
other
```

---

# 23. Secondary Muscle Table

Table:

```sql
exercise_secondary_muscles
```

Schema:

```sql
exercise_secondary_muscles
--------------------------
exercise_id uuid not null
muscle_group text not null
```

Primary key:

```text
exercise_id + muscle_group
```

Foreign key:

```text
exercise_id
→ exercises.id
```

Delete behavior:

```text
ON DELETE CASCADE
```

---

# 24. Exercise Name Uniqueness

System exercise names should be unique among system exercises.

Custom exercise names do not need global uniqueness.

A user may create a custom exercise with a name identical to a system exercise.

The UI may warn, but the database should not block it.

---

# 25. Exercise Archive Behavior

System exercises:

```text
cannot be archived by normal user
```

Custom exercises:

```text
archive instead of hard delete
```

Why:

Historical workouts may still reference the exercise.

Archived custom exercises:

- hidden from normal picker
- visible in history
- restorable later

---

# 25A. User Exercise Preferences Table

`user_exercise_preferences` stores user-owned state for a system or accessible custom exercise without mutating the exercise definition.

```sql
user_exercise_preferences
-------------------------
id uuid primary key
user_id uuid not null
exercise_id uuid not null
is_favorite boolean not null default false
notes text null
rest_duration_seconds integer null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
unique (user_id, exercise_id)
```

`id` is a client-generated UUID used by the sync queue; `(user_id, exercise_id)` remains unique. The user and exercise foreign keys use `ON DELETE CASCADE`. A rest override, when present, must be positive. RLS permits only the owning user and verifies the exercise is system-owned or owned by that user. The whole row synchronizes as one preference entity.

---

# 26. Exercise RLS

Read:

```text
is_system = true
OR
owner_user_id = auth.uid()
```

Insert:

```text
owner_user_id = auth.uid()
AND
is_system = false
```

Update/archive:

```text
owner_user_id = auth.uid()
AND
is_system = false
```

Normal users cannot modify system exercises.

---

# 27. Workout Templates Table

Table:

```sql
workout_templates
```

Schema:

```sql
workout_templates
-----------------
id uuid primary key
user_id uuid not null

name text not null
notes text null

is_archived boolean not null default false

created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Foreign key:

```text
user_id
→ auth.users.id
ON DELETE CASCADE
```

---

# 28. Workout Template Exercises Table

Table:

```sql
workout_template_exercises
```

Schema:

```sql
workout_template_exercises
--------------------------
id uuid primary key

user_id uuid not null
template_id uuid not null
exercise_id uuid not null

position integer not null

target_sets integer not null
target_min_reps integer not null
target_max_reps integer not null

notes text null

created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

---

# 29. Template Exercise Constraints

```text
position >= 0

target_sets > 0

target_min_reps > 0

target_max_reps >= target_min_reps
```

Recommended:

```text
unique(template_id, position)
```

---

# 30. Template Exercise Foreign Keys

```text
user_id
→ auth.users.id
ON DELETE CASCADE
```

```text
template_id
→ workout_templates.id
ON DELETE CASCADE
```

```text
exercise_id
→ exercises.id
ON DELETE RESTRICT
```

Why `RESTRICT`:

Exercises with template references should be archived instead of deleted.

---

# 31. Template RLS

Template:

```text
auth.uid() = user_id
```

for normal CRUD.

Template-exercise child writes must verify:

```text
auth.uid() = user_id
```

AND:

```text
template_id belongs to auth.uid()
```

AND exercise is accessible:

```text
exercise.is_system = true
OR
exercise.owner_user_id = auth.uid()
```

This prevents cross-user parent/reference injection.

---

# 32. Template Delete Strategy

UI may call this:

```text
Delete Template
```

but V1 implementation should use:

```text
is_archived = true
```

Historical workouts remain unaffected.

---

# 33. Workouts Table

Table:

```sql
workouts
```

Schema:

```sql
workouts
--------
id uuid primary key
user_id uuid not null

source_template_id uuid null

name text not null
status text not null

started_at timestamptz not null
completed_at timestamptz null

notes text null

created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

---

# 34. Workout Status

V1:

```text
active
completed
discarded
```

Constraint:

```sql
check (status in ('active', 'completed', 'discarded'))
```

---

# 35. Workout Foreign Keys

```text
user_id
→ auth.users.id
ON DELETE CASCADE
```

```text
source_template_id
→ workout_templates.id
ON DELETE SET NULL
```

Historical workout must survive template archival/deletion.

---

# 36. Workout Snapshot Principle

Completed workouts must never be reconstructed from current template state.

At start time, copy relevant template configuration into:

```text
workout_exercises
```

Historical records stand alone.

---

# 37. Workout Exercises Table

Table:

```sql
workout_exercises
```

Schema:

```sql
workout_exercises
-----------------
id uuid primary key

user_id uuid not null
workout_id uuid not null
exercise_id uuid not null

position integer not null

target_sets integer null
target_min_reps integer null
target_max_reps integer null
target_weight_kg numeric null

source_recommendation_id uuid null

notes text null

created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

---

# 38. Workout Exercise Foreign Keys

```text
user_id
→ auth.users.id
ON DELETE CASCADE
```

```text
workout_id
→ workouts.id
ON DELETE CASCADE
```

```text
exercise_id
→ exercises.id
ON DELETE RESTRICT
```

```text
source_recommendation_id
→ progression_recommendations.id
ON DELETE SET NULL
```

---

# 39. Workout Exercise RLS

Normal CRUD must verify:

```text
auth.uid() = user_id
```

and:

```text
workout_id belongs to auth.uid()
```

and:

```text
exercise is accessible to auth.uid()
```

If `source_recommendation_id` exists:

```text
recommendation must belong to auth.uid()
```

---

# 40. Workout Exercise Ordering

Use:

```text
position
```

0-based.

Recommended:

```text
unique(workout_id, position)
```

Reordering may use safe temporary positions during transactional updates.

---

# 41. Sets Table

Table:

```sql
sets
```

Schema:

```sql
sets
----
id uuid primary key

user_id uuid not null
workout_id uuid not null
workout_exercise_id uuid not null
exercise_id uuid not null

position integer not null
set_type text not null

weight_kg numeric null
reps integer not null
rpe numeric null
notes text null

completed_at timestamptz not null

created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

---

# 42. Set Type

V1:

```text
working
warmup
```

Constraint:

```sql
check (set_type in ('working', 'warmup'))
```

Future:

```text
drop
backoff
amrap
assisted
```

not yet included.

---

# 43. Set Position

Use:

```text
position
```

0-based across all set types.

Do not store separate:

```text
set_number
```

as the canonical order field.

The UI derives labels such as:

```text
Warm-up 1
Set 1
Set 2
```

---

# 44. Set Foreign Keys

```text
user_id
→ auth.users.id
ON DELETE CASCADE
```

```text
workout_id
→ workouts.id
ON DELETE CASCADE
```

```text
workout_exercise_id
→ workout_exercises.id
ON DELETE CASCADE
```

```text
exercise_id
→ exercises.id
ON DELETE RESTRICT
```

---

# 45. Set Ownership Consistency

Insert/update must verify:

```text
workout belongs to auth.uid()
```

and:

```text
workout_exercise belongs to auth.uid()
```

and:

```text
workout_exercise.workout_id = sets.workout_id
```

and:

```text
workout_exercise.exercise_id = sets.exercise_id
```

The last two relationships should ideally be enforced with database validation, not only application code.

Possible approaches:

- trigger
- composite foreign-key pattern
- carefully designed SQL function/constraint

V1 must not rely solely on client validation for these consistency rules.

---

# 46. Rep Constraint

Database:

```text
reps >= 0
```

allows future failed-attempt semantics.

Normal completed V1 working-set UI should generally require:

```text
reps > 0
```

---

# 47. RPE Constraint

When present:

```text
6 <= rpe <= 10
```

Application validation additionally enforces:

```text
0.5 increments
```

---

# 48. Bodyweight Exercises

For:

```text
bodyweight_reps
```

`weight_kg` may be:

```text
NULL
```

Added-load bodyweight semantics are deferred.

---

# 49. Why `exercise_id` Exists on Sets

Although derivable through:

```text
set
→ workout_exercise
→ exercise
```

direct storage materially improves:

- exercise history queries
- PR queries
- progression calculations
- indexing

This is intentional denormalization.

---

# 50. Why `workout_id` Exists on Sets

Also derivable.

Direct storage improves:

- workout deletion
- workout fetches
- synchronization
- summary queries

Consistency must be enforced.

---

# 51. Progression Recommendations Table

Table:

```sql
progression_recommendations
```

Schema:

```sql
progression_recommendations
---------------------------
id uuid primary key

user_id uuid not null
exercise_id uuid not null

source_workout_id uuid null
source_workout_exercise_id uuid null

recommendation_type text not null

recommended_weight_kg numeric null

target_sets integer null
target_min_reps integer null
target_max_reps integer null

target_set_reps jsonb null

confidence text not null
reason_codes jsonb not null

status text not null

engine_version text not null

consumed_at timestamptz null

created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

---

# 52. Recommendation Types

```text
increase_weight
maintain_weight
increase_reps
repeat_target
decrease_weight
insufficient_data
```

---

# 53. Recommendation Status

```text
active
consumed
superseded
```

---

# 54. Recommendation Confidence

```text
low
medium
high
```

This is deterministic engine confidence.

Not LLM confidence.

---

# 55. Recommendation Foreign Keys

```text
user_id
→ auth.users.id
ON DELETE CASCADE
```

```text
exercise_id
→ exercises.id
ON DELETE RESTRICT
```

```text
source_workout_id
→ workouts.id
ON DELETE SET NULL
```

```text
source_workout_exercise_id
→ workout_exercises.id
ON DELETE SET NULL
```

---

# 56. Recommendation Source Consistency

When both source IDs are present:

```text
source_workout_exercise.workout_id
```

should match:

```text
source_workout_id
```

where practical.

Recommendation source records must belong to the same user.

---

# 57. Recommendation Reason Codes

Stored as:

```text
jsonb
```

Example:

```json
["TOP_OF_REP_RANGE_REACHED", "RPE_ACCEPTABLE"]
```

JSONB is appropriate because reason codes are:

- bounded
- structured
- normally read together
- not primary analytic dimensions in V1

---

# 58. Target Set Reps

Optional:

```json
[8, 8, 8]
```

Field:

```text
target_set_reps
```

If null, use general rep-range target.

---

# 59. Recommendation Versioning

Always store:

```text
engine_version
```

Example:

```text
progression-v1
```

Material algorithm changes require:

```text
progression-v2
```

Old recommendations remain traceable to their original engine.

---

# 60. One Active Recommendation Per Exercise

V1 should logically maintain at most:

```text
one active recommendation
per user + exercise
```

Recommended cloud enforcement:

partial unique index conceptually:

```text
(user_id, exercise_id)
WHERE status = 'active'
```

If offline sync temporarily creates an edge-case conflict, application sync logic should supersede/recalculate deterministically.

---

# 61. Recommendation RLS

User may access recommendations only where:

```text
auth.uid() = user_id
```

Insert/update must also verify:

- exercise accessible
- source workout belongs to user
- source workout exercise belongs to user

---

# 62. Personal Records Table

Table:

```sql
personal_records
```

Purpose:

Stores **current persistent PR state**, not every PR event.

Persistent V1 types:

```text
max_weight
estimated_1rm
```

Schema:

```sql
personal_records
----------------
id uuid primary key

user_id uuid not null
exercise_id uuid not null

record_type text not null

set_id uuid not null
workout_id uuid not null

weight_kg numeric null
reps integer null
estimated_1rm_kg numeric null

achieved_at timestamptz not null

created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

---

# 63. Persistent PR Types

Allowed:

```text
max_weight
estimated_1rm
```

Constraint:

```sql
check (record_type in ('max_weight', 'estimated_1rm'))
```

---

# 64. Rep PR Strategy

Rep PR means:

> Most reps performed at a particular load.

Example:

```text
185 × 9
```

may be a rep PR at 185 lb.

This is useful as a detected event but should not be stored as a permanent `personal_records` row for every weight.

Therefore:

```text
rep_pr
```

is a **detected PR event**, not a persistent PR-state type.

---

# 65. Personal Record Foreign Keys

```text
user_id
→ auth.users.id
ON DELETE CASCADE
```

```text
exercise_id
→ exercises.id
ON DELETE RESTRICT
```

```text
set_id
→ sets.id
ON DELETE CASCADE
```

```text
workout_id
→ workouts.id
ON DELETE CASCADE
```

If the source workout/set is deleted, the PR row must be recalculated rather than preserved with a broken source.

---

# 66. Personal Record Uniqueness

Recommended:

```text
unique(user_id, exercise_id, record_type)
```

because this table represents current best state.

---

# 67. Personal Record RLS

User may only access:

```text
auth.uid() = user_id
```

Writes must verify:

- exercise belongs/access is valid
- set belongs to user
- workout belongs to user
- set belongs to workout
- set exercise matches PR exercise

---

# 68. PR Recalculation

PR state should be recalculated when:

```text
workout completed
historical set edited
historical set deleted
historical workout deleted
raw history synchronized after offline usage
```

Raw workout history remains authoritative.

---

# 69. Workout Summary Storage

Do not create:

```text
workout_summaries
```

in V1.

Derive:

```text
duration
exercise count
working set count
total reps
```

from raw data.

---

# 70. Workout Duration

Canonical:

```text
completed_at - started_at
```

No stored duration field required.

---

# 71. Exercise History Query

Primary source:

```text
sets
JOIN workouts
```

Filter:

```text
user_id = current user
exercise_id = requested exercise
workout.status = completed
set_type = working
```

Order:

```text
workout.completed_at DESC
```

---

# 72. Cloud Indexes

Recommended indexes:

```text
profiles(user_id)

exercises(owner_user_id)
exercises(name)
exercises(is_system, is_archived)

workout_templates(user_id, updated_at)
workout_templates(user_id, is_archived)

workout_template_exercises(template_id, position)

workouts(user_id, completed_at desc)
workouts(user_id, started_at desc)
workouts(user_id, status)

workout_exercises(workout_id, position)
workout_exercises(user_id, exercise_id)

sets(workout_id)
sets(workout_exercise_id, position)
sets(user_id, exercise_id, completed_at desc)
user_exercise_preferences(user_id, is_favorite, updated_at desc)

progression_recommendations(user_id, exercise_id, status)

personal_records(user_id, exercise_id, record_type)
```

---

# 73. Full Foreign-Key Summary

Cloud foreign keys:

```text
profiles.user_id
→ auth.users.id
ON DELETE CASCADE
```

```text
exercises.owner_user_id
→ auth.users.id
ON DELETE CASCADE
```

```text
exercise_secondary_muscles.exercise_id
→ exercises.id
ON DELETE CASCADE
```

```text
user_exercise_preferences.user_id
→ auth.users.id
ON DELETE CASCADE
```

```text
user_exercise_preferences.exercise_id
→ exercises.id
ON DELETE CASCADE
```

```text
workout_templates.user_id
→ auth.users.id
ON DELETE CASCADE
```

```text
workout_template_exercises.user_id
→ auth.users.id
ON DELETE CASCADE
```

```text
workout_template_exercises.template_id
→ workout_templates.id
ON DELETE CASCADE
```

```text
workout_template_exercises.exercise_id
→ exercises.id
ON DELETE RESTRICT
```

```text
workouts.user_id
→ auth.users.id
ON DELETE CASCADE
```

```text
workouts.source_template_id
→ workout_templates.id
ON DELETE SET NULL
```

```text
workout_exercises.user_id
→ auth.users.id
ON DELETE CASCADE
```

```text
workout_exercises.workout_id
→ workouts.id
ON DELETE CASCADE
```

```text
workout_exercises.exercise_id
→ exercises.id
ON DELETE RESTRICT
```

```text
workout_exercises.source_recommendation_id
→ progression_recommendations.id
ON DELETE SET NULL
```

```text
sets.user_id
→ auth.users.id
ON DELETE CASCADE
```

```text
sets.workout_id
→ workouts.id
ON DELETE CASCADE
```

```text
sets.workout_exercise_id
→ workout_exercises.id
ON DELETE CASCADE
```

```text
sets.exercise_id
→ exercises.id
ON DELETE RESTRICT
```

```text
progression_recommendations.user_id
→ auth.users.id
ON DELETE CASCADE
```

```text
progression_recommendations.exercise_id
→ exercises.id
ON DELETE RESTRICT
```

```text
progression_recommendations.source_workout_id
→ workouts.id
ON DELETE SET NULL
```

```text
progression_recommendations.source_workout_exercise_id
→ workout_exercises.id
ON DELETE SET NULL
```

```text
personal_records.user_id
→ auth.users.id
ON DELETE CASCADE
```

```text
personal_records.exercise_id
→ exercises.id
ON DELETE RESTRICT
```

```text
personal_records.set_id
→ sets.id
ON DELETE CASCADE
```

```text
personal_records.workout_id
→ workouts.id
ON DELETE CASCADE
```

---

# 74. Cloud RLS Tables

Enable RLS on:

```text
profiles
exercises
exercise_secondary_muscles
user_exercise_preferences
workout_templates
workout_template_exercises
workouts
workout_exercises
sets
progression_recommendations
personal_records
```

---

# 75. Parent Ownership Enforcement

For child-table inserts/updates, RLS must verify parent ownership.

Examples:

## Template Exercise

Must verify:

```text
template belongs to auth.uid()
```

and:

```text
exercise is system or owned by auth.uid()
```

---

## Workout Exercise

Must verify:

```text
workout belongs to auth.uid()
```

and:

```text
exercise is accessible
```

and recommendation ownership if present.

---

## Set

Must verify:

```text
workout belongs to auth.uid()
```

```text
workout_exercise belongs to auth.uid()
```

```text
workout_exercise.workout_id = set.workout_id
```

```text
workout_exercise.exercise_id = set.exercise_id
```

---

## Recommendation

Must verify:

```text
exercise accessible
source workout owned if supplied
source workout exercise owned if supplied
```

---

## Personal Record

Must verify:

```text
source workout owned
source set owned
set/workout/exercise relationships match
```

---

# 76. RLS Philosophy

Application validation is useful.

RLS is mandatory.

Database consistency protection is mandatory where a malicious or buggy client could otherwise create invalid cross-user relationships.

Do not rely on:

```text
the mobile app would never do that
```

as a security model.

---

# 77. Local Database Philosophy

SQLite tables fall into three categories.

## Authoritative Unsynced Local Data

```text
local_workout_templates
local_workout_template_exercises
local_workouts
local_workout_exercises
local_sets
local_exercises
local_user_exercise_preferences
local_progression_recommendations
```

These may contain user-created data that does not yet exist in Supabase.

---

## Read Cache

```text
cached_recent_exercise_sessions
```

This exists to support:

- previous-session display
- offline progression
- offline history context

---

## Infrastructure

```text
sync_queue
local_schema_metadata
```

---

# 78. Local User Scoping

Every user-owned local table must store:

```text
user_id
```

The app must query rows for the current authenticated/cached user only.

This prevents account-switch contamination.

---

# 79. SQLite Timestamp Format

Use consistently formatted ISO 8601 text:

```text
TEXT
```

Example:

```text
2026-08-13T23:14:52.123Z
```

---

# 80. SQLite Boolean Format

Use:

```text
INTEGER
```

where required by SQLite abstraction:

```text
0
1
```

Map to booleans in data mappers.

---

# 81. Local Workout Templates Table

Table:

```sql
local_workout_templates
```

Schema:

```sql
local_workout_templates
-----------------------
id text primary key
user_id text not null

name text not null
notes text null

is_archived integer not null default 0

sync_status text not null

created_at text not null
updated_at text not null

server_updated_at text null
```

---

# 82. Local Workout Template Exercises Table

Table:

```sql
local_workout_template_exercises
```

Schema:

```sql
local_workout_template_exercises
--------------------------------
id text primary key
user_id text not null

template_id text not null
exercise_id text not null

position integer not null

target_sets integer not null
target_min_reps integer not null
target_max_reps integer not null

notes text null

sync_status text not null

created_at text not null
updated_at text not null

server_updated_at text null
```

Recommended local FK:

```text
template_id
→ local_workout_templates.id
ON DELETE CASCADE
```

---

# 83. Why Templates Are Locally Authoritative

V1 must support:

```text
create template offline
edit template offline
start workout offline
```

Therefore template tables are not merely caches.

Local mutations later synchronize with cloud.

---

# 84. Local Workouts Table

Table:

```sql
local_workouts
```

Schema:

```sql
local_workouts
--------------
id text primary key
user_id text not null

source_template_id text null

name text not null
status text not null

started_at text not null
completed_at text null

notes text null

sync_status text not null

created_at text not null
updated_at text not null

server_updated_at text null
```

---

# 85. Local Workout Exercises Table

Table:

```sql
local_workout_exercises
```

Schema:

```sql
local_workout_exercises
-----------------------
id text primary key
user_id text not null

workout_id text not null
exercise_id text not null

position integer not null

target_sets integer null
target_min_reps integer null
target_max_reps integer null
target_weight_kg real null

source_recommendation_id text null

notes text null

sync_status text not null

created_at text not null
updated_at text not null

server_updated_at text null
```

Local FK:

```text
workout_id
→ local_workouts.id
ON DELETE CASCADE
```

---

# 86. Local Sets Table

Table:

```sql
local_sets
```

Schema:

```sql
local_sets
----------
id text primary key
user_id text not null

workout_id text not null
workout_exercise_id text not null
exercise_id text not null

position integer not null
set_type text not null

weight_kg real null
reps integer not null
rpe real null
notes text null

completed_at text not null

sync_status text not null

deleted_at text null

created_at text not null
updated_at text not null

server_updated_at text null
```

`deleted_at` supports local tombstone behavior for previously synced deletions.

---

# 87. Local Exercises Table

Table:

```sql
local_exercises
```

Purpose:

Stores both:

- cached system exercises
- locally authored custom exercises

Schema:

```sql
local_exercises
---------------
id text primary key

owner_user_id text null

name text not null
primary_muscle_group text not null
secondary_muscle_groups_json text not null

equipment_type text not null
measurement_type text not null

is_system integer not null
is_archived integer not null

sync_status text not null

created_at text not null
updated_at text not null

server_updated_at text null
```

For system-exercise cache rows:

```text
sync_status = synced
```

For locally created custom exercises:

```text
pending_create / pending_update / pending_delete
```

as appropriate.

---

# 87A. Local User Exercise Preferences Table

```sql
local_user_exercise_preferences
-------------------------------
id text primary key
user_id text not null
exercise_id text not null
is_favorite integer not null default 0
notes text null
rest_duration_seconds integer null
sync_status text not null
deleted_at text null
created_at text not null
updated_at text not null
server_updated_at text null
unique (user_id, exercise_id)
```

This locally authoritative table makes favorites, persistent exercise notes, and per-exercise rest overrides available offline. Previously synchronized rows may be tombstoned for deletion.

---

# 88. Secondary Muscles Locally

SQLite may store secondary muscles as serialized JSON text:

```json
["chest", "triceps"]
```

This is acceptable because local filtering by secondary-muscle relation is not a core V1 query.

Cloud remains normalized.

---

# 89. Local Progression Recommendations Table

Table:

```sql
local_progression_recommendations
```

Schema:

```sql
local_progression_recommendations
---------------------------------
id text primary key

user_id text not null
exercise_id text not null

source_workout_id text null
source_workout_exercise_id text null

recommendation_type text not null

recommended_weight_kg real null

target_sets integer null
target_min_reps integer null
target_max_reps integer null

target_set_reps_json text null

confidence text not null
reason_codes_json text not null

status text not null

engine_version text not null

consumed_at text null

sync_status text not null

created_at text not null
updated_at text not null

server_updated_at text null
```

---

# 90. Why Recommendations Need Real Local Storage

Recommendations may be generated:

```text
after workout completion while offline
```

and must remain available for:

- next workout target
- app restart
- future sync
- recommendation consumption linkage

Therefore a reduced cache-only schema is insufficient.

---

# 91. No Local Personal Records Sync Table

V1 does **not** queue:

```text
personal_record
```

as an offline sync entity.

Persistent PR state is derived from raw history.

Local PR detection may happen immediately for UX.

After raw history reaches cloud:

```text
recalculate persistent PR state
```

from canonical workout data.

This avoids maintaining competing PR state across devices.

---

# 92. Cached Recent Exercise Sessions

Table:

```sql
cached_recent_exercise_sessions
```

Purpose:

Store enough recent raw performance data to support:

- previous-session UI
- offline progression
- offline comparison

Recommended schema:

```sql
cached_recent_exercise_sessions
-------------------------------
id text primary key

user_id text not null
exercise_id text not null
workout_id text not null

completed_at text not null

target_sets integer null
target_min_reps integer null
target_max_reps integer null

working_sets_json text not null

server_updated_at text null
```

Example `working_sets_json`:

```json
[
  {
    "weightKg": 83.9146,
    "reps": 8,
    "rpe": 8.5
  },
  {
    "weightKg": 83.9146,
    "reps": 7,
    "rpe": 9
  }
]
```

---

# 93. Why Recent History Cache Can Use JSON

This table is a read cache, not the canonical history database.

The real normalized raw history exists in:

```text
sets
workouts
```

in the cloud.

The cache exists for efficient offline reconstruction of recent comparable sessions.

---

# 94. History Cache Size

Recommended baseline:

```text
3-5 recent comparable sessions
per recently used exercise
```

The implementation may retain more because workout data is small.

Do not aggressively prune data needed for progression.

---

# 95. Sync Status Values

Local:

```text
synced
pending_create
pending_update
pending_delete
failed
```

These are application/internal states.

---

# 96. Sync Queue Table

Table:

```sql
sync_queue
```

Schema:

```sql
sync_queue
----------
id text primary key

entity_type text not null
entity_id text not null

operation text not null

attempt_count integer not null default 0

last_error text null
last_attempt_at text null

created_at text not null
```

Recommended unique constraint:

```text
unique(entity_type, entity_id)
```

---

# 97. Sync Entity Types

V1:

```text
workout_template
workout_template_exercise

custom_exercise

workout
workout_exercise
set

progression_recommendation
user_exercise_preference
```

Do not include:

```text
personal_record
```

in the offline queue.

---

# 98. Sync Operations

```text
upsert
delete
```

Upsert intentionally replaces separate create/update queue events.

---

# 99. Queue Coalescing

Example:

```text
create set
edit set
edit set again
```

Queue:

```text
one upsert
```

The sync engine reads the latest local entity state when processing.

---

# 100. Unsynced Create Then Delete

If record has never reached cloud:

```text
create
↓
delete
```

then:

- remove local record
- remove queue operation
- no remote delete required

---

# 101. Synced Delete

If record previously existed in cloud:

```text
delete locally
↓
hide from normal UI
↓
pending_delete
↓
queue DELETE
```

After remote confirmation:

```text
remove tombstone
```

---

# 102. Local Schema Metadata

Table:

```sql
local_schema_metadata
```

Schema concept:

```sql
local_schema_metadata
---------------------
key text primary key
value text not null
```

Required key:

```text
schema_version
```

May later hold:

```text
last_successful_sync_at
```

but feature-specific sync metadata may live elsewhere if cleaner.

---

# 103. Local Transactions

Important operations must be transactional.

## Start Workout

```text
insert workout
insert workout exercises
enqueue sync rows
```

---

## Complete Set

```text
insert set
enqueue set upsert
```

An immediate Undo runs another local transaction. For a never-synced set it removes the set plus pending upsert; for a cloud-known set it tombstones the set and queues the normal delete/update path. The rest timer starts only after the completion transaction commits and is not part of this transaction.

---

## Finish Workout

```text
update workout
insert recommendations
enqueue mutations
```

---

## Create Template

```text
insert template
insert template exercises
enqueue mutations
```

---

# 104. Sync Dependency Order

Recommended:

```text
custom exercise
      ↓
workout template
      ↓
workout template exercise
```

Workout path:

```text
custom/system exercise available
      ↓
workout
      ↓
workout exercise
      ↓
set
      ↓
progression recommendation
```

`user_exercise_preference` depends on its referenced custom/system exercise being available remotely, but does not gate workout or set synchronization.

Recommendations should not sync before their source workout records.

---

# 105. Server Updated Metadata

Local authoritative tables may store:

```text
server_updated_at
```

when a cloud version exists.

This can assist:

- incremental pulls
- debugging
- basic conflict awareness

But V1 does not promise full multi-device field-level conflict resolution.

---

# 106. V1 Conflict Scope

V1 assumes primarily:

```text
one actively used device
```

Full simultaneous multi-device conflict resolution is out of scope.

Required behavior:

- never overwrite active local workout with stale cloud data
- preserve unsynced raw local data
- do not silently drop conflicting raw history
- derived recommendations and PR state may be regenerated

---

# 107. Active Workout Protection

During a workout:

```text
local workout snapshot
```

wins over incoming template/recommendation changes.

Cloud pull must never rewrite:

- current exercise order
- current targets
- completed sets
- recommendation snapshot

without explicit user action.

---

# 108. Template Synchronization Conflict Behavior

V1 does not perform sophisticated field-level merges.

If local template has unsynced changes:

```text
do not overwrite with cloud copy
```

until sync resolves.

Cloud may later become canonical after successful push/pull.

---

# 109. Recommendation Synchronization

Recommendation is stored locally with:

```text
full recommendation fields
```

then synchronized later.

Same UUID must be preserved.

If recommendation conflict occurs:

```text
canonical raw history
```

may be used to recalculate a fresh active recommendation.

---

# 110. PR Synchronization Strategy

Do not sync local PR state through queue.

Instead:

```text
raw workout sync
↓
cloud/local recalculation
↓
persist current PR state
```

This prevents derived PR conflicts from becoming sync conflicts.

---

# 111. Historical Workout Editing

If a completed set is edited:

Raw record changes.

Then recalculate:

```text
PR state
recent metrics
active recommendation
```

Only affected exercise data should be recalculated.

---

# 112. Historical Workout Deletion

Deleting completed workout removes:

```text
workout
workout_exercises
sets
```

through cascade.

After deletion:

```text
recalculate affected PR state
recalculate affected recommendation
```

---

# 113. Recommendation Consumption

When a recommendation is used:

```text
workout_exercise.source_recommendation_id
```

stores the relationship.

Recommendation becomes:

```text
consumed
```

with:

```text
consumed_at
```

where appropriate.

This relationship enables future analysis:

```text
recommendation
→ resulting performance
```

---

# 114. Recommendation Outcome Dataset

Because workout exercises reference consumed recommendations, future analysis can answer:

```text
How often did the user successfully complete a recommended increase?
```

No separate recommendation-outcome table is required in V1.

---

# 115. AI Data Storage

Do not create persistent AI conversation tables in V1.

Coach conversation history remains:

```text
session/client state
```

unless future product requirements change.

---

# 116. Natural-Language Logging Storage

Raw AI input does not need long-term persistence.

Flow:

```text
text
↓
AI parse
↓
validated candidate sets
↓
user confirmation
↓
normal set persistence
```

Only confirmed structured workout data is stored.

---

# 117. Notes

V1 stores optional notes in their owning records:

```text
workouts.notes
workout_templates.notes
workout_template_exercises.notes
workout_exercises.notes
sets.notes
user_exercise_preferences.notes
```

Do not create a generic polymorphic notes system.
Workout and set notes synchronize with their parent entities. Persistent exercise notes synchronize with the user exercise preference entity. All are user-authored subjective text and are not deterministic progression inputs.

---

# 118. Database Views

Avoid initial PostgreSQL views unless repeated query complexity justifies them.

Potential future:

```text
exercise_session_summary
exercise_progress_summary
```

Not required now.

---

# 119. RPC Functions

Do not wrap ordinary CRUD in PostgreSQL RPCs.

Potential legitimate later use:

```text
complex atomic analytics
server-side recalculation
```

V1 should remain straightforward.

---

# 120. JSON Usage Rule

Use JSON/JSONB only where data is naturally bounded and semi-structured.

Good:

```text
target_set_reps
reason_codes
cached recent set arrays
secondary muscles in local cache
```

Do not store entire canonical workouts as JSON blobs.

---

# 121. Why Cloud Workouts Stay Relational

havAI must efficiently query:

```text
all incline bench sessions

best set at 185 lb

highest e1RM

last five squat sessions

all workouts containing an exercise
```

Normalized relational history supports these cleanly.

---

# 122. Migration Strategy

Cloud migrations:

```text
supabase/migrations/
```

Local migrations:

```text
src/db/migrations/
```

Applied migrations are immutable.

If schema changes:

```text
create a new migration
```

Do not rewrite shared migration history.

---

# 123. Cloud Migration Naming

Use timestamped descriptive names.

Example:

```text
20260813_create_profiles.sql
20260813_create_exercises.sql
20260813_create_workouts.sql
20260813_add_rls_policies.sql
```

Exact CLI-generated timestamp format may differ.

---

# 124. Local Migration Naming

Example:

```text
001_initial_schema.ts
002_add_recommendations.ts
003_add_server_updated_at.ts
```

Use one consistent convention.

---

# 125. Local Migration Safety

Local migrations must preserve:

```text
active workouts
pending sync operations
templates
custom exercises
recommendations
```

Never reset production SQLite simply because schema changed.

---

# 126. Seed Strategy

System exercise seed must be deterministic.

Each exercise includes:

```text
stable UUID
name
primary muscle
secondary muscles
equipment
measurement type
is_system = true
```

---

# 127. Seed Size

Initial production seed target:

```text
50-100 common exercises
```

Quality is more important than exhaustive coverage.

Custom exercises handle uncommon movements.

---

# 128. Stable System UUIDs

System UUIDs should remain identical across:

```text
development
tests
production
```

This reduces environment-specific reference drift.

---

# 129. Multi-User Readiness

From day one:

```text
all private records belong to a user
```

No singleton assumptions.

Do not create global:

```text
current_workout
current_user_template
```

tables.

---

# 130. Multi-Device Future Compatibility

The schema supports future multi-device behavior through:

```text
UUIDs
cloud canonical records
server timestamps
local server_updated_at metadata
```

But full conflict resolution is deliberately deferred.

---

# 131. Potential Future Progression Settings

V1 uses:

```text
profiles.progression_style
```

Future:

```text
exercise_progression_settings
```

may support per-exercise behavior.

Do not add yet.

---

# 132. Potential Future Programs

Future structured programming might add:

```text
programs
program_days
program_blocks
periodization_phases
```

V1 templates do not attempt to model this.

---

# 133. Potential Future Body Metrics

Future:

```text
body_metrics
```

could store:

- bodyweight
- body-fat estimates
- measurements

Not V1.

---

# 134. Cloud Schema Diagram

```text
┌─────────────────┐
│   auth.users    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    profiles     │
└─────────────────┘


┌─────────────────┐
│    exercises    │
└────────┬────────┘
         │
         ▼
┌────────────────────────────┐
│ exercise_secondary_muscles │
└────────────────────────────┘

┌─────────────────────────────┐
│ user_exercise_preferences   │
└─────────────────────────────┘


┌────────────────────┐
│ workout_templates  │
└─────────┬──────────┘
          │
          ▼
┌────────────────────────────┐
│ workout_template_exercises │
└───────────┬────────────────┘
            │
            ▼
        exercises


┌─────────────────┐
│    workouts     │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ workout_exercises   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────┐
│      sets       │
└─────────────────┘


┌─────────────────────────────┐
│ progression_recommendations │
└─────────────────────────────┘


┌──────────────────┐
│ personal_records │
└──────────────────┘
```

---

# 135. Local Schema Diagram

```text
LOCAL SQLITE

┌──────────────────────────┐
│ local_workout_templates  │
└────────────┬─────────────┘
             │
             ▼
┌───────────────────────────────────┐
│ local_workout_template_exercises  │
└───────────────────────────────────┘


┌──────────────────┐
│ local_exercises  │
└──────────────────┘

┌───────────────────────────────────┐
│ local_user_exercise_preferences   │
└───────────────────────────────────┘


┌──────────────────┐
│ local_workouts   │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────┐
│ local_workout_exercises │
└───────────┬─────────────┘
            │
            ▼
┌──────────────────┐
│    local_sets    │
└──────────────────┘


┌─────────────────────────────────────┐
│ local_progression_recommendations   │
└─────────────────────────────────────┘


┌─────────────────────────────────┐
│ cached_recent_exercise_sessions │
└─────────────────────────────────┘


┌──────────────────┐
│    sync_queue    │
└──────────────────┘

┌───────────────────────┐
│ local_schema_metadata │
└───────────────────────┘
```

---

# 136. Cloud vs Local Mapping

```text
local_workout_templates
→ workout_templates

local_workout_template_exercises
→ workout_template_exercises

local_exercises (custom only)
→ exercises

local_user_exercise_preferences
→ user_exercise_preferences

local_workouts
→ workouts

local_workout_exercises
→ workout_exercises

local_sets
→ sets

local_progression_recommendations
→ progression_recommendations
```

No direct sync mapping:

```text
cached_recent_exercise_sessions
```

because it is a read cache.

No direct offline queue mapping:

```text
personal_records
```

because PR state is derived.

---

# 137. Database Integrity Rules

The system/database must prevent:

```text
negative target sets

max reps below min reps

invalid RPE

invalid set type

invalid workout status

user A child record referencing user B parent

set workout mismatch

set exercise mismatch

template exercise referencing inaccessible custom exercise

workout exercise referencing inaccessible recommendation

duplicate active recommendation for user/exercise

duplicate persistent PR state for user/exercise/type
```

---

# 138. Recommended Unique Constraints

Cloud:

```text
workout_template_exercises(template_id, position)

workout_exercises(workout_id, position)

personal_records(user_id, exercise_id, record_type)
```

Partial:

```text
progression_recommendations(user_id, exercise_id)
WHERE status = 'active'
```

Local:

```text
sync_queue(entity_type, entity_id)
```

Potentially:

```text
local_workout_template_exercises(template_id, position)
```

---

# 139. Data Export Compatibility

The schema should support future exports such as:

```text
CSV
JSON
```

Example export:

```text
date
exercise
set
weight
reps
RPE
```

No schema redesign required.

---

# 140. Production Data Principle

Raw workout history must always be enough to reconstruct:

```text
what happened
```

Recommendation rows must answer:

```text
what havAI recommended
```

Persistent PR rows must answer:

```text
what the current recognized best is
```

AI explanation is not part of database truth.

---

# 141. Final Data Separation

```text
RAW HISTORY
≠
RECOMMENDATION
≠
PR STATE
≠
AI EXPLANATION

USER-AUTHORED NOTES
≠
STRUCTURED WORKOUT FACTS
```

Each has a different role.

---

# 142. Database Definition of Done

The V1 database layer is complete when:

- every authenticated user has an isolated profile
- system exercises are readable but immutable to normal users
- user exercise preferences isolate favorites, persistent notes, and rest overrides without mutating system exercises
- workout and set notes exist on their owning raw entities locally and remotely
- custom exercises are private and archivable
- templates can be created locally before cloud sync
- template exercises preserve order and targets
- active workouts snapshot template/recommendation state
- completed workouts remain historically stable
- working and warm-up sets are distinguishable
- canonical weights are stored in kilograms
- RPE remains optional
- exercise history can be queried efficiently
- recommendations can be generated and persisted offline
- recommendations can later sync with full fidelity
- recommendations link to source workout data
- workouts can link back to consumed recommendations
- rep PRs can be detected without bloating persistent PR storage
- persistent max-weight/e1RM PR state is recalculable
- personal-record state is not an offline sync-queue entity
- child-table RLS validates parent ownership
- malicious cross-user parent references are rejected
- local templates survive restart
- active workouts survive restart
- completed sets survive restart
- sync queue survives restart
- retries remain idempotent
- local unsynced raw workout data is never silently discarded
- schema changes are migration-driven
- local migrations preserve data
- system exercise seeds use stable IDs

---

# 143. Final Database Principle

For every critical database design decision, preserve this hierarchy:

```text
1. RAW USER WORKOUT DATA MUST NOT BE LOST

2. SECURITY MUST BE ENFORCED SERVER-SIDE

3. OFFLINE ACTIONS MUST HAVE A REAL LOCAL HOME

4. DERIVED DATA SHOULD BE REGENERATABLE

5. CACHE DATA MUST NOT BE CONFUSED WITH AUTHORITATIVE DATA
```

The most important question for every workout row remains:

> If the phone loses internet immediately after this action, where does the authoritative local record live?

For V1, that answer must be explicit and deterministic.
