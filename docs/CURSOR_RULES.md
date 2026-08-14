# havAI V1 Cursor Rules and Implementation Instructions

## 1. Purpose

This document defines how Cursor should behave inside the havAI repository.

Cursor must treat the approved specification documents as implementation requirements.

Its job is to implement havAI accurately without:

- redesigning the product
- inventing missing architecture
- adding unrelated features
- changing locked technology decisions
- bypassing persistence or security boundaries
- scattering business logic across UI code
- replacing deterministic progression with AI
- creating sync behavior that risks workout data

The priorities are:

```text
correctness
data durability
consistency
testability
maintainability
scope control
```

---

# 2. Cursor's Role

Cursor is an implementation assistant.

Cursor is not the product owner.

Cursor is not authorized to independently change:

```text
product scope
core architecture
database strategy
sync semantics
progression semantics
AI responsibilities
security model
canonical units
```

If implementation reveals that an approved specification must change, Cursor should identify the conflict and stop that task.

---

# 3. Specification Source of Truth

Before implementing meaningful work, consult the applicable documents under:

```text
/docs
```

Canonical documents:

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
CURSOR_RULES.md
MASTER_TASK_LIST.md
```

---

# 4. Document Authority

These documents define different aspects of the product.

## Product Behavior

```text
PRD.md
USER_FLOWS.md
```

## UX and Visual Behavior

```text
DESIGN_SPEC.md
```

## System Architecture

```text
ARCHITECTURE.md
```

## Persistence

```text
DATABASE.md
```

## Progression Behavior

```text
PROGRESSION_ENGINE.md
```

## AI Behavior

```text
AI_SYSTEM.md
```

## Offline and Sync

```text
OFFLINE_SYNC.md
```

## Cross-Layer Contracts

```text
API_CONTRACTS.md
```

## Testing

```text
TESTING.md
```

## Environments and Deployment

```text
DEPLOYMENT.md
```

## Implementation Sequencing

```text
MASTER_TASK_LIST.md
```

---

# 5. Specification Conflict Rule

If two approved specifications appear to conflict:

```text
STOP
```

Do not:

- guess
- merge the two approaches
- choose whichever is easier
- silently change one interpretation
- create a third architecture

Instead report:

```text
documents involved
sections involved
exact conflict
implementation impact
recommended decision if useful
```

Wait for the specification to be deliberately reconciled before implementing the conflicting behavior.

---

# 6. Task Scope Rule

Cursor should normally implement:

```text
one numbered task
```

from:

```text
MASTER_TASK_LIST.md
```

at a time.

If asked to implement Task 11.2:

```text
implement Task 11.2
```

Do not automatically continue into:

```text
11.3
11.4
Phase 12
```

---

# 7. Before Starting a Task

Before coding:

1. read `CURSOR_RULES.md`
2. read the task in `MASTER_TASK_LIST.md`
3. read applicable specifications
4. inspect existing repository code
5. identify dependencies
6. identify contracts involved
7. identify tests required
8. identify migration impact
9. provide a concise implementation plan

Then implement.

---

# 8. Cursor Implementation Plan

For a normal task, the plan should contain:

```text
files likely to create/change
existing code to reuse
domain/contracts involved
persistence impact
tests to add/update
verification commands
```

Do not write a long architecture essay unless the task actually requires one.

---

# 9. Existing Code First Rule

Before creating:

```text
component
hook
repository
service
type
utility
mapper
schema
```

search the repository for an existing implementation.

Avoid duplicate abstractions.

---

# 10. No Surprise Refactors

When implementing one task:

Do not broadly refactor unrelated modules because:

```text
the new structure would be cleaner
```

Only change unrelated code when required for correctness.

If a broader refactor is genuinely needed:

```text
report it
scope it separately
```

---

# 11. No Mega-Task Rule

If a requested task is materially larger than the task definition implies:

```text
STOP
```

and explain how it should be split.

Do not solve excessive scope by modifying half the repository in one pass.

---

# 12. Product Scope Rule

Do not add features outside approved V1.

Do not independently implement:

```text
nutrition tracking
calorie tracking
bodyweight tracking system
Apple Health
Apple Watch
social features
leaderboards
subscriptions
payments
trainer marketplace
camera form analysis
automatic full-program generation
push notification coaching
web dashboard
advanced multi-device conflict resolution
machine-learning progression
```

Even if they seem useful.

---

# 13. V1 AI Scope

V1 AI features are:

```text
Coach
Recommendation Explanation
Natural-Language Quick Log
```

Natural-Language Quick Log is part of V1.

Do not defer it unless the specifications are changed.

---

# 14. Approved Technology Stack

Use:

```text
React Native
Expo
TypeScript
Expo Router

Expo SQLite

Supabase PostgreSQL
Supabase Auth
Supabase RLS
Supabase Edge Functions

OpenAI
```

Do not replace these without explicit approval.

---

# 15. No Custom Backend Rule

Do not create:

```text
Express
NestJS
Fastify
custom Node API server
EC2 API
ECS API
```

for V1.

Ordinary authenticated cloud CRUD uses:

```text
Supabase client
+
RLS
```

Server-only privileged logic uses:

```text
Supabase Edge Functions
```

---

# 16. No Architecture Replacement

Do not independently substitute:

```text
Firebase
MongoDB
Prisma
GraphQL
Realm
WatermelonDB
Redux
MobX
```

for approved architecture choices.

A library may only be added for a concrete implementation need.

---

# 17. Dependency Rule

Before installing a dependency, answer:

```text
What exact problem does it solve?

