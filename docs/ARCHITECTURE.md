# havAI V1 Technical Architecture Specification

## 1. Purpose

This document defines the technical architecture for havAI V1.

It describes:

- application structure
- technology choices
- system boundaries
- mobile architecture
- local persistence
- cloud persistence
- synchronization
- authentication
- progression logic
- AI integration
- data flow
- error handling
- deployment boundaries
- testing boundaries
- future scalability considerations

The architecture should make havAI:

```text
reliable
offline-capable
simple to operate
cheap to develop
easy to test
easy to evolve
```

without introducing infrastructure that V1 does not need.

---

# 2. Architecture Goals

havAI V1 must prioritize:

```text
1. workout data durability
2. fast gym interactions
3. offline usability
4. deterministic progression
5. secure cloud storage
6. clear system boundaries
7. low infrastructure cost
8. future extensibility
```

The architecture should remain understandable by one developer working in Cursor.

---

# 3. Non-Goals

V1 is not designed around:

```text
microservices
Kubernetes
custom backend servers
event streaming platforms
Redis
GraphQL
complex CQRS
machine-learning progression models
real-time collaborative editing
advanced multi-device conflict resolution
```

These may be introduced later only if a concrete product requirement demands them.

---

# 4. Approved Technology Stack

havAI V1 uses:

## Mobile

```text
React Native
Expo
TypeScript
Expo Router
```

---

## Local Persistence

```text
Expo SQLite
```

---

## Cloud Backend

```text
Supabase
```

including:

```text
PostgreSQL
Authentication
Row Level Security
Edge Functions
```

---

## AI

```text
OpenAI
```

accessed only through:

```text
Supabase Edge Functions
```

---

## Source Control / CI

```text
GitHub
GitHub Actions
```

---

# 5. High-Level System Architecture

```text
┌──────────────────────────────────────────┐
│              HAVAI MOBILE                │
│                                          │
│ React Native + Expo + TypeScript         │
│                                          │
│ ┌─────────────┐                          │
│ │     UI      │                          │
│ └──────┬──────┘                          │
│        │                                 │
│        ▼                                 │
│ ┌──────────────────┐                     │
│ │ Application Layer│                     │
│ └──────┬───────────┘                     │
│        │                                 │
│ ┌──────┴──────────────┐                  │
│ │                     │                  │
│ ▼                     ▼                  │
│ Domain Logic       Repositories          │
│ │                     │                  │
│ │               ┌─────┴─────┐            │
│ │               │           │            │
│ ▼               ▼           ▼            │
│ Progression   SQLite      Supabase        │
│ Engine          │            ▲            │
│                 │            │            │
│                 └── Sync ────┘            │
└──────────────────────────────┬───────────┘
                               │
                               ▼
                     ┌──────────────────┐
                     │ Supabase Backend │
                     │                  │
                     │ PostgreSQL       │
                     │ Auth             │
                     │ RLS              │
                     │ Edge Functions   │
                     └────────┬─────────┘
                              │
                              ▼
                          ┌────────┐
                          │ OpenAI │
                          └────────┘
```

---

# 6. Core Architectural Principle

havAI is:

```text
LOCAL-FIRST FOR WORKOUT-CRITICAL DATA
```

The user should not lose a set because:

```text
Supabase is unavailable
the gym has poor reception
authentication refresh fails
the phone changes networks
```

A completed user action must have a durable local record before the UI declares success.

---

# 7. Primary Mutation Flow

Workout-critical mutation:

```text
USER ACTION
    ↓
APPLICATION USE CASE
    ↓
VALIDATION
    ↓
SQLITE TRANSACTION
    ↓
LOCAL ENTITY + SYNC QUEUE
    ↓
TRANSACTION COMMIT
    ↓
UI SUCCESS
    ↓
BACKGROUND/OPPORTUNISTIC SYNC
    ↓
SUPABASE
```

Cloud availability is not part of the success condition for normal workout logging.

---

# 8. Architecture Layers

havAI should use clear layers:

```text
Presentation
Application
Domain
Persistence
Infrastructure
```

---

# 9. Presentation Layer

Contains:

```text
screens
components
route files
forms
UI hooks
navigation
display formatting
```

Responsibilities:

- display state
- collect input
- invoke application use cases
- display errors
- display loading states
- navigate

It must not own:

```text
SQL
Supabase CRUD
sync processing
progression rules
OpenAI calls
RLS logic
```

---

# 10. Application Layer

The application layer coordinates user actions.

Examples:

```text
startWorkout()
completeSet()
editSet()
deleteSet()
finishWorkout()

createTemplate()
editTemplate()

createCustomExercise()

askCoach()

syncPendingChanges()
```

Responsibilities:

- orchestrate domain logic
- coordinate repositories
- control transactions
- trigger sync queue updates
- convert errors into application-level meaning

---

# 11. Domain Layer

Contains pure business concepts and logic.

Examples:

```text
Workout
WorkoutSet
WorkoutTemplate
Exercise
ProgressionRecommendation

progression engine
metrics
PR detection
trend analysis
validation
weight conversion
```

Domain logic should not depend on:

```text
React
SQLite
Supabase
OpenAI
navigation
Expo Router
```

where possible.

---

