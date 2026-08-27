# havAI V1 Offline and Sync Specification

## 1. Purpose

This document defines how havAI V1 behaves when network connectivity is:

- available
- slow
- intermittent
- unavailable
- restored after an outage

It also defines how locally authored data synchronizes with Supabase PostgreSQL.

The core requirement is:

> A user must be able to complete a workout without reliable internet access and without losing workout data.

Workout logging must remain functional if:

- the gym has poor reception
- Wi-Fi disconnects
- cellular data fails
- Supabase is temporarily unavailable
- authentication refresh temporarily fails
- the app is backgrounded
- the app is force-closed
- the operating system terminates the app
- the phone restarts

The synchronization system must prioritize:

```text
data durability
correctness
idempotency
predictability
```

over aggressive real-time cloud consistency.

---

# 2. Core Offline Principle

havAI is local-first for workout-critical functionality.

The primary mutation flow is:

```text
USER ACTION
    ↓
LOCAL SQLITE
    ↓
LOCAL TRANSACTION COMMIT
    ↓
IMMEDIATE UI UPDATE
    ↓
SYNC QUEUE
    ↓
SUPABASE WHEN AVAILABLE
```

Not:

```text
USER ACTION
    ↓
SUPABASE
    ↓
WAIT
    ↓
UI UPDATE
```

A normal set-completion action must never depend on cloud availability.

---

# 3. Sources of Truth

havAI has different authorities depending on data state.

## Unsynced Local User Data

For unsynced locally created or modified records:

```text
SQLite
```

is authoritative.

Examples:

- active workout
- unsynced completed sets
- offline-created workout template
- offline-created custom exercise
- locally generated progression recommendation
- local edit waiting for synchronization

---

## Successfully Synchronized Raw History

After successful synchronization:

```text
Supabase PostgreSQL
```

is the canonical cloud copy of synchronized raw workout data.

SQLite may still hold a local copy.

---

## Active Workout

While a workout is active:

```text
local SQLite workout snapshot
```

is authoritative for that session.

Incoming cloud changes must not rewrite it.

---

## Read Caches

Cached data such as:

```text
cached_recent_exercise_sessions
```

is never authoritative.

It may be replaced safely by newer cloud data when no protected local state depends on it.

---

# 4. Raw vs Derived Sync Philosophy

Raw workout history receives the strongest protection.

## Raw Data

```text
workout
workout_exercise
set
```

must synchronize without loss.

---

## User-Authored Configuration

```text
workout_template
workout_template_exercise
custom_exercise
user_exercise_preference
```

also synchronizes because these records may be created offline.

---

## Progression Recommendations

```text
progression_recommendation
```

synchronize because they:

- may be created offline
- need to survive restart
- may be consumed by a later workout
- contain engine-version metadata

---

## Personal Record State

```text
personal_record
```

does **not** travel through the offline sync queue.

Persistent PR state is derived from canonical workout history.

Flow:

```text
RAW WORKOUT HISTORY
        ↓
SYNC
        ↓
RECALCULATE PR STATE
        ↓
PERSIST CURRENT PR STATE
```

Rep PRs remain derived/detected events and are not permanent PR-state rows.

---

# 5. Offline-Capable Features

The following must work without connectivity when required local data exists:

- open the app with usable cached session state
- resume an active workout
- create a workout template
- edit a workout template
- archive a workout template
- use a locally stored template
- start a workout
- create a custom exercise
- use a local custom exercise
- view cached/system exercises
- view the current workout
- view locally available previous-session data
- view current cached/local recommendation
- log working sets
- log warm-up sets
- edit completed sets
- delete completed sets
- undo a just-completed set
- create and edit workout notes and set notes
- favorite exercises and edit persistent exercise notes/rest overrides
- operate the rest timer after local set persistence
- add extra sets
- switch exercises
- reorder exercises during the current session
- add exercises to the active workout
- finish the workout
- calculate workout metrics
- detect locally supported PR events
- calculate progression recommendations using locally available history
- view workout summary
- restore workout after app restart

---

# 6. Features That Require Connectivity in V1

The following may require internet:

- first-time signup
- login with no cached session
- password/reset-related auth flows
- cloud synchronization
- fetching uncached older workout history
- AI Coach
- AI recommendation explanation
- natural-language Quick Log
- downloading cloud changes not already local

Core workout logging must remain unaffected.

---

# 7. Local Database Categories

SQLite records belong to three categories.

## Authoritative Local Data

```text
local_workout_templates
local_workout_template_exercises

local_exercises

local_workouts
local_workout_exercises
local_sets

local_progression_recommendations
```

These may contain user-authored data not yet present in cloud.

---

## Read Cache

```text
cached_recent_exercise_sessions
```

This is replaceable.

---

## Sync Infrastructure

```text
sync_queue
local_schema_metadata
```

---

# 8. Why Templates Are Locally Authoritative

Workout templates are not merely cached.

V1 supports:

```text
create template offline
edit template offline
start template offline
```

Therefore:

```text
local_workout_templates
local_workout_template_exercises
```

are real locally authored records.

Later:

```text
SQLite
↓
sync queue
↓
Supabase workout_templates
```

---

# 9. Why Custom Exercises Are Locally Authoritative

A custom exercise may be created offline and immediately used in:

- a template
- an active workout

Therefore its UUID must be generated locally and preserved.

Example:

```text
custom exercise UUID = abc
```

The same ID becomes:

```text
Supabase exercises.id = abc
```

after synchronization.

---

# 10. Why Recommendations Need Local Persistence

A workout may finish offline.

Flow:

```text
Finish Workout
↓
Progression Engine
↓
Generate Recommendation
↓
Save Recommendation Locally
↓
Show User
↓
Sync Later
```

Therefore recommendations cannot exist only in a reduced read cache.

They must live in:

```text
local_progression_recommendations
```

with enough data to fully synchronize later.

---

# 11. Local Write Rule

Every critical mutation follows:

```text
validate
↓
begin SQLite transaction
↓
write/update local entity
↓
update local sync state
↓
enqueue or coalesce sync operation
↓
commit
↓
update UI
```

Where practical, local entity mutation and queue mutation must be atomic.

---

# 12. Atomicity Example: Complete Set

When the user completes:

```text
185 lb × 8
```

the transaction should include:

```text
INSERT local_sets
+
UPSERT sync_queue
```

If queue insertion fails:

```text
transaction rolls back
```

The app should not show the set as safely completed unless required durable local state exists.

After commit, a working-set completion may start the isolated rest timer and display Undo. Neither belongs inside the data transaction. Timer failure has no effect on the set or queue.

---

# 13. Local Failure vs Cloud Failure

This distinction is critical.

## SQLite Failure

Potential data-safety problem.

Expected:

```text
Set not marked complete
User sees clear local-save error
```

---

## Cloud Failure

Data is already safe locally.

Expected:

```text
Set remains completed
Sync remains pending
User may see subtle sync status
```

Do not tell the user:

```text
Workout save failed
```

when only cloud synchronization failed.

---

# 14. Immediate UI Behavior

After successful local commit:

```text
Set 2
190 × 7
```

should immediately render as completed.

Do not show a network spinner.

Cloud synchronization occurs independently.

---

# 15. Sync Entity Types

V1 queue entity types:

```text
workout_template
workout_template_exercise

custom_exercise

workout
workout_exercise
set

progression_recommendation
```

Not included:

```text
personal_record
cached_recent_exercise_session
system_exercise
```

---

# 16. Sync Operations

Supported:

```text
upsert
delete
```

Do not maintain separate event-style:

```text
create
update
update
update
```

operations for the same entity unless future requirements demand it.

---

# 17. Sync Queue Item

Conceptual contract:

```ts
type SyncQueueItem = {
  id: string;

  entityType:
    | "workout_template"
    | "workout_template_exercise"
    | "custom_exercise"
    | "workout"
    | "workout_exercise"
    | "set"
    | "progression_recommendation";

  entityId: string;

  operation: "upsert" | "delete";

  attemptCount: number;

  createdAt: string;

  lastAttemptAt?: string;
  lastError?: string;
};
```

---

# 18. Queue References Entity State

The sync queue should generally not contain the complete entity payload.

Instead:

```text
queue item
↓
entity type + entity ID
↓
read latest authoritative local row
↓
map to cloud payload
```

This naturally supports coalescing.

---

# 19. Queue Coalescing

Example:

```text
Create template
↓
Rename template
↓
Edit notes
↓
Change exercise order
```

For each changed entity, keep the latest logical pending:

```text
UPSERT
```

rather than every historical mutation.

---

# 20. Queue Uniqueness

Recommended logical uniqueness:

```text
entity_type + entity_id
```

One entity should not normally have multiple simultaneous pending queue rows.

---

# 21. Create Followed by Edit

Example:

```text
create set
185 × 7

edit
185 × 8
```

before synchronization.

Expected:

```text
one pending set UPSERT
```

Sync engine reads:

```text
185 × 8
```

from local storage.

---

# 22. Unsynced Create Followed by Delete

If the entity never existed in cloud:

```text
local create
↓
local delete
```

then:

- remove local entity
- remove pending upsert
- do not send remote delete

Example:

```text
new extra set
↓
delete before reconnect
```

No cloud action is required.

---

# 23. Previously Synced Delete

If entity already exists remotely:

```text
synced
↓
delete offline
```

then:

```text
hide locally
mark pending_delete / tombstone
enqueue DELETE
```

After server confirms:

```text
remove local tombstone
remove queue item
```

Immediate set-completion Undo applies these same rules without the ordinary destructive confirmation: remove the never-synced local set and pending upsert, or tombstone/queue a safe delete when the set is already cloud-known. Repeating an Undo-related sync operation remains idempotent.

---

# 24. Local Sync Status

Recommended statuses:

```text
synced
pending_create
pending_update
pending_delete
failed
```

These statuses are internal.

They do not need to be shown directly to normal users.

---

# 25. User-Facing Sync Status

Use:

```text
Saved
Syncing
Offline
Needs Attention
```

Only show status when meaningful.

Normal online successful use should generally show no persistent sync UI.

---

# 26. Connectivity Detection

Connectivity signals are advisory.

A device reporting:

```text
online
```

does not guarantee:

- DNS works
- Supabase responds
- auth is valid
- request completes

Actual remote operation success is authoritative.

---

# 27. Sync Triggers

Attempt synchronization when:

1. local mutation occurs and network appears usable
2. network transitions from offline to online
3. app enters foreground
4. workout finishes and network is available
5. authentication becomes valid again
6. user manually taps Retry

---

# 28. No Aggressive Polling

Do not poll every few seconds.

havAI does not require instant cloud consistency.

Use event-driven synchronization.

---

# 29. Sync Engine Lock

Only one queue processor should run at a time.

Potential concurrent triggers:

```text
set mutation
+
network reconnect
+
app foreground
+
manual retry
```

must not create parallel sync loops.

---

# 30. Reentrant Sync Behavior

If sync is already running:

```text
do not start another processor
```

After current pass completes:

```text
queue still non-empty?
```

If yes, optionally run another pass.

---

# 31. Sync Loop

Conceptually:

```text
Acquire Sync Lock
        ↓
Check Authentication
        ↓
Check Connectivity
        ↓
Load Queue
        ↓
Resolve Dependencies
        ↓
Process Eligible Mutations
        ↓
Pull Relevant Cloud Updates
        ↓
Update Caches
        ↓
Release Lock
```

---

# 32. Dependency Principle

Entities must not synchronize before required parent/reference records exist remotely.

Queue insertion order is not enough.

The sync engine must understand dependencies.

---

# 33. Custom Exercise Dependencies

If a locally created custom exercise is referenced by:

```text
template exercise
workout exercise
```

then:

```text
custom exercise
```

must synchronize first.

---

# 34. Template Dependencies

```text
workout_template
      ↓
workout_template_exercise
```

Template exercise cannot sync before:

- template
- referenced custom exercise, if applicable

exist remotely.

---

# 35. Workout Dependencies

```text
workout
   ↓
workout_exercise
   ↓
set
```

If workout exercise references a custom exercise:

```text
custom exercise
```

must exist first.

---

# 36. Recommendation Dependencies

Recommendation may reference:

```text
source_workout_id
source_workout_exercise_id
```

Therefore:

```text
workout
↓
workout_exercise
↓
progression_recommendation
```

must be respected.

---

# 37. Recommendation Consumption Dependency

If a new workout exercise references:

```text
source_recommendation_id
```

then that recommendation must exist remotely before the workout exercise can safely synchronize.

The dependency graph must account for both directions of historical linkage.

---

# 38. Dependency Graph Must Be Explicit

Do not infer dependencies only from:

```text
queue order
created_at
```

Maintain an explicit entity dependency model in the sync engine.

---

# 39. Client-Generated UUIDs

All synchronizable user-created records receive their final UUID locally.

Examples:

```text
template
template exercise
custom exercise
workout
workout exercise
set
recommendation
```

Cloud uses the same IDs.

---

# 40. Why Client UUIDs Matter

They allow:

- offline creation
- cross-record references
- safe retries
- idempotent upserts
- no server round-trip just to obtain IDs

---

# 41. Idempotent Upserts

Retrying:

```text
UPSERT set abc
```

must result in:

```text
one cloud row with ID abc
```

not duplicates.

---

# 42. Retry Scenario

Example:

```text
client sends set abc
↓
server commits
↓
response lost
↓
client believes request failed
↓
retry
```

Expected final cloud state:

```text
one set abc
```

---

# 43. Retry Policy

Transient failures may retry automatically.

Examples:

- timeout
- connectivity loss
- DNS failure
- temporary Supabase 5xx

Use bounded backoff.

Conceptually:

```text
attempt 1
↓
short delay

attempt 2
↓
longer delay

attempt 3
↓
longer delay
```

---

# 44. Retry Cap

Do not repeatedly retry forever in a tight loop.

After repeated failure:

```text
keep queue item
mark failure metadata
stop current retry cycle
```

Later triggers may retry.

---

# 45. Non-Retryable Errors

Examples may include:

```text
authorization failure
invalid schema payload
deleted parent
invalid constraint state
```

Do not blindly retry these indefinitely.

Record the failure and surface:

```text
Needs Attention
```

if appropriate.

---

# 46. Authentication During Sync

Remote synchronization requires valid authenticated Supabase context.

If auth cannot refresh:

```text
pause cloud sync
```

Do not block local workout functionality.

---

# 47. Authentication Expiration During Workout

Example:

```text
start workout online
↓
token expires
↓
network unavailable
↓
continue workout
```

Expected:

- sets still save locally
- workout can finish
- recommendation can generate locally
- queue remains pending

When auth returns:

```text
resume sync
```

---

# 48. Reauthentication

If user signs back into the same account:

```text
pending local records
```

resume synchronization.

Do not delete or recreate local workout records merely because the auth token expired.

---

# 49. Logout Protection

Before logout:

```text
check unsynced authoritative local data
```

If none:

```text
logout
```

If pending data exists:

```text
You have data that has not synced yet.

[Cancel]
[Try Sync]
```

V1 should not silently orphan unsynced user data.

---

# 50. Account Switching

Every user-owned local entity must be scoped by user identity.

Do not render:

```text
User A's local data
```

after User B logs in.

V1 does not optimize for multiple people sharing one phone, but isolation must still be correct.

---

# 51. Local Template Creation Offline

Flow:

```text
Create Template
↓
Generate UUID
↓
Save local_workout_templates
↓
Save local_workout_template_exercises
↓
Queue UPSERTs
↓
Show template immediately
```

No internet required.

---

# 52. Template Editing Offline

Flow:

```text
Edit local template
↓
Update local rows
↓
Queue/coalesce UPSERTs
```

User sees latest local state immediately.

---

# 53. Template Archive Offline

V1 uses archive semantics.

Flow:

```text
Archive template locally
↓
hide from normal list
↓
queue template UPSERT
```

Do not hard-delete historical workout references.

---

# 54. Template Exercise Removal

If cloud-synced template exercise is removed:

```text
queue DELETE
```

If never synchronized:

```text
remove local row
remove pending upsert
```

---

# 55. Local Custom Exercise Creation

Flow:

```text
Create Custom Exercise
↓
Generate UUID
↓
Save local_exercises
↓
mark non-system
↓
queue UPSERT custom_exercise
```

It may immediately be used by a template/workout.

---

# 56. Custom Exercise Sync Ordering

If template/workout references custom exercise:

```text
custom exercise must sync first
```

The sync engine must block dependent rows until successful.

---

# 57. System Exercises

System exercises are cloud-seeded and cached locally.

They are not locally authored.

They do not require queue synchronization.

---

# 58. Starting Workout Offline

A workout can start offline if all required entities exist locally.

Because templates are locally authoritative, normal existing templates qualify automatically.

Flow:

```text
Start Workout
↓
Generate workout UUID
↓
Snapshot template
↓
Create local workout
↓
Create local workout exercises
↓
Queue sync
↓
Enter workout
```

---

# 59. Template Snapshot Requirement

Once workout starts:

```text
active workout
```

must not depend on live template state.

Snapshot:

- workout name
- exercise IDs
- exercise order
- target sets
- target rep ranges
- target weight
- source recommendation ID

Later template changes do not rewrite the active workout.

---

# 60. Recommendation Snapshot

If an active recommendation exists when workout starts:

```text
copy relevant recommendation target
```

into:

```text
local_workout_exercises
```

and preserve:

```text
source_recommendation_id
```

---

# 61. Recommendation Consumption Offline

If recommendation is consumed while offline:

```text
update local recommendation status
consumed_at
```

and queue recommendation upsert.

The workout exercise references the same recommendation UUID.

---

# 62. Active Workout Local Authority

While workout is active, local state is protected from cloud pull.

Never overwrite:

```text
exercise order
target values
completed sets
source recommendation snapshot
notes
```

from incoming cloud data.

---

# 63. Set Completion Offline

Flow:

```text
Enter weight/reps/RPE
and optional set note
↓
Complete Set
↓
SQLite transaction
↓
local_sets
+
sync_queue
↓
UI completes instantly
```

Workout notes synchronize as part of the workout row. Set notes synchronize as part of the set row. Favorites, persistent exercise notes, and per-exercise rest overrides synchronize together as `user_exercise_preference`; this mutation depends on the referenced exercise but does not block workout logging.

---

# 64. Set Edit Offline

Flow:

```text
edit local set
↓
update SQLite
↓
coalesce set UPSERT
```

---

# 65. Set Delete Offline

Use the create/delete distinction described earlier.

Raw data should never disappear from cloud merely because local state got confused.

Delete behavior must be deliberate.

---

# 66. Warm-Up Sets

Warm-ups synchronize like other set rows.

They are distinguished by:

```text
set_type = warmup
```

Progression logic filters them later.

---

# 67. Extra Sets

Extra sets synchronize normally.

They do not modify:

```text
template target_sets
```

automatically.

---

# 68. Workout Completion Offline

Full local flow:

```text
Finish Workout
↓
SQLite transaction
↓
status = completed
↓
completed_at
↓
calculate summary
↓
detect PR events
↓
calculate progression recommendations
↓
persist local recommendations
↓
queue raw + recommendation changes
↓
show summary
```

Cloud is not required.

---

# 69. Recommendation Generation Offline

The progression engine operates from:

```text
current local session
+
locally available recent history
```

If sufficient data exists:

```text
generate recommendation
```

If not:

```text
insufficient_data
```

Do not invent history.

---

# 70. Recommendation Local Persistence

Store in:

```text
local_progression_recommendations
```

including:

- recommendation type
- target weight
- rep targets
- confidence
- reason codes
- source workout
- engine version
- status

This recommendation survives restart.

---

# 71. PR Detection Offline

PR events may be calculated from locally available history.

Examples:

```text
new max weight
new e1RM
rep PR at load
```

If the complete relevant history is locally available, these can be displayed immediately.

---

# 72. PR State Is Not Queued

Do not create:

```text
sync_queue personal_record
```

entries.

Persistent cloud PR state is recalculated after raw history sync.

---

# 73. PR Recalculation After Sync

After relevant raw workout synchronization succeeds:

```text
recalculate:
max_weight
estimated_1rm
```

Then persist current cloud PR state.

This may be done:

- client-side through normal authenticated cloud writes
- via a future server function

depending on final implementation.

The architecture requirement is:

> PR state must derive from canonical raw history.

---

# 74. Rep PR Handling

Rep PRs remain derived/detected events.

Do not create permanent cloud PR rows for every weight.

They may still appear:

```text
Workout Summary
Progress screen
```

when calculated.

---

# 75. App Backgrounding

When app enters background:

- completed sets already exist in SQLite
- active workout exists in SQLite
- queue exists in SQLite
- canonical timer does not depend on JavaScript interval

No required background network task is assumed.

---

# 76. Workout Timer

Canonical duration uses timestamps.

During active workout:

```text
current time - started_at
```

After completion:

```text
completed_at - started_at
```

A display timer may tick visually, but it is not authoritative.

---

# 77. App Process Termination

If OS kills havAI:

```text
reopen
↓
open SQLite
↓
find active workout
↓
restore
```

Completed sets must still exist.

---

# 78. Force Close

Same requirement.

Force closing does not mean:

```text
discard workout
```

---

# 79. Phone Restart

SQLite remains durable.

On reopen:

```text
active workout found
↓
Resume Workout
```

---

# 80. Active Workout Restoration

Restore:

- workout ID
- name
- started timestamp
- status
- exercise order
- targets
- source recommendation linkage
- completed sets
- warm-up sets
- local notes
- local sync states
- last active exercise where implemented

---

# 81. Draft Inputs

A weight/reps value typed but not completed is not considered a completed set.

V1 hard requirement:

```text
completed sets never lost
```

Draft-field restoration is optional.

---

# 82. App Startup Online

Recommended startup:

```text
Open SQLite
↓
Restore cached auth
↓
Resolve current user
↓
Restore active local workout immediately
↓
Render usable UI
↓
Attempt push sync
↓
Pull cloud updates
```

Do not block active workout restoration on cloud.

---

# 83. App Startup Offline

If cached authenticated session/user context is usable:

```text
open SQLite
↓
render local app
↓
show offline state
```

---

# 84. Startup Offline Without Usable Session

If no identity can be safely resolved:

```text
You're offline.

Connect to the internet to sign in.
```

This is acceptable.

---

# 85. Push Before Pull

When synchronization becomes possible:

```text
PUSH UNSYNCED LOCAL MUTATIONS FIRST
```

then:

```text
PULL CLOUD UPDATES
```

This reduces risk that older cloud state overwrites newer local work.

---

# 86. Pull Categories

Cloud pull may refresh:

```text
system exercises
user custom exercises
templates
recent exercise history
recommendations
profile/preferences
```

depending on feature implementation.

---

# 87. Pull Must Respect Local Dirty State

If an entity has pending local changes:

```text
do not blindly overwrite it
```

Examples:

- template with pending update
- custom exercise pending update
- recommendation pending status change

---

# 88. Read Cache Replacement

Read caches can generally be replaced when:

- newer cloud data exists
- no unsynced local authored entity depends on the cached row in a conflicting way

Example:

```text
cached_recent_exercise_sessions
```

can be refreshed normally.

---

# 89. Local History Cache

Keep enough recent raw session information to support:

- previous performance
- progression engine
- Coach context while partially offline
- quick history display

Recommended baseline:

```text
3-5 comparable sessions per used exercise
```

More may be retained.

---

# 90. History Cache Incompleteness

If only recent history is cached, the app must not claim:

```text
this is definitely your all-time PR
```

unless enough local data exists to know that.

Long-term cloud data remains authoritative once synchronized.

---

# 91. Recommendation Pull

Cloud recommendation may update local recommendation state only if:

```text
no newer protected local recommendation state exists
```

An active workout's snapshotted target must never change because a newer recommendation was pulled mid-session.

---

# 92. Template Pull

Cloud template changes may update local template records only if no conflicting unsynced local template mutation exists.

---

# 93. System Exercise Pull

Safe to refresh cached system exercise metadata.

Do not allow normal user state to mutate system exercise definitions.

---

# 94. Multi-Device Scope

V1 is designed primarily for:

```text
one actively used device per user
```

The schema remains compatible with future multi-device use, but sophisticated distributed conflict resolution is intentionally out of scope.

---

# 95. V1 Conflict Definition

A potential conflict exists when:

```text
same logical entity
changed locally
and
changed remotely
after last known synchronized version
```

V1 does not attempt arbitrary field-level merging.

---

# 96. V1 Conflict Priorities

Use:

```text
1. preserve unsynced raw data
2. protect active workout
3. avoid silent destructive overwrite
4. regenerate derived state where possible
```

---

# 97. Active Workout Conflict

If another device somehow creates or modifies overlapping active-workout state:

```text
do not merge sets automatically
```

Preserve local active session.

Flag/log the conflict for future handling.

V1 may present a controlled warning if detected.

---

# 98. Historical Raw Conflict

If the same historical set is changed on two devices:

V1 should not silently discard either interpretation based solely on device clock.

Recommended behavior:

- preserve current local dirty state
- do not overwrite automatically
- log conflict
- defer sophisticated resolution

This scenario is rare under the one-active-device assumption.

---

# 99. Template Conflict

If local template has unsynced changes and cloud has newer version:

```text
do not overwrite local dirty template
```

V1 may retain local state until the user successfully pushes or future conflict UX is implemented.

---

# 100. Recommendation Conflict

Recommendations are derived.

If conflicting recommendation states cannot be reconciled safely:

```text
recalculate from canonical raw history
```

is preferred over preserving inconsistent derived state.

---

# 101. PR Conflict

Persistent PR state is derived.

Resolve by recalculation from canonical raw history.

Do not design a merge algorithm for PR rows.

---

# 102. Device Clock Rule

Do not use:

```text
device updated_at
```

as the sole conflict-resolution authority.

Device clocks may be wrong.

Cloud metadata should use server-generated timestamps.

---

# 103. Domain Event Timestamps

The following may legitimately originate from device time:

```text
workout.started_at
workout.completed_at
set.completed_at
```

because they must function offline.

These are domain event times, not server synchronization version metadata.

---

# 104. Server Version Metadata

Local synchronized authoritative tables may store:

```text
server_updated_at
```

from the last known cloud version.

This is useful for:

- debugging
- incremental pulls
- basic dirty-state comparison

It does not imply full conflict resolution exists.

---

# 105. Incremental Pull Metadata

The application may track:

```text
last_successful_sync_at
last_exercise_sync_at
last_history_sync_at
```

where useful.

Prefer server-trusted timestamps when determining cloud change windows.

---

# 106. Sync Batch Behavior

The engine may batch compatible writes.

Examples:

```text
multiple sets
multiple template exercises
```

Correctness takes priority over request count.

---

# 107. Partial Batch Failure

Never assume an entire batch succeeded unless guaranteed.

If result indicates partial failure:

- mark confirmed rows successful
- leave failed rows queued
- preserve dependencies
- retry later

---

# 108. Queue Removal Rule

Only remove a queue item after confirmed remote success.

Do not remove when:

```text
request started
network reported online
```

---

# 109. Sync Status After Success

After confirmed upsert:

```text
sync_status = synced
```

Store returned:

```text
server_updated_at
```

where available.

Then remove queue item.

---

# 110. Delete Confirmation

After remote delete succeeds:

```text
remove local tombstone
remove queue item
```

---

# 111. New Mutation During Sync

User logging must not be blocked by synchronization.

If a new set is completed while queue processing runs:

```text
new queue item
```

appears normally.

Current pass may finish, then another pass can process new work.

---

# 112. Raw Data Sync Priority

During active workout, prioritize:

```text
workout
workout_exercise
set
```

over less critical derived recommendation updates if resource ordering matters.

---

# 113. Battery Principle

Do not keep device awake to force constant synchronization.

Reliability comes from local durability.

Cloud consistency can be opportunistic.

---

# 114. Background Sync Requirement

V1 does **not** require guaranteed iOS background synchronization while fully suspended.

Required:

```text
sync while app is active
```

and:

```text
retry after foreground/reconnect
```

---

# 115. Why Guaranteed Background Sync Is Unnecessary

Example:

```text
finish workout offline
↓
close app
```

Data remains in SQLite.

Later:

```text
reopen app online
↓
sync
```

No data is lost.

---

# 116. Offline Indicator

During offline operation, show subtle global status:

```text
Offline · Saved on device
```

Avoid:

- blocking modal
- repeated alerts
- per-set cloud status

---

# 117. Connectivity Restoration

When internet returns:

```text
network online
↓
sync trigger
↓
queue processes
```

If successful:

```text
offline indicator disappears
```

Optional temporary:

```text
Synced
```

feedback is acceptable.

---

# 118. Persistent Failure UX

After repeated failures:

```text
Some data hasn't synced yet.

Your workout is safely saved on this device.

[Retry]
```

Do not expose raw HTTP/database errors.

---

# 119. Per-Set Sync UI

Do not show:

```text
Set 1 cloud synced
Set 2 pending
Set 3 retrying
```

during normal workouts.

This adds unnecessary cognitive load.

Use one global status.

---

# 120. Workout Summary Sync Status

If completed offline:

Primary:

```text
Workout Complete
```

Secondary:

```text
Saved on this device · Will sync when online
```

---

# 121. Manual Retry

Provide Retry for persistent failure.

Potential locations:

- sync banner
- Profile/Settings
- workout summary

User should never have to understand queue internals.

---

# 122. AI Offline Behavior

AI features fail immediately when clearly offline.

Do not queue AI requests.

Example:

```text
Coach requires an internet connection.
```

---

# 123. Why AI Requests Are Not Queued

A question such as:

```text
What should I do for my next set?
```

may be meaningless ten minutes later.

Offline AI requests should simply fall back to deterministic/manual features.

---

# 124. AI With Pending Unsynced Sets

If network exists but today's latest sets have not reached cloud:

```text
mobile sends validated local current-session context
```

to the Edge Function.

The server may combine it with cloud history.

---

# 125. AI Context Precedence

For the active workout:

```text
validated local current-session context
```

may be newer than cloud.

Prompts/context builders must distinguish:

```text
current local session
```

from:

```text
historical cloud context
```

---

# 126. Natural-Language Quick Log Offline

Unavailable in V1.

Fallback:

```text
Quick Log needs an internet connection.

You can still enter the set manually.
```

---

# 127. Recommendation Explanation Offline

Deterministic reason-code explanation remains available.

AI-enhanced explanation may require internet.

---

# 128. Sync Engine Interface

Conceptual:

```ts
interface SyncEngine {
  syncPending(): Promise<SyncResult>;

  pullUpdates(): Promise<void>;

  getStatus(): Promise<SyncStatus>;
}
```

---

# 129. Sync Queue Repository Interface

Conceptual:

```ts
interface SyncQueueRepository {
  enqueueOrCoalesce(item: SyncQueueItem): Promise<void>;

  getPending(): Promise<SyncQueueItem[]>;

  markAttempt(id: string, error?: string): Promise<void>;

  remove(id: string): Promise<void>;
}
```

---

# 130. Remote Sync Adapter

Conceptual:

```ts
interface RemoteSyncAdapter {
  upsertTemplate(...): Promise<void>;

  upsertTemplateExercise(...): Promise<void>;

  upsertCustomExercise(...): Promise<void>;

  upsertWorkout(...): Promise<void>;

  upsertWorkoutExercise(...): Promise<void>;

  upsertSet(...): Promise<void>;

  deleteSet(...): Promise<void>;

  upsertProgressionRecommendation(...): Promise<void>;
}
```

Actual implementation may split by repository/domain.

---

# 131. Server Metadata Write Rule

Remote adapters must not blindly transmit local:

```text
created_at
updated_at
server_updated_at
```

as cloud-authoritative metadata.

Cloud metadata is server controlled.

Domain event fields remain explicit.

---

# 132. Push Payload Mapping

Example:

```text
local_sets
↓
mapper
↓
sets
```

Do not send arbitrary SQLite rows directly.

Use typed domain/cloud mappers.

---

# 133. Pull Mapping

Example:

```text
Supabase workout_template row
↓
domain mapper
↓
local template persistence
```

while respecting local dirty state.

---

# 134. Feature Ownership

Sync code belongs under:

```text
src/features/sync/
```

Suggested structure:

```text
src/features/sync/
├── engine/
│   ├── SyncEngine.ts
│   ├── dependencyGraph.ts
│   ├── syncMutex.ts
│   └── retryPolicy.ts
│
├── repositories/
│   └── SyncQueueRepository.ts
│
├── adapters/
│   └── RemoteSyncAdapter.ts
│
├── services/
│   ├── pushSync.ts
│   └── pullSync.ts
│
├── hooks/
│   ├── useSyncStatus.ts
│   └── useNetworkSync.ts
│
└── types/
```