Can React Native, Expo, TypeScript, or an existing dependency already solve it?

Is it supported by the current Expo SDK?

Is it actively maintained?

Is it needed now?
```

Do not install speculative dependencies.

---

# 18. Package Version Rule

When adding packages:

- use versions compatible with the current Expo SDK
- prefer official Expo install commands when applicable
- do not guess versions
- do not upgrade unrelated packages
- do not perform broad dependency modernization during feature work

---

# 19. TypeScript Rule

Use TypeScript throughout application code.

Avoid:

```ts
any;
```

unless crossing a genuinely untyped external boundary.

If `any` is unavoidable:

```text
isolate it
validate immediately
convert to typed data
```

---

# 20. Strict Types

Use explicit domain types for important concepts:

```text
Exercise
WorkoutTemplate
Workout
WorkoutExercise
WorkoutSet
ProgressionRecommendation
DetectedPersonalRecord
PersonalRecord
SyncQueueItem
CoachResponseV1
```

Do not move arbitrary JSON objects between application layers.

---

# 21. Shared Contract Rule

Cross-boundary types must follow:

```text
API_CONTRACTS.md
```

Do not create screen-specific API shapes when an approved contract exists.

---

# 22. Runtime Validation Rule

TypeScript does not validate runtime data.

Runtime validate untrusted boundaries such as:

```text
environment variables
AI requests
AI responses
external API data
parsed database JSON fields
user-facing complex form payloads where appropriate
```

---

# 23. Naming Conventions

TypeScript:

```text
PascalCase
```

for:

```text
components
types
classes
```

Use:

```text
camelCase
```

for:

```text
functions
variables
object properties
```

Database:

```text
snake_case
```

---

# 24. File Naming

Use descriptive filenames.

Good:

```text
calculateProgression.ts
estimatedOneRepMax.ts
WorkoutTemplateCard.tsx
SyncEngine.ts
LocalWorkoutRepository.ts
```

Avoid vague dumping grounds such as:

```text
utils.ts
helpers.ts
misc.ts
stuff.ts
commonStuff.ts
```

unless the file genuinely contains one cohesive shared concern.

---

# 25. Feature-Oriented Structure

Prefer:

```text
src/features/workouts/
src/features/templates/
src/features/exercises/
src/features/progression/
src/features/sync/
src/features/coach/
```

Avoid giant generic folders containing unrelated business logic.

---

# 26. Route Files Must Be Thin

Expo Router route files should primarily compose screens.

Good:

```tsx
export default function ActiveWorkoutRoute() {
  return <ActiveWorkoutScreen />;
}
```

Do not place:

```text
database queries
sync logic
progression rules
large forms
AI calls
```

directly inside route files.

---

# 27. Presentation Layer Rule

UI may:

- render state
- collect input
- invoke hooks/use cases
- display validation
- display loading
- display errors
- navigate

UI must not:

- execute raw SQL
- directly call OpenAI
- implement progression rules
- manage sync queues
- implement RLS assumptions
- manipulate raw Supabase tables from feature screens

---

# 28. Application Use Case Rule

User actions should map to clear use cases.

Examples:

```text
startWorkout()
completeSet()
editSet()
deleteSet()
finishWorkout()

createTemplate()
editTemplate()
archiveTemplate()

createCustomExercise()

askCoach()