# 12. Persistence Layer

Contains repositories and data mappers.

Responsibilities:

```text
read/write SQLite
read/write Supabase
map persistence rows to domain objects
map domain objects to persistence payloads
```

UI must not access persistence implementations directly.

---

# 13. Infrastructure Layer

Contains integrations such as:

```text
Supabase client
network status
sync engine
AI API client
logger
environment configuration
```

Infrastructure details should not leak unnecessarily into domain logic.

---

# 14. Feature-Oriented Code Organization

Recommended:

```text
src/
├── app/
├── components/
├── theme/
├── shared/
├── db/
├── lib/
└── features/
```

Feature structure:

```text
src/features/
├── auth/
├── onboarding/
├── exercises/
├── templates/
├── workouts/
├── progression/
├── recommendations/
├── history/
├── progress/
├── sync/
├── coach/
└── profile/
```

---

# 15. Recommended Feature Structure

Example:

```text
src/features/workouts/
├── components/
├── hooks/
├── screens/
├── services/
├── repositories/
├── domain/
├── types/
└── __tests__/
```

Not every feature needs every folder.

Avoid empty architecture for architecture's sake.

---

# 16. Expo Router Structure

Conceptually:

```text
src/app/
├── _layout.tsx
├── index.tsx
│
├── (auth)/
│   ├── _layout.tsx
│   ├── welcome.tsx
│   ├── login.tsx
│   └── signup.tsx
│
├── (onboarding)/
│   ├── _layout.tsx
│   └── setup.tsx
│
├── (tabs)/
│   ├── _layout.tsx
│   ├── home.tsx
│   ├── workouts.tsx
│   ├── progress.tsx
│   ├── coach.tsx
│   └── profile.tsx
│
├── workout/
├── template/
└── exercise/
```

Route files should remain thin.

---

# 17. Main Navigation

Authenticated V1 tabs:

```text
Home
Workouts
Progress
Coach
Profile
```

---

# 18. Root Routing State

At startup:

```text
NO SESSION
→ Auth

SESSION + ONBOARDING INCOMPLETE
→ Onboarding

SESSION + ONBOARDING COMPLETE
→ Main Tabs
```

Active workout restoration occurs independently from remote cloud loading.

---

# 19. State Categories

havAI uses three main categories of state.

## Persistent Local State

SQLite.

Examples:

```text
active workout
sets
local templates
custom exercises
user exercise preferences (favorites, persistent notes, rest overrides)
recommendations
sync queue
```

---

## Server State

Cloud-backed data.

Examples:

```text
profile
cloud history
system exercise updates
synchronized templates
older history
```

May use query caching.

---

## Ephemeral UI State

Examples:

```text
open sheet
form field
selected filter
temporary Coach input
```

Use React state or lightweight local stores.

---

# 20. No Giant Global Store

Do not put:

```text
auth
workouts
templates
sync
progress
Coach
forms
navigation
```

into one global Redux-like state container.

Use the storage model appropriate to each type of state.

---

# 21. Active Workout Authority

An active workout must live in:

```text
SQLite
```

not solely in:

```text
React state
query cache
Supabase
```

React may hold a view/model of the workout, but SQLite is the durable authority.

---

# 22. Local Database Responsibilities

SQLite stores authoritative local data for:

```text
workout templates
template exercises

custom exercises

workouts
workout exercises
sets

progression recommendations

sync queue
```

It also stores read caches for recent history.

---

# 23. Local Authoritative Tables

Defined in `DATABASE.md`:

```text
local_workout_templates
local_workout_template_exercises

local_exercises
local_user_exercise_preferences

local_workouts
local_workout_exercises
local_sets

local_progression_recommendations
```

These may contain data that has never reached Supabase.

---

# 24. Read Cache Tables

Example:

```text
cached_recent_exercise_sessions
```

Read caches are replaceable.

They must not be confused with unsynced authoritative user data.

---

# 25. Why Templates Are Local-First

The user must be able to:

```text
create template offline
edit template offline
start workout offline
```

Therefore templates are locally authoritative, not cloud-only records cached for display.

---

# 26. Why Custom Exercises Are Local-First

A custom exercise may be created offline and immediately referenced by:

```text
template
workout
set history
```

Its final UUID is generated locally.

That UUID later becomes the cloud UUID.

---

# 27. Why Recommendations Are Stored Locally

A workout may finish offline.

The progression engine may immediately generate a recommendation.

Therefore:

```text
local_progression_recommendations
```

must preserve the full recommendation until synchronization succeeds.

---

# 28. Personal Record Architecture

Persistent PR state is derived.

Cloud may store current:

```text
max_weight
estimated_1rm
```

records.

But:

```text
personal_record
```

is not an offline sync-queue entity.

Flow:

```text
RAW SET HISTORY
    ↓
SYNC
    ↓
RECALCULATE PR STATE
```

Rep-at-weight PRs remain derived events.

---

# 29. Cloud Responsibilities

Supabase provides:

```text
authentication
canonical synchronized user data
long-term workout history
templates
exercise library
recommendations
persistent PR state
RLS
server-side AI functions
```

---

# 30. Supabase Client Usage

The React Native app may use the authenticated Supabase client directly for appropriate cloud CRUD.