---

# 135. No Sync Logic in Screens

Screens must not contain:

```ts
if (online) {
  await supabase.from('sets').upsert(...)
}
```

Screens call application use cases.

Persistence/sync layers handle the rest.

---

# 136. Network Abstraction

Conceptual:

```ts
interface NetworkStatusService {
  isOnline(): boolean;

  subscribe(callback: (online: boolean) => void): () => void;
}
```

This supports deterministic testing.

---

# 137. Debug Sync Screen

Development builds should expose a hidden diagnostics screen.

Useful fields:

```text
network state
current user
active workout ID
pending queue count
failed items
last successful sync
SQLite schema version
```

---

# 138. Development Sync Controls

Development-only:

```text
Force Sync
Simulate Offline
View Queue
Clear Failed Attempt Metadata
```

Do not expose destructive queue-manipulation tools in production.

---

# 139. Offline Simulation

Testing should support simulated:

```text
offline
timeout
5xx
auth expiration
partial failure
```

without depending entirely on real dead zones.

---

# 140. Required Test: Complete Set Offline

1. Start workout.
2. Disable network.
3. Complete set.
4. Close app.
5. Reopen.
6. Verify set exists.
7. Restore network.
8. Sync.
9. Verify cloud row exists once.
10. Verify queue clears.

---

# 141. Required Test: Entire Workout Offline

1. Have local template.
2. Disconnect.
3. Start workout.
4. Log all sets.
5. Finish workout.
6. Generate recommendation.
7. View summary.
8. Close app.
9. Reopen.
10. Verify completed workout/recommendation.
11. Reconnect.
12. Verify cloud synchronization.

---

# 142. Required Test: Offline Template Creation

1. Disconnect.
2. Create template.
3. Add exercises.
4. Save.
5. Close app.
6. Reopen.
7. Verify template exists.
8. Reconnect.
9. Verify template and child rows sync.

---

# 143. Required Test: Offline Custom Exercise

1. Disconnect.
2. Create custom exercise.
3. Add to template.
4. Start workout.
5. Use exercise.
6. Reconnect.
7. Verify custom exercise syncs before dependent rows.
8. Verify all references preserve original UUID.

---

# 144. Required Test: Recommendation Offline

1. Finish workout offline.
2. Generate recommendation locally.
3. Close app.
4. Reopen.
5. Verify recommendation still visible.
6. Reconnect.
7. Verify recommendation syncs.
8. Verify same UUID.
9. Verify full reason codes and engine version preserved.

---

# 145. Required Test: Retry Duplication

Simulate:

```text
server commits
client receives timeout
```

Retry.

Expected:

```text
exactly one cloud row
```

---

# 146. Required Test: Edit Before Sync

Example:

```text
185 × 7
```

edit to:

```text
185 × 8
```

before sync.

Cloud must ultimately contain only latest intended state.

---

# 147. Required Test: Unsynced Create/Delete

Create local set.

Delete before cloud receives it.

Expected:

```text
no cloud row
no unnecessary remote DELETE
```

---

# 148. Required Test: Synced Delete

1. Create/sync set.
2. Go offline.
3. Delete.
4. Verify local hidden/tombstone.
5. Reconnect.
6. Verify remote deletion.
7. Verify tombstone removal.

---

# 149. Required Test: App Killed During Workout

1. Start workout.
2. Complete sets.
3. Force-close app.
4. Reopen.
5. Resume.
6. Verify sets.
7. Verify elapsed timer.

---

# 150. Required Test: Authentication Expiration

1. Start workout.
2. Expire auth.
3. Disable remote access.
4. Log sets.
5. Finish.
6. Reauthenticate.
7. Sync.
8. Verify no duplicates/loss.

---

# 151. Required Test: Network Flapping

Simulate:

```text
online
offline
online
offline
online
```

while making mutations.

Expected:

- no lost data
- no duplicates
- no parallel queue corruption
- eventual convergence

---

# 152. Required Test: Dependency Ordering

Queue intentionally contains:

```text
set
workout_exercise
workout
```

in wrong order.

Engine must still process:

```text
workout
↓
workout_exercise
↓
set
```

---

# 153. Required Test: Custom Exercise Dependency

Queue contains:

```text
template exercise referencing custom exercise
custom exercise
template
```

in arbitrary order.

Expected:

```text
custom exercise
↓
template
↓
template exercise
```

---

# 154. Required Test: Partial Sync

Example:

```text
workout succeeds
workout exercise 1 succeeds
workout exercise 2 fails
```

Dependent sets should not sync until their parent succeeds.

Successful entities should not be resent unnecessarily beyond idempotent retry needs.

---

# 155. Required Test: Active Local Protection

1. Active local workout has newer sets.
2. Cloud pull contains older version.
3. Pull executes.
4. Verify local active workout unchanged.

---

# 156. Required Test: Dirty Template Pull

1. Local template modified offline.
2. Cloud has another version.
3. Pull occurs.
4. Verify dirty local template is not silently overwritten.

---

# 157. Required Test: PR Recalculation

1. Finish workout offline.
2. Detect PR event.
3. Sync raw history.
4. Recalculate persistent PR state.
5. Verify correct cloud PR row.
6. Verify no `personal_record` queue entity exists.

---

# 158. Sync Observability

Development logs should capture:

```text
sync_started
sync_completed
sync_failed
entity_type
entity_id
operation
attempt_count
duration
```