syncPendingChanges()
```

Screens call these use cases rather than coordinating persistence manually.

---

# 29. Domain Purity Rule

Core business logic should be pure TypeScript where practical.

Especially:

```text
progression engine
e1RM
PR detection
trend analysis
weight conversion
validation
metrics
```

These modules must not depend on:

```text
React
Expo Router
SQLite
Supabase
OpenAI
navigation
```

---

# 30. Canonical Weight Rule

This is locked:

```text
ALL INTERNAL AND STORED LOAD VALUES USE KILOGRAMS
```

Domain field naming should make this explicit.

Use:

```text
weightKg
recommendedWeightKg
estimated1RMKg
```

Avoid ambiguous:

```text
weight
```

at important boundaries.

---

# 31. Display Unit Rule

User preference may be:

```text
lb
kg
```

Display preference affects:

```text
input conversion
rendering
formatting
```

It does not rewrite historical stored data.

---

# 32. Weight Conversion Rule

Use one canonical conversion implementation.

Do not duplicate:

```text
lb ↔ kg
```

logic throughout components.

---

# 33. Floating-Point Weight Rule

Do not depend on exact floating-point equality after lb/kg conversion.

Use:

```text
normalized practical increments
or
appropriate tolerance
```

where comparing weights.

---

# 34. Timestamp Rule

Distinguish:

## Domain Event Time

```text
startedAt
completedAt
set.completedAt
recommendation.consumedAt
```

These may originate on-device.

## Cloud Persistence Metadata

```text
created_at
updated_at
```

These are server-controlled.

Do not mix the two concepts.

---

# 35. Cloud Metadata Rule

Normal remote upserts must not send local:

```text
createdAt
updatedAt
serverUpdatedAt
```

as authoritative PostgreSQL metadata.

Use PostgreSQL defaults/triggers.

---

# 36. Position Rule

Ordered records use:

```text
0-based position
```

for:

```text
template exercises
workout exercises
sets
```

UI may display 1-based labels.

---

# 37. Active Workout Authority Rule

During an active workout:

```text
SQLite
```

is the durable source of truth.

Do not make active workout correctness depend solely on:

```text
React state
TanStack Query
Supabase cache
```

---

# 38. Local-First Mutation Rule

Critical workout mutations follow:

```text
validate
↓
SQLite transaction
↓
local entity write
↓
sync queue mutation
↓
commit
↓
UI success
```

Cloud occurs afterward.

---

# 39. Local Success Rule

A workout mutation is successful only after durable local persistence succeeds.

Example:

```text
Complete Set
```

must not visually complete before SQLite transaction success.

---

# 40. Cloud Failure Rule

Cloud failure after local success does not invalidate the workout action.

Expected:

```text
data stays complete locally
sync remains pending
user keeps training
```

---

# 41. Local Failure Rule

If SQLite persistence fails:

```text
do not show successful completion
```

Return a typed storage failure.

---

# 42. Local Database Categories

Respect the distinction defined in `DATABASE.md`.

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

## Read Cache

```text
cached_recent_exercise_sessions
```

## Infrastructure

```text
sync_queue
local_schema_metadata
```

Do not mix these roles.

---

# 43. Template Persistence Rule

Templates are authoritative local data, not merely a cloud cache.

Users must be able to:

```text
create
edit
archive
start
```

templates offline.

Do not replace:

```text
local_workout_templates
```

with a query-cache-only approach.

---

# 44. Custom Exercise Persistence Rule

User-created exercises may be created offline.

They must receive:

```text
client-generated UUID
```

and may be immediately referenced by templates/workouts.

Do not require cloud creation before use.

---

# 45. Recommendation Persistence Rule

Recommendations generated offline must be stored in:

```text
local_progression_recommendations
```

with full fidelity.

Do not use a reduced cache that cannot later reconstruct the cloud recommendation.

---

# 46. Personal Record Sync Rule

Do not add:

```text
personal_record
```

to the V1 sync queue.

Persistent PR state derives from raw workout history.

Flow:

```text
raw workout sync
↓
recalculate PR state
↓
persist current PR state
```

---

# 47. PR Type Rule

Detected PR types:

```text
max_weight
estimated_1rm
rep_pr
```

Persisted current PR types:

```text
max_weight
estimated_1rm
```

Do not persist one PR row for every rep-at-weight record.

---

# 48. Raw Data Priority Rule

Protect raw history first:

```text
workouts
workout_exercises
sets
```

Derived data may be regenerated:

```text
recommendations
PR state
metrics
trend
```

---

# 49. Historical Integrity Rule

Changing:

```text
template
profile preference
recommendation
```

must not rewrite completed workout facts.

Historical raw data changes only through explicit historical edit/delete actions.

---

# 50. Template Snapshot Rule

Starting a workout snapshots relevant template state.

An active or historical workout must not dynamically resolve its structure from the current template.

---

# 51. Recommendation Snapshot Rule

Starting a workout may snapshot:

```text
recommended weight
rep target
sourceRecommendationId
```

into the workout exercise.

Later recommendation changes must not rewrite that active session.

---

# 52. User Override Rule

Recommendations are advisory.

If recommendation says:

```text
190 lb
```

and user logs:

```text
185 lb
```

store the user's actual set normally.

Do not block.

Do not nag.

---

# 53. SQLite Access Rule

Use repositories/data-access abstractions.

Do not place raw:

```sql
SELECT
INSERT
UPDATE
DELETE
```

inside screens.

---

# 54. Supabase Access Rule

Do not place:

```ts
supabase.from(...)
```

directly inside UI screens/components.

Use repository/service boundaries.

---

# 55. Mapper Rule

Raw persistence shapes are not domain models.

Use explicit mappers:

```text
SQLite Row
↓
Domain Object
```

```text
Supabase Row
↓
Domain Object
```

```text
Domain Object
↓
Cloud Write Payload
```

---

# 56. Null Mapping Rule

Persistence may use:

```text
null
```

Domain optional fields generally use:

```text
undefined
```

Map consistently.

Do not randomly mix:

```text
null
undefined
""
```

for the same semantic state.

---

# 57. Boolean Mapping Rule

SQLite may use:

```text
0 / 1
```

Domain uses:

```text
false / true
```

Mapper owns conversion.

---

# 58. Migration Rule

All cloud schema changes require:

```text
supabase/migrations/
```

All SQLite schema changes require:

```text
src/db/migrations/
```

Do not make manual-only schema changes.

---

# 59. Migration Immutability Rule

Once a migration is shared/applied:

```text
do not rewrite it casually
```

Create a new migration.

---

# 60. Local Migration Safety Rule

Local migrations must preserve:

```text
active workouts
completed unsynced sets
local templates
custom exercises
recommendations
sync queue
```

Never use:

```text
migration failed
→ delete SQLite DB
```

as a production migration strategy.

---

# 61. Seed Rule

System exercises belong in deterministic seed data.

Use:

```text
stable UUIDs
```

across environments.

Do not manually create required system exercises through the Supabase dashboard as the only source.

---

# 62. Authentication Rule

Use Supabase Auth.

Do not implement:

```text
custom password hashing
custom session tokens
custom user table authentication
```

---

# 63. Ensure Profile Rule

Every authenticated user must resolve to one havAI profile.

Implement an idempotent:

```text
ensureProfile()
```

flow.

Do not assume signup automatically guarantees a complete profile row unless implemented explicitly.

---

# 64. RLS Rule

All private cloud tables require RLS.

Never rely only on:

```text
client filters
hidden UI
user_id passed by client
```

for security.

---

# 65. Parent Ownership Security Rule

For child tables, RLS/database logic must verify parent ownership.

Examples:

```text
workout_template_exercise
→ owned template