Do not wrap every ordinary table operation in an Edge Function.

---

# 31. Edge Function Usage

Use Edge Functions when logic must remain server-side.

V1 examples:

```text
Coach
Explain Recommendation
Parse Workout
```

Reasons:

```text
OpenAI key security
server-trusted context
resource authorization
request validation
```

---

# 32. No Custom API Server

V1 does not use:

```text
Express
NestJS
Fastify
EC2 backend
ECS backend
custom REST server
```

Architecture:

```text
Mobile
↓
Supabase
↓
Edge Functions where necessary
```

---

# 33. Authentication Architecture

Use:

```text
Supabase Auth
```

Do not create custom authentication.

---

# 34. Profile Architecture

After authentication:

```text
Supabase Auth User
        ↓
profiles
```

Each authenticated user must have one havAI profile.

Application should provide an idempotent:

```text
ensureProfile()
```

use case.

---

# 35. Profile Creation Flow

```text
Authenticated Session
      ↓
Fetch profiles row
      ↓
Exists?
   /      \
 YES      NO
  │        │
  │        ▼
  │    Create Default Profile
  │        │
  └────────┘
      ↓
Resolve Onboarding State
```

---

# 36. Security Architecture

Cloud security is based on:

```text
Supabase Auth
+
RLS
+
parent ownership validation
```

Client filtering is not a security mechanism.

---

# 37. Child Ownership Rule

For child records such as:

```text
workout_template_exercises
workout_exercises
sets
```

security must verify both:

```text
child.user_id = authenticated user
```

and:

```text
referenced parent belongs to authenticated user
```

---

# 38. Example Threat

The system must reject:

```text
User A set
with
User A user_id

but
User B workout_id
```

even if User A knows User B's UUID.

---

# 39. Database Truth Hierarchy

Cloud database data separates into:

```text
RAW HISTORY
RECOMMENDATIONS
PERSISTENT PR STATE
```

Raw history is strongest.

If derived state becomes inconsistent:

```text
recalculate derived state
```

rather than rewriting raw history.

---

# 40. Sync Architecture

Synchronization is asynchronous relative to workout actions.

```text
LOCAL MUTATION
    ↓
SYNC QUEUE
    ↓
SYNC ENGINE
    ↓
REMOTE ADAPTER
    ↓
SUPABASE
```

---

# 41. Sync Queue Entities

V1:

```text
workout_template
workout_template_exercise
custom_exercise
user_exercise_preference
workout
workout_exercise
set
progression_recommendation
```

Not:

```text
personal_record
system_exercise
read cache
```

---

# 42. Sync Operations

Use:

```text
upsert
delete
```

rather than replaying every historical local mutation.

---

# 43. Queue Coalescing

Example:

```text
set create
set edit
set edit
```

becomes:

```text
one latest UPSERT
```

before sync.

---

# 44. Idempotency

Synchronizable entities use client-generated UUIDs.

Retrying the same upsert must not create duplicates.

---

# 45. Sync Dependencies

Explicit dependency graph.

Template path:

```text
custom exercise
      ↓
template
      ↓
template exercise
```

Workout path:

```text
exercise
   ↓
workout
   ↓
workout exercise
   ↓
set
```

Recommendation path:

```text
source workout
   ↓
source workout exercise
   ↓
recommendation
```

---

# 46. Sync Engine Lock

Only one queue processor runs at once.

Possible triggers:

```text
local mutation
network reconnect
app foreground
manual retry
```

must not start competing processors.

---

# 47. Push Before Pull

When connectivity returns:

```text
PUSH LOCAL DIRTY DATA
```

before:

```text
PULL CLOUD CHANGES
```

This protects newer local work from older cloud state.

---

# 48. Active Workout Pull Protection

Cloud pull must never overwrite active local:

```text
exercise order
targets
completed sets
notes
recommendation snapshot
```

---

# 49. Dirty Local Entity Protection

If a local template or custom exercise has unsynced changes:

```text
do not blindly replace with cloud row
```

Conflict handling must protect unsynced user data.

---

# 50. Multi-Device Scope

V1 is optimized for:

```text
one actively used device
```

The schema supports future multi-device evolution.

But V1 does not implement:

```text
field-level merging
CRDTs
automatic simultaneous edit reconciliation
```

---

# 51. Multi-Device Conflict Rule

If a conflict is detected:

```text
preserve unsynced raw local data
protect active workout
avoid silent overwrite
recalculate derived state where possible
```

Do not pretend V1 provides perfect distributed conflict resolution.

---

# 52. Server Timestamp Architecture

Cloud:

```text
created_at
updated_at
```

are server-controlled.

Local copies may store:

```text
server_updated_at
```

for:

- debugging
- incremental pull
- basic version awareness

---

# 53. Device Timestamp Architecture

Domain events may originate from device:

```text
workout.started_at
workout.completed_at
set.completed_at
recommendation.consumed_at
```

These represent actual workout/application events.

They are different from sync metadata.

---

# 54. Canonical Weight Architecture

This decision is locked.

```text
ALL INTERNAL/STORED LOAD VALUES = KILOGRAMS
```

Example:

```text
185 lb
```

is stored internally as approximately:

```text
83.9146 kg
```

---