Do not log sensitive payloads unnecessarily.

---

# 159. Future Production Metrics

Potential metrics:

```text
sync success rate
pending queue size
average pending duration
offline workout count
failed sync rate
retry rate
```

Not required for initial personal V1.

---

# 160. Data Loss Principle

When choosing between:

```text
duplicate risk
```

and:

```text
data loss risk
```

prefer preserving data.

Use UUID/idempotency to eliminate duplicate risk afterward.

Never solve sync complexity by silently discarding user workout records.

---

# 161. No Retry-Based Data Deletion

Never delete unsynced data because:

```text
retry count exceeded
record is old
sync has failed for days
```

Keep it until:

- sync succeeds
- user explicitly discards it
- a future recovery flow safely resolves it

---

# 162. Local Cache Cleanup

Safe-to-prune cache:

```text
old cached_recent_exercise_sessions
```

provided progression/history requirements remain satisfied.

Do not prune:

```text
active workout
pending sync rows
dirty template
dirty custom exercise
pending recommendation
records referenced by pending entities
```

---

# 163. Local Database Size

Workout data is small.

Prefer retaining useful local data rather than aggressive cleanup.

Storage optimization is not a V1 priority.

---

# 164. SQLite Migration Safety

Local migrations must preserve:

```text
active workouts
completed unsynced sets
templates
custom exercises
recommendations
sync queue
```

Never implement:

```text
migration failed
→ delete DB and recreate
```

for production use.

---

# 165. Cloud Migration Compatibility

Once public builds exist, cloud changes should be additive first.

Typical:

```text
add field
↓
deploy compatible backend
↓
deploy compatible mobile app
↓
remove obsolete field later
```

---

# 166. Sync Feature Flag

Development may support:

```text
SYNC_ENABLED=false
```

for testing pure local behavior.

Core local persistence must still work.

Production should not depend on a remote feature flag for critical workout durability.

---

# 167. Recommended Sync Implementation Stages

## Stage 1

Local-only workout and templates.

---

## Stage 2

Sync queue infrastructure.

---

## Stage 3

One-way raw push:

```text
local → Supabase
```

---

## Stage 4

Retry/idempotency/dependencies.

---

## Stage 5

Template/custom exercise synchronization.

---

## Stage 6

Recommendation synchronization.

---

## Stage 7

Cloud pull and read-cache refresh.

---

## Stage 8

Conflict hardening.

Do not build full bidirectional sync in one task.

---

# 168. Pre-Gym Offline Proof

Before using havAI during a real workout:

1. Create a template.
2. Start a workout.
3. Log several sets.
4. Disable Wi-Fi/cellular.
5. Log more sets.
6. Edit one.
7. Force-close app.
8. Reopen.
9. Resume.
10. Finish offline.
11. Verify recommendation.
12. Reconnect.
13. Sync.
14. Confirm every cloud row appears exactly once.

If this fails, havAI is not ready to replace another tracker.

---

# 169. User-Facing Sync Philosophy

The app should communicate:

```text
Your data is safe.
```

not:

```text
Here is our distributed-systems implementation.
```

Users should rarely have to think about sync.

---

# 170. V1 Offline/Sync Definition of Done

Offline and synchronization behavior is complete when:

- templates can be created offline
- templates can be edited offline
- templates survive app restart
- custom exercises can be created offline
- custom exercises can be used before synchronization
- active workouts are fully stored in SQLite
- set logging never waits for Supabase
- completed sets survive app termination
- active workouts survive phone/app restart
- workout completion works offline
- progression recommendations generate offline when data permits
- recommendations persist locally with full fidelity
- recommendations sync later with the same UUID
- persistent PR state is derived rather than queue-synchronized
- sync queue survives restart
- creates synchronize later
- edits synchronize later
- deletes synchronize later
- queue operations coalesce
- retries are bounded
- retries are idempotent
- dependency ordering is explicit
- custom exercises sync before dependent rows
- network reconnect triggers sync
- app foreground triggers sync
- parallel sync loops are prevented
- auth expiration never destroys workout state
- local active workout cannot be overwritten by stale cloud pull
- dirty templates cannot be silently overwritten
- raw data receives priority over derived state
- multi-device field-level conflict resolution is explicitly out of V1 scope
- persistent sync errors are non-destructive
- logout cannot casually orphan unsynced data
- full offline gym flow has been physically tested

---

# 171. Final Offline Architecture

```text
                         HAVAI MOBILE
                              │
                              ▼
                     APPLICATION USE CASES
                              │
                              ▼
                         LOCAL SQLITE
              ┌───────────────┼──────────────────┐
              │               │                  │
              ▼               ▼                  ▼
        LOCAL WORKOUTS   LOCAL TEMPLATES   LOCAL RECOMMENDATIONS
              │               │                  │
              └───────────────┼──────────────────┘
                              │
                              ▼
                          SYNC QUEUE
                              │
                              ▼
                         SYNC ENGINE
                              │
                    ┌─────────┴─────────┐
                    │                   │
                 OFFLINE             ONLINE
                    │                   │
                    ▼                   ▼
              KEEP LOCALLY          SUPABASE
                                        │
                                        ▼
                              CANONICAL CLOUD COPY
```

---

# 172. Final Synchronization Principle

For every mutation ask:

> If the user loses internet and kills the app immediately after this succeeds, where does the authoritative record live?

For havAI V1, the answer must always be explicit.

For workout-critical actions:

```text
SQLite
```

must contain the answer before the UI declares success.

Cloud synchronization is the durability and multi-device layer.

It must never become a prerequisite for safely finishing a workout.