workout_exercise
→ owned workout

set
→ owned workout + owned workout exercise
```

---

# 66. Cross-User Reference Rule

The database must reject:

```text
User A child row
→ User B parent UUID
```

even when:

```text
child.user_id = User A
```

Cursor must not treat direct child `user_id` checks as sufficient.

---

# 67. Exercise Access Security

Child records referencing exercises must ensure the exercise is either:

```text
system
or
owned by authenticated user
```

---

# 68. Recommendation Ownership Security

If a workout exercise references:

```text
sourceRecommendationId
```

the recommendation must belong to the same authenticated user.

---

# 69. Service Role Rule

Never expose:

```text
Supabase service-role key
```

to the mobile app.

---

# 70. Public Environment Rule

Anything under:

```text
EXPO_PUBLIC_
```

is public client configuration.

Never put privileged credentials there.

---

# 71. AI Boundary Rule

OpenAI may only be accessed through:

```text
Supabase Edge Functions
```

Never call OpenAI directly from React Native.

---

# 72. AI Responsibility Rule

AI may:

```text
explain
interpret
converse
parse natural language
```

AI does not own:

```text
canonical progression
PR detection
e1RM
database truth
sync
authentication
unit conversion
```

---

# 73. AI Mutation Rule

AI endpoints must not directly mutate workout history.

Quick Log flow:

```text
AI parses
↓
runtime validation
↓
user preview
↓
user confirmation
↓
normal completeSet()
```

Never:

```text
AI
↓
INSERT sets
```

---

# 74. AI Structured Output Rule

Machine-consumed AI responses require:

```text
structured output
+
runtime validation
```

Do not parse critical fields from arbitrary prose using fragile regex.

---

# 75. AI Failure Rule

AI failure must never block:

```text
logging a set
finishing workout
viewing history
seeing deterministic recommendation
manual logging
sync
```

---

# 76. AI Provider Rule

Support server-side:

```text
Mock AI Provider
OpenAI Provider
```

UI development and automated tests should not require paid API calls.

---

# 77. AI Model Rule

Model names belong in centralized server configuration.

Do not hardcode model names in multiple Edge Functions.

---

# 78. AI Prompt Version Rule

Prompts must preserve explicit versions.

Example:

```text
coach-v1
explanation-v1
parser-v1
```

---

# 79. AI Context Rule

Do not send the user's entire lifetime history to AI.

Build minimal relevant context.

---

# 80. AI Current Session Rule

Current local workout sets may be newer than cloud.

Coach requests may include:

```text
validated current local session context
```

Server combines that with trusted historical context.

---

# 81. Progression Engine Authority Rule

The deterministic engine is authoritative for structured next-session targets.

Do not move progression decisions into:

```text
AI prompts
screens
database triggers
```

---

# 82. Progression Entry Point

Conceptually:

```ts
calculateProgression(
  input: ProgressionInput
): ProgressionResult
```

should remain pure and deterministic.

---

# 83. Progression Recommendation Semantics

These meanings are locked.

## `increase_weight`

Load increases.

## `increase_reps`

Same load, higher explicit rep objective.

## `repeat_target`

Repeat substantially the same intended load and rep target.

## `maintain_weight`

Same general load, but no precise higher rep target is justified.

## `decrease_weight`

Load decreases.

## `insufficient_data`

No meaningful progression recommendation can be produced.

Do not reinterpret these elsewhere.

---

# 84. Mixed Load Rule

For irregular mixed working loads, default progression type is generally:

```text
maintain_weight
```

with lower confidence, unless an explicitly implemented dominant-load rule qualifies the session.

Do not arbitrarily choose between:

```text
increase_reps
repeat_target
maintain_weight
```

---

# 85. REP_RANGE_MAXED Rule

If retained in `PROGRESSION_ENGINE.md`, the official reason code:

```text
REP_RANGE_MAXED
```

must exist in contracts and implementation.

Use consistently for bodyweight/reps-only range-max scenarios.

---

# 86. Progression Reason Code Rule

Every meaningful recommendation should include reason codes.

Reason codes must:

```text
match observed evidence
match the recommendation
remain deterministically ordered
```

---

# 87. No Hidden Progression Heuristics

Every progression rule must live in progression source/config and be tested.

Do not add one-off logic inside:

```text
screen
hook
repository
AI prompt
```

---

# 88. Progression Threshold Rule

Numeric thresholds belong in centralized config.

Examples:

```text
trend minimum sessions
plateau threshold
RPE high threshold
max load jump percentage
meaningful e1RM change
aggressive progression threshold
```

Do not scatter magic numbers.

---

# 89. e1RM Rule

Use one canonical Epley implementation.

Do not duplicate formulas across:

```text
summary
progress screen
PR detection
progression
AI context
```

---

# 90. RPE Rule

RPE remains optional.

No core progression workflow may require RPE.

---

# 91. Warm-Up Rule

Warm-up sets remain stored in history.

They are excluded from normal working-set progression calculations.

---

# 92. Extra Set Rule

Extra user-created working sets belong to the actual workout.

They do not automatically modify:

```text
template.targetSets
```

---

# 93. State Management Rule

Use appropriate state categories.

## Server State

Remote/cached data.

## Persistent Local State

SQLite.

## Ephemeral UI State

React state or a small scoped store.

Do not create a giant global app store by default.

---

# 94. Global Store Rule

Do not introduce Redux or another large global-state framework without a concrete approved reason.

Do not create one global object holding:

```text
auth
workouts
templates
progress
AI
sync
navigation
forms
```

---

# 95. Query Cache Rule

If TanStack Query or similar is used:

- use it for server state
- centralize query keys
- invalidate intentionally
- do not treat it as the active workout database

---

# 96. Form Rule

Use form/schema tooling for sufficiently complex forms if justified.

Good candidates:

```text
signup
login
template editor
custom exercise
profile settings
```

Do not overengineer simple set entry.

---

# 97. Set Logging UX Rule

Optimize for:

```text
unlock
enter reps
complete set
lock
```

in a few seconds.

Do not add extra confirmation screens to normal set completion.

---

# 98. Design Token Rule

All reusable visual primitives must use centralized design tokens.

Do not repeatedly hardcode:

```text
#FF4F1F
#111315
random spacing numbers
```

through feature screens.

---

# 99. Core Palette Rule

Use the approved palette from `DESIGN_SPEC.md`.

Core:

```text
Background Primary
#111315