# 55. Display Unit Architecture

User preference:

```text
lb
kg
```

affects:

```text
rendering
input conversion
formatting
```

It does not rewrite stored workout history.

---

# 56. Weight Conversion Boundary

Flow:

```text
USER ENTERS 185 lb
      ↓
UI / INPUT MAPPER
      ↓
lbToKg()
      ↓
DOMAIN
83.9146 kg
      ↓
SQLITE / SUPABASE
```

Display reverses this process.

---

# 57. No Ambiguous Weight Fields

Avoid domain/infrastructure fields named:

```text
weight
```

where unit is unclear.

Prefer:

```text
weightKg
recommendedWeightKg
estimated1RMKg
```

---

# 58. Progression Engine Architecture

The progression engine is a pure deterministic module.

```text
CURRENT SESSION
+
RECENT HISTORY
+
TARGET
+
USER PREFERENCES
+
EXERCISE CONFIG
       ↓
calculateProgression()
       ↓
ProgressionResult
```

---

# 59. Progression Engine Boundary

The engine does not:

```text
save recommendation
generate UUID
mark recommendation active
sync recommendation
call AI
```

Application logic performs those tasks.

---

# 60. Recommendation Lifecycle

```text
ProgressionResult
      ↓
Application Use Case
      ↓
Create ProgressionRecommendation
      ↓
Save SQLite
      ↓
Queue Sync
      ↓
Supabase
```

---

# 61. Recommendation Consumption

At workout start:

```text
active recommendation
      ↓
snapshot target into workout exercise
      ↓
sourceRecommendationId stored
      ↓
recommendation marked consumed
```

This preserves future outcome analysis.

---

# 62. Recommendation Semantics

Locked types:

```text
increase_weight
increase_reps
repeat_target
maintain_weight
decrease_weight
insufficient_data
```

Meanings are defined in `PROGRESSION_ENGINE.md` and `API_CONTRACTS.md`.

Do not redefine these inside UI or AI.

---

# 63. Metrics Architecture

Pure metric modules should calculate:

```text
total reps
working set count
e1RM
session comparisons
RPE summaries
trend metrics
PR detection
```

No duplicated metric formulas across features.

---

# 64. Canonical e1RM

V1:

```text
Epley
```

One implementation only.

Used by:

```text
progression
progress screens
PR detection
summary
AI context
```

---

# 65. PR Detection Boundary

PR detection may identify:

```text
max_weight
estimated_1rm
rep_pr
```

But only:

```text
max_weight
estimated_1rm
```

are persisted as current PR state.

---

# 66. AI Architecture

AI is an enhancement layer.

It is not the source of truth for training data.

AI may:

```text
explain
interpret
answer questions
parse natural language
```

AI may not own:

```text
progression decisions
PR detection
e1RM
set persistence
sync
user authentication
```

---

# 67. AI Flow

```text
MOBILE
   ↓
Typed AI Request
   ↓
Supabase Edge Function
   ↓
Auth Verification
   ↓
Request Validation
   ↓
Server Data Fetch
   ↓
Context Builder
   ↓
OpenAI
   ↓
Structured Response Validation
   ↓
Mobile
```

---

# 68. AI Secret Boundary

The mobile app must never contain:

```text
OPENAI_API_KEY
```

It exists only in server-side environment/secrets.

---

# 69. AI Provider Abstraction

Server-side:

```text
AIProvider
```

supports:

```text
MockProvider
OpenAIProvider
```

This enables free/deterministic development and testing.

---

# 70. AI Model Configuration

Model names belong in server configuration.

Examples:

```text
AI_COACH_MODEL
AI_EXPLANATION_MODEL
AI_PARSER_MODEL
```

Do not hardcode model strings throughout code.

---

# 71. AI Prompt Versioning

Prompts are source-controlled.

Examples:

```text
coach-v1
explanation-v1
parser-v1
```

Material prompt changes should be traceable.

---

# 72. Coach Architecture

Coach receives:

```text
user question
active exercise context
validated local current-session data
server-loaded recent history
profile preferences
current recommendation
bounded relevant user-authored notes
```

Server should build minimal relevant context.

Do not send all lifetime workout data.
The context builder labels persistent exercise notes, workout notes, and set notes as subjective user-authored context. Structured workout facts remain authoritative, and notes never become deterministic progression input.

---

# 73. AI Current Session Context

Unsynced local sets may be newer than cloud.

Therefore mobile may send:

```text
validated current-session context
```

with the Coach request.

The server combines:

```text
current local session
+
historical cloud data
```

---

# 74. AI Explanation Architecture

Client sends:

```text
recommendationId
```

Server resolves:

```text
recommendation
source workout
recent context
```

The client does not submit arbitrary recommendation facts as authoritative.

---

# 75. Natural-Language Logging Architecture

V1 includes Quick Log.

Flow:

```text
USER TEXT
   ↓
Edge Function Parser
   ↓
Structured Candidate Sets
   ↓
Runtime Validation
   ↓
User Confirmation
   ↓
Canonical kg Conversion
   ↓
Normal completeSet()
```

AI never writes workout records directly.

---

# 76. AI Failure Architecture

If OpenAI fails:

```text
workout logging still works
progression still works
history still works
sync still works
```

AI is never a critical-path dependency.

---

# 77. Offline AI Behavior

When offline:

```text
Coach
AI explanation
Quick Log
```

are unavailable.

Fallback:

```text
manual logging
deterministic recommendation
deterministic reason-code explanation
```

---

# 78. Application Error Architecture

Use typed errors.

Examples:

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

---

# 79. Local vs Cloud Failure Semantics

Local persistence failure:

```text
critical
mutation not safely complete
```

Cloud failure:

```text
non-blocking
data safe locally
sync pending
```

These must never be presented identically.

---

# 80. Error Flow

Example set failure:

```text
Complete Set
↓
SQLite failure
↓
StorageError
↓
UI:
"Couldn't safely save this set."
```

Cloud sync failure:

```text
Set already safe locally
↓
SyncError
↓
UI:
"Saved on this device. Sync will retry."
```

---

# 81. Logging Architecture

Use centralized logger.

Example:

```text
logger.debug()
logger.info()
logger.warn()
logger.error()
```

Do not scatter raw:

```text
console.log()
```

through production code.

---

# 82. Logging Privacy

Never log:

```text
passwords
auth tokens
OpenAI keys
service-role keys
database passwords
```

Avoid unnecessary raw private prompt content.

---

# 83. Environment Architecture

Mobile-safe environment:

```text
EXPO_PUBLIC_APP_ENV
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Server-only:

```text
OPENAI_API_KEY
AI provider/model configuration
```

---

# 84. Environment Validation

Application startup validates required public configuration.

Edge Functions validate required server configuration.

Misconfiguration should fail clearly.

---

# 85. Development Environments

Initial V1:

```text
LOCAL DEVELOPMENT
     ↓