Surface
#191C1F

Elevated
#22262A

Border
#30353A

Blood Orange
#FF4F1F

Primary Text
#F5F6F7
```

---

# 100. Blood Orange Rule

Use blood orange for:

```text
primary actions
active states
important targets
progress emphasis
```

Do not use it for:

```text
destructive actions
errors
every card
every icon
```

---

# 101. Destructive Styling Rule

Delete/discard actions use semantic destructive styling.

Do not visually confuse:

```text
Delete Workout
```

with the normal primary CTA.

---

# 102. Touch Target Rule

Interactive controls must be comfortably usable on a phone.

Workout-critical controls should be thumb-friendly.

Do not shrink them merely to fit more information.

---

# 103. One Primary Action Rule

Each important screen should have one obvious primary action.

Examples:

```text
Home
→ Start Workout

Exercise
→ Complete Set

Template Editor
→ Save Workout

Summary
→ Done
```

---

# 104. Progressive Disclosure Rule

Keep secondary detail behind actions such as:

```text
Why?
View History
Details
```

Primary workout screens should remain uncluttered.

---

# 105. Empty State Rule

Every meaningful empty state should explain the next action.

Bad:

```text
No workouts.
```

Good:

```text
No workouts yet.

Create your first workout to start tracking progression.

[Create Workout]
```

---

# 106. Error UX Rule

Errors should answer:

```text
What happened?

Is my data safe?

What should I do?
```

---

# 107. No Raw Error Rule

Never expose:

```text
Postgres errors
stack traces
Supabase internals
OpenAI raw provider errors
HTTP internals
```

directly to users.

---

# 108. Typed Error Rule

Use typed application errors such as:

```text
ValidationError
StorageError
NetworkError
AuthenticationError
AuthorizationError
SyncError
AIServiceError
NotFoundError
```

UI should not parse human-readable error strings to determine behavior.

---

# 109. Logger Rule

Use centralized logging.

Prefer:

```ts
logger.debug();
logger.info();
logger.warn();
logger.error();
```

Do not leave uncontrolled production `console.log()` calls.

---

# 110. Secret Logging Rule

Never log:

```text
passwords
auth tokens
API keys
database password
service-role key
OpenAI key
```

Avoid unnecessary raw private prompts.

---

# 111. Sync Isolation Rule

Sync behavior belongs under:

```text
src/features/sync/
```

or the approved equivalent.

Do not scatter:

```ts
if (online) {
  await supabase...
}
```

through screens.

---

# 112. Sync Queue Rule

Every locally authored cloud-backed mutation must have a defined sync strategy.

Queue entities:

```text
workout_template
workout_template_exercise
custom_exercise
workout
workout_exercise
set
progression_recommendation
```

No `personal_record`.

---

# 113. Queue Coalescing Rule

If an entity changes repeatedly before sync:

```text
create
edit
edit
```

prefer one latest:

```text
UPSERT
```

---

# 114. Unsynced Create/Delete Rule

If an entity was never synchronized and is deleted:

```text
remove local record
remove pending upsert
no remote delete
```

---

# 115. Synced Delete Rule

If the remote record exists:

```text
local tombstone/hide
queue delete
remove tombstone after confirmed remote success
```

---

# 116. Sync Idempotency Rule

Retrying a sync mutation must not create duplicate records.

All synchronizable entities should use stable client-generated UUIDs.

---

# 117. Sync Dependency Rule

Do not process queue items solely by creation order.

Explicit dependencies include:

```text
custom exercise
→ template exercise / workout exercise