DEVELOPMENT SUPABASE
```

One development Supabase project is sufficient initially.

---

# 86. Production Separation

Before real external users:

```text
havAI Development Supabase
havAI Production Supabase
```

must be separate.

---

# 87. No Production Infrastructure Prematurely

Do not introduce separate production infrastructure before needed.

But architecture must not require refactoring when production is introduced.

---

# 88. Testing Architecture

Testing layers:

```text
unit
domain
SQLite integration
repository integration
sync integration
Supabase/RLS integration
component
navigation
AI contract/evals
E2E
manual physical-device
```

---

# 89. Highest-Risk Test Areas

Prioritize:

```text
data loss
active workout recovery
duplicate synchronization
progression errors
cross-user access
AI contradiction of known facts
```

---

# 90. Domain Test Boundary

Pure modules should be easily tested without:

```text
Expo
network
Supabase
OpenAI
```

Examples:

```text
progression
weight conversion
metrics
PR detection
validation
```

---

# 91. SQLite Integration Boundary

Use real temporary/local SQLite for persistence tests where practical.

Test:

```text
transactions
migrations
restart
queue persistence
active workout recovery
```

---

# 92. Supabase Security Testing

Use two users.

Test:

```text
User A cannot read User B
User A cannot write child rows under User B parent
```

This specifically includes malicious ID combinations.

---

# 93. AI Test Boundary

Most automated tests use:

```text
Mock AI Provider
```

Live OpenAI evaluations run separately.

---

# 94. CI Architecture

Initial CI:

```text
install
↓
typecheck
↓
lint
↓
unit tests
↓
selected integration tests
```

Deployment automation can remain manual initially.

---

# 95. Deployment Architecture

Personal development:

```text
Cursor
↓
Expo
↓
iPhone / Expo Go
↓
Development Supabase
↓
OpenAI through Edge Functions
```

---

# 96. Standalone Future Build

Later:

```text
Source
↓
EAS Build
↓
Standalone Mobile Binary
↓
Phone
```

The Mac development server is no longer needed for normal operation.

---

# 97. No Vercel Requirement

havAI mobile V1 does not require Vercel.

Potential future use:

```text
marketing site
admin dashboard
web product
```

---

# 98. No AWS Requirement

AWS is not required for V1.

Adding:

```text
EC2
Lambda
ECS
RDS
API Gateway
```

would duplicate capabilities already handled by Supabase/Expo.

---

# 99. Future Scale Boundary

If havAI grows, potential future components could include:

```text
background job processing
analytics warehouse
custom recommendation service
more advanced AI orchestration
```

These should be introduced based on measured product requirements.

---

# 100. Performance Architecture

Critical action:

```text
Complete Set
```

must feel immediate.

It may depend on:

```text
local validation
SQLite
UI state
```

It may not depend on:

```text
Supabase
OpenAI
analytics request
```

---

# 101. Startup Performance

Startup should prioritize:

```text
SQLite open
auth/session state
active workout restoration
local Home state
```

before noncritical cloud refreshes.

---

# 102. History Query Architecture

Do not fetch lifetime history for normal screens.

Use:

```text
pagination
recent-session queries
exercise-specific history
```

---

# 103. Read Cache Strategy

Cache recent history sufficient for:

```text
previous performance
offline progression
recent progress UI
```

Recommended baseline:

```text
3-5 comparable sessions per used exercise
```

---

# 104. Cache Does Not Equal Truth

If cache only contains five sessions, the app cannot claim an all-time result unless all-time state is separately known.

Persistent PR state or cloud query may provide broader historical truth.

---

# 105. Active Workout Snapshot Architecture

At workout start, copy:

```text
template name
exercise order
targets
recommendation target
source recommendation ID
```

into workout-specific records.

Do not resolve them dynamically from current template later.

---

# 106. Template Edit Safety

Changing:

```text
Push Day
```

after a workout has started must not rewrite that workout.

Historical workouts are immutable snapshots except explicit historical edits.

---

# 107. User Override Architecture

Recommendations remain advisory.

If havAI recommends:

```text
190 lb
```

and user performs:

```text
185 lb
```

store what actually happened.

No architecture layer should block the user because it differs from recommendation.

---

# 108. Historical Edit Architecture

When user edits historical raw data:

```text
raw set update
↓
sync
↓
recalculate affected metrics
↓
recalculate PR state
↓
recalculate recommendation
```

Do not rewrite unrelated exercises.

---

# 109. Historical Delete Architecture

Deleting a historical workout:

```text
delete raw workout
↓
cascade dependent rows
↓
sync/delete
↓
recalculate affected derived state
```

---

# 110. Database Migration Architecture

Cloud:

```text
supabase/migrations/
```

Local:

```text
src/db/migrations/
```

No manual-only schema evolution.

---

# 111. Generated Types

Supabase DB types should be generated from schema.

Do not manually maintain cloud row interfaces where generated types can be used.

Generated row types remain persistence types, not domain types.

---

# 112. Mapper Architecture

Every persistence boundary should use explicit mapping.

Examples:

```text
Supabase Row
↓
Domain Model
```

```text
SQLite Row
↓
Domain Model
```

```text
Domain Model
↓
Cloud Write Payload
```

---

# 113. Cloud Write Payload Boundary

Do not send whole domain objects blindly.

Example domain object may contain:

```text
createdAt
updatedAt
```

Cloud payload mapper should intentionally omit server-owned metadata.

---

# 114. Local Sync Metadata Boundary

Fields such as:

```text
sync_status
server_updated_at
deleted_at
```

belong to SQLite/infrastructure.

They should not pollute general workout-domain models.

---

# 115. Repository Architecture

Repository interfaces isolate persistence.

Example:

```text
WorkoutRepository
TemplateRepository
ExerciseRepository
RecommendationRepository
```

Implementations may include:

```text
LocalWorkoutRepository
SupabaseWorkoutRepository
```

depending on actual responsibility.

---

# 116. Do Not Over-Generalize Repositories

V1 does not need a universal:

```text
BaseRepository<T>
```

if it makes domain-specific operations harder to express.

Favor clear interfaces over generic abstraction.

---

# 117. Application Service Transactions

SQLite transactional operations should be coordinated at the application/service layer.

Examples:

```text
startWorkout
completeSet
finishWorkout
createTemplate
```

Repository methods may participate in a shared transaction context where necessary.

---

# 118. Atomic Complete Set

Required atomic unit:

```text
insert/update set
+
enqueue/coalesce sync
```

If transaction fails:

```text
no completed UI state
```

Only after this transaction commits may the UI start the automatic rest timer and expose Undo. Timer state is an isolated client concern derived from timestamps; timer failure cannot roll back, delete, or invalidate the set. Undo is a separate local-first transaction that coalesces an unsynced mutation or queues the normal safe cloud delete/update path for a synchronized set.

---

# 119. Atomic Workout Start

Required:

```text
create workout
create workout exercises
enqueue records
```

If partial write fails:

```text
do not leave a broken active workout
```

---

# 120. Atomic Workout Completion

Local completion should preserve:

```text
completed status
summary-generating raw data
recommendations
sync intent
```

with appropriate transactional guarantees.

---

# 121. Background Execution Assumption

Do not require guaranteed mobile background processing.

Correctness must come from:

```text
durable local data
```

not:

```text
background worker always running
```

---

# 122. Sync Resume

If app closes with pending queue:

```text
reopen
↓
restore queue
↓
sync when possible
```

---

# 123. Connectivity Architecture

Network status is advisory.

The app may think it is online while Supabase still fails.

Remote request results determine actual sync success.

---

# 124. Architecture for "Online"

Do not model online as:

```text
online = remote operations guaranteed
```

Model it as:

```text
online = worth attempting remote operations
```

---

# 125. Feature Offline Classification

Every feature should be classified as:

```text
must work offline
cache-capable offline
requires internet
```

---

# 126. Must Work Offline

V1:

```text
template creation/edit
custom exercise creation
active workout
set logging
set editing
set deletion
set completion undo
workout notes
set notes
exercise favorites and user exercise preferences
automatic rest timer operation
workout completion
basic metrics
deterministic progression
recommendation persistence
```

---

# 127. Cache-Capable Offline

Examples:

```text
exercise library
previous performance
recent history
progress view
```

availability depends on local cache.

---

# 128. Requires Internet

V1:

```text
new authentication
cloud sync
older uncached history
AI Coach
AI explanation
Quick Log parsing
```

---

# 129. Design-System Architecture

Visual primitives live under:

```text
src/theme/
```

and reusable UI components.

Do not hardcode brand styling per screen.

---

# 130. Core Palette

Primary design:

```text
dark gray
+
blood orange
```

Detailed tokens remain in `DESIGN_SPEC.md`.

---

# 131. One Primary Action Principle

Active screens should present one obvious primary action.

Examples:

```text
Complete Set
Start Workout
Save Workout
Done
```

This is a UX architecture constraint, not just visual styling.

---

# 132. Accessibility Architecture

Reusable components should handle:

```text
accessibility labels
roles
touch target sizing
text scaling
non-color-only states
```

Do not implement accessibility independently in every screen.

---

# 133. Debug Architecture

Development builds should expose a hidden diagnostics area.

Useful data:

```text
environment
app version
SQLite schema
current user
active workout
network state
queue size
last sync
AI provider
engine version
```

---

# 134. Debug Actions

Development-only:

```text
Force Sync
Simulate Offline
View Queue
View Progression Debug Data
Mock AI
```

Must not become normal production actions.

---

# 135. Architecture Decision Records

Material changes require ADRs.

Examples:

```text
replace SQLite
replace Supabase
add Redux
introduce custom backend
change conflict strategy
change canonical weight unit
```

Do not silently reverse locked decisions.

---

# 136. V1 Locked Decisions

The following are architectural commitments:

```text
React Native
Expo
Expo Router
TypeScript

Supabase PostgreSQL
Supabase Auth
RLS
Supabase Edge Functions

Expo SQLite

local-first workout persistence

authoritative local templates

authoritative local custom exercises

authoritative local recommendations before sync

deterministic progression engine

OpenAI server-side only

client-generated UUIDs

kilograms as canonical internal/storage weight unit

server-controlled cloud created_at / updated_at

PR state derived from raw history

no personal-record offline sync entity

no custom V1 backend

no advanced multi-device conflict resolution
```

---

# 137. Things Cursor Must Not Invent

Cursor must not independently add:

```text
Redux
Firebase
MongoDB
Prisma
GraphQL
custom Node backend
background job server
Redis
ML progression service
direct OpenAI mobile calls
dedicated swap-exercise workflow
dedicated skip-exercise workflow
```

without a deliberate architecture change.

---

# 137A. Approved Workout Convenience Architecture

`user_exercise_preferences` / `local_user_exercise_preferences` is the single user-owned entity for favorites, persistent exercise notes, and optional per-exercise rest-duration overrides. It references either an accessible system exercise or the user's custom exercise, is locally authoritative after creation, and synchronizes through the persistent queue after its exercise dependency.

Workout notes remain fields on workouts; set notes remain fields on sets. No generic notes service or polymorphic table is introduced.

The exercise picker is a read/application-service composition over the exercise library and user preferences. Popular ordering is curated configuration or deterministic ordering; it is not an analytics service.

The automatic rest timer is not a cloud domain entity. The configured default synchronizes with the profile and an optional override with the exercise preference, while the running countdown stays isolated client state represented by timestamps and paused remaining duration. It never gates navigation or set completion.

---

# 138. Simplicity Principle

When two architectures satisfy requirements equally well:

```text
choose the simpler one
```

But simplicity must not remove:

```text
data durability
validation
security
tests
offline behavior
```

---

# 139. Architecture Dependency Hierarchy

```text
SPECIFICATION
      ↓
DOMAIN CONTRACT
      ↓
APPLICATION USE CASE
      ↓
REPOSITORY
      ↓
PERSISTENCE / INFRASTRUCTURE
```

UI should not bypass this hierarchy for convenience.

---

# 140. Example: Complete Set Architecture

```text
SetInputRow
    ↓
completeSet()
    ↓
validate CompleteSetInput
    ↓
create WorkoutSet domain object
    ↓
SQLite transaction
    ├── local_sets
    └── sync_queue
    ↓
commit
    ↓
screen updates
    ↓
sync engine later
```

---

# 141. Example: Start Workout Architecture

```text
Template
    ↓
startWorkout()
    ↓
snapshot local template
    ↓
snapshot recommendation
    ↓
SQLite transaction
    ├── local_workouts
    ├── local_workout_exercises
    └── sync queue
    ↓
Active Workout
```

---

# 142. Example: Finish Workout Architecture

```text
Finish Workout
      ↓
finishWorkout()
      ↓
finalize local workout
      ↓
calculate summary
      ↓
detect PR events
      ↓
calculate progression
      ↓
persist local recommendation
      ↓
queue sync
      ↓
Workout Summary UI
```

No network requirement.

---

# 143. Example: Coach Architecture

```text
User Question
    ↓
Mobile Coach Client
    ↓
Edge Function
    ↓
Authenticate
    ↓
Load trusted history/profile
    ↓
Merge validated current local session
    ↓
OpenAI
    ↓
Validate response
    ↓
Coach UI
```

---

# 144. Example: Quick Log Architecture

```text
"185 for 8 7 6"
       ↓
Parser Edge Function
       ↓
Candidate Structured Sets
       ↓
Confirmation UI
       ↓
lb → kg
       ↓
completeSet()
       ↓
SQLite
```

---

# 145. Example: Cloud Sync Architecture

```text
Pending Queue
      ↓
Acquire Mutex
      ↓
Resolve Dependencies
      ↓
Read Latest Local Entity
      ↓