template
→ template exercise

workout
→ workout exercise
→ set

source workout / workout exercise
→ recommendation
```

---

# 118. Sync Mutex Rule

Only one sync processor runs at a time.

Triggers such as:

```text
network reconnect
foreground
local mutation
manual retry
```

must not create concurrent processors.

---

# 119. Push Before Pull Rule

When sync becomes available:

```text
push local dirty mutations
```

before:

```text
pull cloud changes
```

---

# 120. Active Workout Pull Protection

Cloud pull must never overwrite active local:

```text
set data
exercise order
targets
recommendation snapshot
notes
```

---

# 121. Dirty Local Entity Protection

If a local authoritative record has pending changes:

```text
do not blindly replace it with cloud state
```

This especially applies to:

```text
templates
custom exercises
recommendations
```

---

# 122. V1 Conflict Scope Rule

Full multi-device field-level conflict resolution is out of scope.

Do not implement:

```text
CRDT
complex merge engine
last-write-wins based solely on device clock
```

unless specifications change.

---

# 123. Conflict Priority Rule

If conflict occurs:

```text
1. preserve unsynced raw data
2. protect active workout
3. avoid silent destructive overwrite
4. regenerate derived state where possible
```

---

# 124. Device Clock Rule

Do not use local:

```text
updatedAt
```

as sole conflict authority.

Device clocks are not trustworthy enough for that.

---

# 125. Network State Rule

Network state is advisory.

```text
online
```

means:

```text
worth attempting a remote request
```

not:

```text
remote request guaranteed to succeed
```

---

# 126. Background Rule

Do not rely on guaranteed mobile background execution for correctness.

Correctness comes from:

```text
durable SQLite state
```

and retry on:

```text
foreground
reconnect
later app use
```

---

# 127. Logout Safety Rule

Before logout, check unsynced authoritative local data.

If pending:

Offer:

```text
Cancel
Try Sync
```

Do not silently abandon it.

---

# 128. Auth Expiration Rule

If authentication expires during a workout:

```text
continue locally
```

Do not block:

```text
set logging
workout completion
local recommendation generation
```

Sync resumes after reauthentication.

---

# 129. Offline Classification Rule

For every feature, define whether it:

```text
must work offline
may work from cache
requires internet
```

Do not leave this undefined.

---

# 130. Must Work Offline

Core V1:

```text
template create/edit/archive
custom exercise creation
active workout
set logging
set editing
set deletion
workout completion
metrics
deterministic progression
local recommendation persistence
```

---

# 131. Cache-Capable Offline

Examples:

```text
exercise library
previous performance
recent history
progress
```

depending on locally available cache.

---

# 132. Requires Internet

V1:

```text
new authentication
cloud synchronization
older uncached history
AI Coach
AI explanation
Natural-Language Quick Log
```

---

# 133. Testing Rule

Every nontrivial feature should include appropriate tests during implementation.

Do not postpone all testing until the end.

---

# 134. Test Priority Rule

Prioritize:

```text
progression correctness
SQLite durability
sync
RLS
active recovery
AI contract validation
```

over cosmetic snapshot tests.

---

# 135. Bug Regression Rule

When fixing a serious bug:

```text
reproduce with a test where practical
then fix
```

Especially:

```text
data loss
duplicate sets
incorrect progression
RLS exposure
recovery failures
sync duplication
```

---

# 136. Progression Test Rule

Every new progression behavior must test:

```text
input
recommendation type
weight/rep target
reason codes
confidence
```

---

# 137. Golden Progression Rule

Do not modify progression behavior without updating/reviewing the relevant golden sequence tests.

---

# 138. Sync Test Rule

Sync changes must consider:

```text
offline create
offline edit
offline delete
restart
retry
duplicate request
partial failure
network flapping
dependency ordering
mutex
```

---

# 139. RLS Test Rule

Any new private table requires:

```text
RLS policy
cross-user tests
```

Child tables must include parent-reference attack tests.

---

# 140. AI Test Rule

AI integration changes must test:

```text
valid output
invalid output
timeout
provider error
ownership
hallucination resistance
canonical recommendation consistency
```

---

# 141. Mock External Services Rule

Unit tests should mock:

```text
OpenAI
remote network calls
```

Use real local logic and real SQLite where integration value is high.

---

# 142. No Production Test Target Rule

Automated tests must never default to production infrastructure.

---

# 143. Accessibility Rule

Core reusable components must support:

```text
accessibility labels
appropriate roles
logical ordering
usable touch targets
non-color-only status
```

Do not postpone everything until public launch.

---

# 144. Performance Rule

Critical path:

```text
Complete Set
```

must not wait on:

```text
Supabase
OpenAI
analytics
```

If new code adds remote latency to this path:

```text
reconsider the design
```

---

# 145. Startup Rule

Startup should prioritize:

```text
SQLite
auth/session state
active workout restoration
local Home data
```

Cloud refresh follows.

---

# 146. AI Cost Rule

Do not invoke AI automatically for:

```text
logging
sync
metrics
PR detection
progression
workout completion
history loading
```

AI should run only for explicit AI functionality.

---

# 147. No Premature Optimization

Do not add:

```text
Redis
queue servers
microservices
custom workers
complex caching infrastructure
```

for hypothetical scale.

---

# 148. No Premature Generalization

Do not build elaborate frameworks for imagined future needs.

Example:

Do not create a 12-strategy progression plugin architecture when V1 has one engine plus bounded modifiers.

---

# 149. Reasonable Abstraction Rule

Abstract when:

```text
behavior repeats
a boundary needs isolation
testing improves
multiple implementations actually exist
```

Do not abstract simply to increase layer count.

---

# 150. Component Reuse Rule

Before creating a new component, search for existing:

```text
PrimaryButton
Card
SetInputRow
ExerciseRow
BottomSheet
```

Do not create multiple near-identical variants without semantic need.

---

# 151. Design System Extension Rule

If a new reusable visual pattern is necessary:

1. define the semantic component/variant
2. use tokens
3. reuse consistently
4. update design documentation if materially new

---

# 152. Comment Rule

Use comments for:

```text
non-obvious business rules
sync conflict decisions
algorithm rationale
external platform workarounds
```

Do not comment obvious syntax.

---

# 153. Documentation Rule

When implementation deliberately changes:

```text
architecture
contract
schema
sync behavior
progression behavior
```

update the relevant `/docs` file.

Do not allow code and approved documentation to silently drift.

---

# 154. ADR Rule

Material architecture changes require an ADR under:

```text
docs/adr/
```

Examples:

```text
replace persistence framework
introduce new backend service
change conflict strategy
introduce global state framework
change canonical unit
```

---

# 155. Do Not Reverse ADRs Silently

If an existing ADR needs to change:

```text
write a superseding ADR
```

with rationale.

---

# 156. Contract-First Rule

Before implementing a boundary-changing feature:

```text
identify contract
↓
update contract/schema if required
↓
add/update tests
↓
implement
```

Do not let API shapes emerge accidentally from UI code.

---

# 157. Migration-First Rule

If a feature requires cloud schema change:

```text
migration
↓
regenerate Supabase types
↓
update contracts/mappers
↓
repository
↓
feature
```

Do not code against nonexistent columns.

---

# 158. Local Migration Rule

If SQLite changes:

```text
create versioned migration
```

Do not require app reinstall as the normal upgrade strategy.

---

# 159. Generated File Rule

Do not manually edit generated files unless the generator explicitly expects it.

Especially:

```text
Supabase-generated database types
```

---

# 160. Duplicate Tap Rule

Mutations such as:

```text
Complete Set
Finish Workout
Save Template
Create Custom Exercise
```

must protect against accidental duplicate submission.

Use idempotency/disabled state where appropriate.

---

# 161. Destructive Confirmation Rule

Require clear confirmation for:

```text
discard active workout
delete historical workout
delete completed set
archive custom exercise
archive/delete template
```

Avoid excessive confirmations for ordinary safe edits.

---

# 162. Keyboard Rule

Workout numeric entry should use appropriate mobile keyboard/input behavior.

Do not let the keyboard make:

```text
Complete Set
```

inaccessible.

---

# 163. Insufficient Data Rule

When data is insufficient:

```text
say insufficient data
```

Do not invent precision.

Applies to:

```text
progression
progress analytics
AI
```

---

# 164. Local Cache Truth Rule

Do not claim all-time facts from a partial local history cache unless separate persisted state proves them.

Example:

If only five sessions are cached:

```text
do not infer lifetime best automatically
```

---

# 165. Pagination Rule

Lists that grow indefinitely should use incremental loading.

Examples:

```text
workout history
exercise history
```

---

# 166. Query Scope Rule

Routine screens should not load the user's entire lifetime workout history.

Use focused queries.

---

# 167. Historical Edit Rule

Historical raw-data edits trigger recalculation of affected:

```text
PR state
metrics
recommendations
```

Do not recalculate unrelated exercises unnecessarily.

---

# 168. Historical Delete Rule

Historical workout deletion removes dependent raw data and recalculates affected derived state.

Do not preserve stale PR/recommendation conclusions.

---

# 169. Recommendation Lifecycle Rule

Recommendations have:

```text
active
consumed
superseded
```

states.

Do not invent extra statuses without updating contracts/schema.

---

# 170. Recommendation Linkage Rule

When a workout consumes a recommendation:

```text
workoutExercise.sourceRecommendationId
```

must be preserved.

This is important for future outcome analysis.

---

# 171. Recommendation Version Rule

Persist:

```text
engineVersion
```

for every recommendation.

Do not retroactively rewrite old engine versions.

---

# 172. AI Prompt Version Rule

Preserve:

```text
promptVersion
```

where defined in AI responses/evaluation data.

---

# 173. Natural-Language Logging Rule

Quick Log is a parser UX, not a shortcut around data architecture.

Flow always returns to normal local mutation logic.

---

# 174. Debug Screen Rule

Development diagnostics are encouraged.

Useful fields:

```text
app environment
app version
SQLite schema version
current user ID
active workout ID
pending sync count
last sync
network state
AI provider
progression engine version
```

---

# 175. Debug Action Rule

Development-only actions may include:

```text
Force Sync
Simulate Offline
View Queue
Mock AI
View Progression Debug
```

Do not expose raw destructive DB operations to normal users.

---

# 176. README Rule

README must contain only current, actionable setup instructions.

Remove stale Expo starter boilerplate.

---

# 177. Final Locked Architecture Summary

Treat these as locked unless explicitly changed:

```text
React Native + Expo
Expo Router
TypeScript