Map to Remote Payload
      ↓
Supabase Upsert/Delete
      ↓
Update server_updated_at
      ↓
Mark Synced
      ↓
Remove Queue Item
```

---

# 146. Example: Cloud Pull Architecture

```text
Push Dirty Local Data
       ↓
Query Cloud Updates
       ↓
Map Cloud Rows
       ↓
Check Local Dirty State
       ↓
Safe?
  /          \
YES          NO
 │            │
 ▼            ▼
Update       Preserve Local
Local        + Log Conflict
```

Active workout always receives special protection.

---

# 147. Scalability Principle

The expected V1 workload is small.

A user may generate:

```text
a few workouts per week
dozens of sets per workout
```

PostgreSQL and SQLite can handle this trivially.

Do not optimize prematurely.

---

# 148. Data Volume Example

Even:

```text
500 workouts
5,000-10,000 sets
```

is a small dataset.

Use good indexes and focused queries.

No specialized analytics infrastructure is required.

---

# 149. Query Performance Principle

Use indexes for:

```text
workout history
exercise history
recommendations
PRs
templates
```

Do not fetch giant joined objects when a focused query is sufficient.

---

# 150. Privacy Boundary

Workout data is private user data.

Normal users should only access their own private records plus shared system exercises.

AI should receive only context needed for the user's request.

---

# 151. Cost Architecture

Initial infrastructure should remain close to:

```text
$0 fixed monthly cost
```

using:

```text
Expo
Supabase free/development tier
GitHub
OpenAI usage only when invoked
```

---

# 152. AI Cost Control

AI should not run automatically for:

```text
set logging
PR detection
progression
sync
workout completion
history loading
```

It should run only for explicit AI interactions.

---

# 153. Observability Evolution

Initial:

```text
local/dev logging
Supabase logs
```

Before external beta, consider:

```text
crash reporting
basic sync telemetry
AI failure monitoring
```

No need for a complex observability stack in personal V1.

---

# 154. Architecture Release Milestones

## Milestone 1

```text
Expo + navigation + design + contracts + SQLite
```

---

## Milestone 2

```text
Auth + profile + onboarding
```

---

## Milestone 3

```text
Fully local workout tracker
```

---

## Milestone 4

```text
Cloud sync
```

---

## Milestone 5

```text
Deterministic progression
```

---

## Milestone 6

```text
History + progress
```

---

## Milestone 7

```text
AI enhancement
```

---

# 155. Architecture Definition of Done

havAI V1 architecture is correctly implemented when:

- React Native/Expo provides the mobile shell
- Expo Router manages navigation
- route files remain thin
- TypeScript is used throughout
- feature modules remain reasonably isolated
- SQLite is the active-workout authority
- local templates are authoritative before sync
- custom exercises can be created offline
- recommendations can be generated and persisted offline
- user exercise preferences and notes work from local state and synchronize later
- the rest timer and Undo remain isolated from durable set completion
- Supabase holds synchronized canonical cloud records
- cloud metadata timestamps are server-controlled
- canonical stored weight is kilograms
- display-unit conversion is centralized
- workout mutations commit locally before UI success
- cloud failures do not invalidate local workout success
- sync queue is persistent and idempotent
- sync dependency ordering is explicit
- push occurs before pull
- active local workouts are protected from cloud overwrites
- unsynced dirty local records are protected
- full multi-device conflict resolution is explicitly outside V1
- RLS protects private user data
- child-table RLS validates parent ownership
- progression is deterministic and AI-independent
- free-form notes never enter deterministic progression
- e1RM uses one canonical implementation
- PR state derives from raw history
- personal records are not offline queue entities
- OpenAI secrets never enter mobile code
- AI endpoints authenticate and authorize users
- AI cannot directly mutate workout history
- tests can isolate domain logic from infrastructure
- app remains useful with AI disabled
- app remains useful during poor connectivity
- no custom backend is required

---

# 156. Final Architecture Diagram

```text
                            HAVAI
                              │
                              ▼
                    ┌───────────────────┐
                    │   MOBILE CLIENT   │
                    │ React Native/Expo │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ APPLICATION LAYER │
                    └─────────┬─────────┘
                              │
              ┌───────────────┼────────────────┐
              │               │                │
              ▼               ▼                ▼
       DOMAIN LOGIC      REPOSITORIES     AI API CLIENT
              │               │                │
              │      ┌────────┴───────┐        │
              │      │                │        │
              ▼      ▼                ▼        ▼
      PROGRESSION  SQLITE        SYNC ENGINE  EDGE FUNCTION
         ENGINE       │                │        │
                      │                ▼        ▼
                      │            SUPABASE   OPENAI
                      │                ▲
                      └────────────────┘
```

---

# 157. Final Architecture Principle

havAI should remain dependable when every optional service disappears.

If:

```text
OpenAI is unavailable
```

the tracker still works.

If:

```text
Supabase is temporarily unavailable
```

the workout still works.

If:

```text
the phone has no signal
```

the workout still works.

The one dependency that must succeed before havAI claims a workout action is safely complete is:

```text
LOCAL DURABLE STORAGE
```

Everything else can synchronize, enhance, explain, or analyze afterward.

That is the central architectural rule for havAI V1.