Supabase PostgreSQL
Supabase Auth
RLS
Supabase Edge Functions

Expo SQLite

local-first workout logging

authoritative local templates

authoritative locally created custom exercises

authoritative local recommendations before sync

client-generated UUIDs

kg canonical storage

server-controlled cloud created_at / updated_at

deterministic progression engine

personal records derived from raw history

no personal_record sync queue entity

OpenAI server-side only

Natural-Language Quick Log with confirmation

single repository

migration-driven schema

no custom V1 backend

no advanced V1 multi-device conflict resolution
```

---

# 178. Implementation Priority Rule

When tradeoffs arise, optimize in this order:

```text
1. prevent workout data loss

2. preserve raw historical correctness

3. correct progression behavior

4. workout logging speed

5. offline reliability

6. security

7. maintainability

8. AI usefulness

9. visual polish

10. speculative future extensibility
```

---

# 179. Data Safety Test

Before considering a workout mutation finished, ask:

> If the app is killed immediately after this reports success, is the user's data still safe?

For a completed set:

```text
the answer must be yes
```

---

# 180. Architecture Test

Before adding infrastructure, ask:

> What current V1 problem does this solve?

If the answer is:

```text
we might need it later
```

do not add it.

---

# 181. AI Test

Before using AI for a task, ask:

> Can deterministic code do this more reliably, cheaply, and consistently?

If yes:

```text
use deterministic code
```

---

# 182. UX Test

Before finalizing workout interaction, ask:

> Can this be used quickly with one hand between sets?

If not:

```text
simplify it
```

---

# 183. Sync Test

Before adding sync behavior, ask:

> What happens if the server commits but the client never receives the response?

The design must remain idempotent.

---

# 184. Security Test

Before exposing a new child-table write, ask:

> Can User A reference User B's parent ID and still pass this policy?

If yes:

```text
the policy is incomplete
```

---

# 185. Cursor Verification Rule

Before declaring a task complete, run relevant:

```text
typecheck
lint
tests
```

and any task-specific checks.

If a command cannot be run:

```text
state that clearly
```

Do not claim success without verification.

---

# 186. Build Error Rule

Do not suppress TypeScript errors simply to make builds pass.

Avoid:

```ts
// @ts-ignore
```

unless there is a documented unavoidable reason.

Fix the underlying issue.

---

# 187. Lint Rule

Do not disable lint rules globally to avoid fixing one implementation.

Use narrowly scoped exceptions only when justified.

---

# 188. Test Failure Rule

Do not delete/weaken a failing test merely because new code broke it.

First determine whether:

```text
implementation is wrong
or
approved behavior changed
```

If behavior intentionally changes:

```text
update specification
+
test
+
implementation
```

together.

---

# 189. Production Safety Rule

Never run destructive production commands without explicit intent.

Scripts/config should make production targeting obvious.

---

# 190. Development Code Rule

Development-only behavior must be clearly gated.

Examples:

```text
simulate offline
clear development cache
view sync queue
mock AI
```

must not accidentally become normal production controls.

---

# 191. No Fake Production Data

Do not seed production with:

```text
fake workouts
fake users
random test templates
```

Only deterministic system data such as system exercises belongs in production seeds.

---

# 192. Cursor Completion Rule

After implementing a task, Cursor must report:

```text
what changed
files changed
tests added/updated
verification commands/results
known limitations
spec conflicts
```

Do not simply say:

```text
Done.
```

---

# 193. Cursor Completion Format

Use:

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

# 194. Cursor Stop Conditions

Cursor should stop the current task when:

```text
acceptance criteria pass
```

or when blocked by:

```text
specification conflict
missing required dependency
unsafe migration uncertainty
material architecture ambiguity
```

Do not continue into unrelated work to compensate for a blocker.

---

# 195. Final Cursor Rule

Cursor's job is not to redesign havAI.

Cursor's job is to implement the approved product accurately.

The implementation sequence is:

```text
SPECIFICATION
      ↓
CONTRACT
      ↓
TEST
      ↓
IMPLEMENTATION
      ↓
VERIFICATION
```

Not:

```text
IMPLEMENT SOMETHING
      ↓
CHANGE THE ARCHITECTURE TO FIT IT
```

For every critical workout action, preserve this hierarchy:

```text
USER INTENT
   ↓
VALIDATED DOMAIN ACTION
   ↓
DURABLE LOCAL WRITE
   ↓
UI SUCCESS
   ↓
SYNC LATER
```

havAI should remain useful when the network disappears and when AI disappears.

If an implementation compromises that principle for convenience, it is the wrong implementation.
