# havAI

**havAI** is a local-first mobile workout progression tracker designed to make progressive overload easier to execute consistently.

The app is built around a simple training loop:

> **See what you did last time. Know what to target today. Log your workout quickly. Know what to try next time.**

havAI combines fast workout logging, deterministic progression logic, offline-first reliability, progress tracking, and optional AI coaching.

The project is currently in active development.

---

# Overview

Most workout trackers are good at recording what happened, but they leave the user to decide what should happen next.

havAI is designed to bridge that gap.

Instead of simply storing:

```text
185 lb × 8
185 lb × 7
185 lb × 6
```

havAI should also understand the progression context and produce a structured next-session target such as:

```text
185 lb

8 / 7 / 7
```

Then, once the user reaches:

```text
185 lb

8 / 8 / 8
```

havAI may recommend:

```text
190 lb

3 × 6-8
```

The progression system is deterministic and explainable.

AI enhances the experience, but it does not replace the core progression engine.

---

# Product Vision

havAI should make progressive overload easier to execute consistently.

The product should answer three questions extremely well:

```text
What did I do last time?

What should I do today?

What should I try next time?
```

The goal is to reduce the mental overhead involved in tracking:

- weight
- reps
- RPE
- previous performance
- exercise progression
- workout history
- personal records
- strength trends
- next-session targets

The workout experience should be fast enough to use between sets without becoming a distraction from training.

---

# Core Product Principles

## 1. Local-First Workout Logging

Workout-critical actions are saved to the device before the app reports success.

A completed set should never depend on:

- cellular reception
- gym Wi-Fi
- Supabase availability
- OpenAI availability
- background network execution

The intended mutation flow is:

```text
User Action
    ↓
Local SQLite
    ↓
Durable Commit
    ↓
Immediate UI Update
    ↓
Sync Queue
    ↓
Supabase When Available
```

For workout-critical actions, local durable storage is the first source of truth.

---

## 2. Deterministic Progression

Progression recommendations are generated using normal application logic, not an LLM.

The progression engine evaluates factors such as:

- current target
- current workout performance
- recent comparable sessions
- reps completed
- optional RPE
- exercise type
- training goal
- progression style
- available weight increments

Possible recommendations include:

```text
increase_weight
increase_reps
repeat_target
maintain_weight
decrease_weight
insufficient_data
```

Given identical inputs, the engine should always produce identical output.

---

## 3. AI as an Enhancement Layer

AI should make havAI more useful without becoming a dependency for normal training.

Planned V1 AI features include:

### Coach

Ask questions using actual workout context.

Examples:

```text
Why did my incline bench stall?

Should I try 190 again next session?

How has my squat been progressing?

What should I do for my next set?
```

### Recommendation Explanations

The deterministic progression engine decides the target.

AI can provide a richer explanation of why that recommendation makes sense.

### Natural-Language Quick Log

Example:

```text
185 for 8, 7, 6, last set RPE 9
```

havAI can parse that into candidate sets for the user to review and confirm.

AI never directly writes workout history.

---

## 4. Offline Reliability

A user should be able to enter the gym with poor or no reception and still:

- start an existing workout
- create or edit workout templates
- create custom exercises
- log working sets
- log warm-up sets
- edit sets
- delete sets
- add extra sets
- switch exercises
- finish a workout
- view the workout summary
- generate deterministic progression recommendations
- close and reopen the app without losing the workout

Cloud synchronization happens later when connectivity returns.

---

# V1 Goals

havAI V1 aims to support the complete workout lifecycle:

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
Finish Workout
      ↓
Receive Progression Recommendation
      ↓
Sync Later
      ↓
Review History
      ↓
Review Progress
      ↓
Use AI Coaching
```

---

# Planned V1 Features

## Authentication

V1 will support:

- account creation
- login
- logout
- persistent sessions
- secure user-isolated cloud data

Authentication will use:

```text
Supabase Auth
```

---

## Onboarding

Users will configure several training preferences.

### Weight Unit

```text
lb
kg
```

### Primary Goal

```text
strength
hypertrophy
hybrid
```

### RPE Preference

```text
hidden
optional
preferred
```

### Progression Style

```text
conservative
balanced
aggressive
```

Balanced will be the default progression style.

---

# Main Navigation

The authenticated app will use five primary tabs:

```text
Home

Workouts

Progress

Coach

Profile
```

---

# Home

The Home screen should answer:

> What should I do right now?

Without an active workout:

```text
Ready to Train
```

The user will see available workout templates and relevant recent training information.

With an active workout:

```text
Workout in Progress
```

The active session becomes the dominant Home state.

---

# Exercise Library

havAI will include a built-in library of common exercises.

Each exercise may contain:

- name
- primary muscle group
- secondary muscle groups
- equipment type
- measurement type

V1 measurement types include:

```text
weight_reps
bodyweight_reps
reps_only
```

The initial production exercise library is expected to include roughly:

```text
50-100 common exercises
```

Users will also be able to create custom exercises.

---

# Custom Exercises

Users can create exercises that do not exist in the built-in library.

A custom exercise includes:

```text
name
primary muscle group
secondary muscle groups
equipment type
measurement type
```

Custom exercises:

- belong to the user
- can be created offline
- receive client-generated UUIDs
- can be used immediately
- can be edited
- can be archived
- remain valid in historical workouts after archival

---

# Workout Templates

Users can create reusable workout templates such as:

```text
Push
Pull
Legs
Upper
Lower
Chest + Back
```

Example:

```text
Push

Incline Barbell Bench Press
3 × 6-8

Machine Chest Press
3 × 8-10

Cable Fly
3 × 10-12

Lateral Raise
4 × 10-15

Triceps Pushdown
3 × 8-12
```

Templates support:

- creation
- editing
- duplication
- exercise reordering
- archival
- offline use

Each template exercise can define:

```text
target sets
minimum reps
maximum reps
optional notes
```

Templates are locally authoritative so they remain usable without internet access.

---

# Active Workout

Starting a workout creates a local snapshot of:

- workout name
- exercise order
- target sets
- target rep ranges
- current progression recommendations
- source recommendation IDs

Later template changes do not modify an already-started workout.

Only one active workout is allowed per user/device in V1.

If another workout is already active, the user will be offered:

```text
Resume Workout
Discard Current Workout
Cancel
```

---

# Exercise Logging Experience

The active exercise screen is one of the most important parts of havAI.

The user should immediately see:

```text
Exercise Name

Today's Target

Last Time

Today's Sets
```

Example:

```text
Incline Barbell Bench Press

Today
185 lb
8 / 7 / 7

Last Time
185 × 8
185 × 7
185 × 6
```

The user should not need to open a separate history page during a normal workout.

---

# Set Logging

A normal working set supports:

```text
weight
reps
RPE optional
```

The primary action is:

```text
Complete Set
```

The logging experience should be fast enough to use one-handed between sets.

Where appropriate, the next set's weight can be prefilled from:

- the current target
- the previous working set

Reps and RPE remain easy to modify.

---

# Warm-Up Sets

Warm-up sets are stored separately from normal working sets.

They:

- remain visible in workout history
- are clearly identified in the UI
- do not count toward normal progression calculations

---

# Extra Sets

Users may perform more working sets than originally planned.

Extra sets:

- belong to the actual workout
- are stored normally
- may influence training context
- do not automatically modify the workout template

---

# Set Editing

Completed sets can be edited.

Editable values include:

```text
weight
reps
RPE
```

Edits are saved locally first and synchronized later.

---

# Set Deletion

Completed sets can be deleted.

If a set has never reached the cloud:

```text
Remove Local Set
↓
Remove Pending Upsert
```

If the set already exists remotely:

```text
Hide/Tombstone Locally
↓
Queue Delete
↓
Delete Remotely Later
```

---

# Workout Timer

Workout duration is based on timestamps rather than a continuously running JavaScript timer.

During the workout:

```text
Current Time - startedAt
```

After completion:

```text
completedAt - startedAt
```

This keeps the timer accurate after:

- phone lock
- app backgrounding
- app restart
- operating system suspension

---

# Workout Recovery

An active workout should survive:

- phone lock
- app backgrounding
- force close
- operating system termination
- phone restart

Completed sets are stored locally in SQLite.

On restart:

```text
Open App
↓
Load SQLite
↓
Find Active Workout
↓
Home Shows Workout in Progress
↓
Resume
```

---

# Workout Completion

When the user finishes a workout, havAI should:

```text
Finalize Local Workout
↓
Calculate Summary
↓
Detect PR Events
↓
Calculate Progression
↓
Persist Recommendations
↓
Queue Cloud Sync
↓
Show Workout Summary
```

The entire flow must work offline.

---

# Workout Summary

After finishing a workout, havAI should show:

- workout duration
- working set count
- exercise results
- detected PRs
- next-session recommendations

Example:

```text
Push Complete

Duration
1h 06m

Incline Bench
185 × 8 / 8 / 8

New Rep PR

Next Time
190 lb
3 × 6-8
```

---

# Progression Engine

The progression engine is one of the core parts of havAI.

It is designed to support gradual progression rather than blindly adding weight every workout.

Example target:

```text
185 lb
3 × 6-8
```

Possible progression:

```text
6 / 6 / 6
↓
7 / 6 / 6
↓
7 / 7 / 6
↓
7 / 7 / 7
↓
8 / 7 / 7
↓
8 / 8 / 7
↓
8 / 8 / 8
↓
Increase Weight
↓
190 lb
6 / 6 / 6
```

---

# Progression Recommendation Types

## Increase Weight

The external load increases.

Example:

```text
185 lb
8 / 8 / 8

↓

190 lb
6 / 6 / 6
```

---

## Increase Reps

The load remains the same but the explicit rep target increases.

Example:

```text
185 lb
8 / 7 / 6

↓

185 lb
8 / 7 / 7
```

---

## Repeat Target

Repeat substantially the same intended target.

Example:

```text
Target:
185 × 8 / 8 / 8

Actual:
185 × 8 / 7 / 7

Next:
185 × 8 / 8 / 8
```

---

## Maintain Weight

The current working load remains appropriate, but the workout was not clean enough to justify a precise higher rep target.

Example:

```text
190 × 6
185 × 8
185 × 7
```

havAI may recommend staying around the same working load with a broad rep range.

---

## Decrease Weight

Used when repeated evidence indicates the current load is too difficult.

One poor session should generally not cause an immediate decrease.

---

## Insufficient Data

If havAI does not have enough meaningful information, it should explicitly say:

```text
insufficient_data
```

rather than inventing false precision.

---

# Progression Styles

Users can select:

```text
Conservative
Balanced
Aggressive
```

These adjust progression thresholds but do not create separate progression engines.

## Conservative

Requires stronger evidence before load progression and gives high RPE more influence.

## Balanced

Default behavior.

Supports gradual rep progression and load increases when the rep range is fully achieved.

## Aggressive

May progress slightly earlier when performance and trend data strongly support it.

---

# RPE

RPE is optional throughout havAI.

Supported RPE values:

```text
6
6.5
7
7.5
8
8.5
9
9.5
10
```

Progression must continue to work correctly when no RPE data exists.

---

# Estimated One-Rep Max

havAI uses one canonical estimated 1RM implementation.

V1 uses the:

```text
Epley Formula
```

For reps greater than one:

```text
e1RM = weight × (1 + reps / 30)
```

For exactly one rep:

```text
e1RM = weight
```

Estimated 1RM is supporting evidence for:

- progress tracking
- PR detection
- trend analysis
- progression context

---

# Personal Records

havAI will detect:

```text
Maximum Weight PR

Estimated 1RM PR

Rep PR at a Specific Weight
```

Persistent current PR state focuses on:

```text
max_weight
estimated_1rm
```

Rep-at-weight PRs can be derived from workout history rather than permanently storing every possible weight/rep combination.

---

# Progress Tracking

The Progress area helps answer:

> Am I getting stronger?

Planned exercise-level information includes:

- current estimated 1RM
- best estimated 1RM
- best weight
- best set
- recent sessions
- recent trend
- recent PRs

A simple estimated 1RM trend chart is planned for V1.

---

# Workout History

Users will be able to review completed workouts.

Each history item may show:

```text
date
workout name
duration
exercise count
```

Workout detail will show:

```text
exercises
sets
weight
reps
RPE
warm-up sets
```

History will be paginated rather than loading the user's entire lifetime history at once.

---

# Historical Editing

Historical workout data may be edited.

When raw historical data changes:

```text
Update Raw Data
↓
Synchronize Change
↓
Recalculate Affected Metrics
↓
Recalculate PR State
↓
Recalculate Recommendation
```

Only affected exercises should be recalculated.

---

# AI Coach

The Coach tab allows users to ask contextual questions about their actual training.

Examples:

```text
Why did my bench stall?

Should I increase weight next session?

What should I do for my next set?

How has my incline bench been progressing?
```

When relevant, Coach context may include:

- profile preferences
- active workout
- active exercise
- current local completed sets
- recent workout history
- current progression recommendation
- calculated trend data

The server should load only the context necessary for the question.

---

# Recommendation Explanations

Every progression recommendation must have a deterministic explanation available offline.

Example:

```text
Increase to 190 lb

You reached the top of your target rep range across all planned working sets.
```

When online, AI may provide a richer explanation.

AI explanations do not replace or change the canonical progression result.

---

# Natural-Language Quick Log

Quick Log is part of V1.

Example input:

```text
185 for 8, 7, 6, last set RPE 9
```

Flow:

```text
User Text
↓
AI Parser
↓
Candidate Sets
↓
User Reviews
↓
User Edits if Necessary
↓
User Confirms
↓
Normal Local Set Persistence
```

AI never writes directly to SQLite or Supabase.

If the text is ambiguous, havAI should surface the ambiguity instead of inventing values.

Quick Log requires internet in V1.

Manual set logging remains fully available offline.

---

# Technical Architecture

## Mobile

```text
React Native
Expo
TypeScript
Expo Router
```

---

## Local Database

```text
Expo SQLite
```

SQLite is responsible for workout-critical local persistence.

---

## Cloud

```text
Supabase
```

Using:

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

OpenAI requests are only made through server-side Supabase Edge Functions.

The mobile application never contains the OpenAI API key.

---

# High-Level Architecture

```text
                            havAI
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

# Local Data Architecture

SQLite stores authoritative local copies of:

```text
workout templates
workout template exercises
custom exercises
workouts
workout exercises
sets
progression recommendations
```

It also contains:

```text
sync queue
schema metadata
cached recent exercise history
```

---

# Synchronization

Cloud-backed local entities synchronize through a persistent sync queue.

V1 synchronization entities include:

```text
workout_template
workout_template_exercise
custom_exercise
workout
workout_exercise
set
progression_recommendation
```

Personal record state is not treated as an offline sync-queue entity.

PR state is derived from raw workout history.

---

# Sync Principles

The synchronization system is built around:

```text
client-generated UUIDs
idempotent upserts
persistent queue
dependency ordering
push before pull
bounded retries
active-workout protection
dirty-local-data protection
```

---

# Sync Dependency Examples

Workout:

```text
Workout
   ↓
Workout Exercise
   ↓
Set
```

Template:

```text
Custom Exercise
      ↓
Workout Template
      ↓
Workout Template Exercise
```

Recommendation:

```text
Source Workout
      ↓
Source Workout Exercise
      ↓
Progression Recommendation
```

The sync engine understands dependencies rather than relying on queue insertion order.

---

# Push Before Pull

When connectivity returns:

```text
Push Unsynced Local Changes
↓
Pull Safe Cloud Changes
```

This reduces the risk of older cloud state overwriting newer local work.

---

# Active Workout Protection

While a workout is active, the local workout snapshot is authoritative.

Cloud pulls must not overwrite:

- current exercise order
- targets
- completed sets
- notes
- recommendation snapshots

---

# Conflict Scope

V1 is primarily designed around one actively used device.

The architecture supports future multi-device behavior, but V1 does not attempt:

```text
field-level merge engines
CRDTs
complex simultaneous edit reconciliation
```

If a conflict occurs, the priorities are:

```text
preserve unsynced raw data
protect active workout
avoid silent destructive overwrite
regenerate derived state where possible
```

---

# Canonical Units

All internal and stored load values use:

```text
kilograms
```

Example:

```text
185 lb
```

is represented internally as approximately:

```text
83.9146 kg
```

The user's selected display unit affects presentation and input only.

Changing:

```text
lb → kg
```

does not rewrite historical workout data.

---

# Security

Cloud data uses:

```text
Supabase Authentication
+
PostgreSQL Row Level Security
```

Private user data must remain isolated.

The database must also prevent cross-user parent-reference attacks.

Example:

```text
User A Set
→
User B Workout
```

must be rejected even if the child set claims to belong to User A.

---

# AI Architecture

AI follows this boundary:

```text
Mobile
   ↓
Supabase Edge Function
   ↓
Authentication
   ↓
Request Validation
   ↓
Authorization
   ↓
Context Building
   ↓
OpenAI
   ↓
Structured Response Validation
   ↓
Mobile
```

AI does not receive unrestricted database access.

---

# Error Handling

havAI distinguishes between local-storage failures and cloud failures.

## Local Failure

Example:

```text
Couldn't safely save this set.

Please try again.
```

The set should not appear completed.

---

## Cloud Failure

Example:

```text
Couldn't sync yet.

Your workout is saved on this device.
```

The workout continues normally.

---

# Offline Status

When offline, the user may see:

```text
Offline · Saved on device
```

This should remain subtle and non-blocking.

---

# Development Philosophy

havAI is intentionally being built in stages.

Implementation priority:

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

The app should become a useful workout tracker before AI becomes necessary.

---

# Development Milestones

## Milestone A: Foundation

```text
Expo
navigation
design system
contracts
SQLite
```

---

## Milestone B: Identity

```text
authentication
profile
onboarding
main application shell
```

---

## Milestone C: Local Gym Tracker

The app can:

```text
create custom exercises
create templates
start workouts
log sets
edit sets
close the app
reopen
resume
```

without requiring cloud workout storage.

This is the first major usability milestone.

---

## Milestone D: Cloud-Backed Offline Tracker

Adds:

```text
Supabase workout storage
template synchronization
custom exercise synchronization
offline synchronization
history durability
```

---

## Milestone E: Core havAI

Adds:

```text
progression engine
recommendations
PR detection
history
progress analytics
```

At this point the app should already be useful with AI disabled.

---

## Milestone F: AI Enhancement

Adds:

```text
Coach
Recommendation Explanation
Natural-Language Quick Log
```

---

## Milestone G: Personal V1

Ready for sustained real-world gym usage.

---

# Project Documentation

The complete approved product and technical specifications live in:

```text
/docs
```

Current specification set:

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

---

# Documentation Responsibilities

## `PRD.md`

Defines:

- product vision
- V1 scope
- functional requirements
- user-facing behavior
- product exclusions

---

## `USER_FLOWS.md`

Defines:

- authentication journeys
- onboarding
- navigation
- workout flows
- offline flows
- Coach flows
- Quick Log flows
- recovery and error flows

---

## `DESIGN_SPEC.md`

Defines:

- visual direction
- dark gray and blood orange palette
- typography
- spacing
- component behavior
- workout UX patterns

---

## `ARCHITECTURE.md`

Defines:

- technology stack
- architectural boundaries
- local-first strategy
- persistence responsibilities
- cloud responsibilities
- AI boundaries

---

## `DATABASE.md`

Defines:

- Supabase PostgreSQL schema
- SQLite schema
- foreign keys
- indexes
- RLS expectations
- ownership consistency
- local vs cached data

---

## `PROGRESSION_ENGINE.md`

Defines:

- deterministic progression logic
- recommendation types
- trend analysis
- RPE handling
- plateau logic
- confidence
- reason codes

---

## `AI_SYSTEM.md`

Defines:

- Coach architecture
- recommendation explanation
- Quick Log parsing
- OpenAI boundaries
- prompt/version strategy
- AI safety and validation

---

## `OFFLINE_SYNC.md`

Defines:

- local authority
- sync queue
- retries
- idempotency
- dependencies
- conflict boundaries
- reconnect behavior

---

## `API_CONTRACTS.md`

Defines:

- TypeScript domain contracts
- repository contracts
- sync contracts
- AI request/response contracts
- error envelopes
- unit semantics

---

## `TESTING.md`

Defines:

- unit testing
- integration testing
- SQLite testing
- synchronization tests
- RLS/security testing
- AI evaluation
- physical gym testing

---

## `DEPLOYMENT.md`

Defines:

- local development environment
- Supabase environments
- Edge Function deployment
- EAS strategy
- production preparation

---

## `CURSOR_RULES.md`

Defines how Cursor should implement the project without:

- architecture drift
- scope creep
- unsafe persistence shortcuts
- duplicated business logic
- accidental changes to approved specifications

---

## `MASTER_TASK_LIST.md`

Defines the dependency-ordered implementation plan.

Tasks should normally be implemented one at a time.

---

# Development Workflow

Implementation is performed incrementally using the Master Task List.

Typical flow:

```text
Select Task
↓
Read Cursor Rules
↓
Read Relevant Specifications
↓
Inspect Existing Repository
↓
Create Implementation Plan
↓
Implement
↓
Test
↓
Verify
↓
Review
↓
Commit
↓
Next Task
```

The project should not be implemented as one large AI-generated change.

---

# Cursor Workflow

A typical Cursor request should look like:

```text
Implement Task X.X from docs/MASTER_TASK_LIST.md.

Follow docs/CURSOR_RULES.md exactly.

Before coding:

1. Read Task X.X.
2. Read all relevant specifications.
3. Inspect the existing repository.
4. Give me a concise implementation plan.

Then implement only Task X.X and its listed subtasks.

Do not implement later tasks.

When finished:
- run relevant tests
- run typecheck
- run lint
- report files changed
- report verification results
- report limitations
- report specification conflicts

Stop before beginning the next task.
```

---

# Git Workflow

A clean Git checkpoint should be maintained after meaningful tasks.

Example:

```bash
git status
git diff

git add .
git commit -m "feat: complete task X.X"
git push
```

This keeps implementation steps independently reviewable and reversible.

---

# Intended Repository Structure

The repository will evolve during implementation, but the intended structure is approximately:

```text
hav-ai/
├── docs/
│   ├── adr/
│   ├── PRD.md
│   ├── USER_FLOWS.md
│   ├── DESIGN_SPEC.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── PROGRESSION_ENGINE.md
│   ├── AI_SYSTEM.md
│   ├── OFFLINE_SYNC.md
│   ├── API_CONTRACTS.md
│   ├── TESTING.md
│   ├── DEPLOYMENT.md
│   ├── CURSOR_RULES.md
│   └── MASTER_TASK_LIST.md
│
├── src/
│   ├── app/
│   │
│   ├── components/
│   │
│   ├── db/
│   │   ├── migrations/
│   │   └── ...
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── onboarding/
│   │   ├── exercises/
│   │   ├── templates/
│   │   ├── workouts/
│   │   ├── progression/
│   │   ├── recommendations/
│   │   ├── history/
│   │   ├── progress/
│   │   ├── sync/
│   │   ├── coach/
│   │   └── profile/
│   │
│   ├── lib/
│   │
│   ├── shared/
│   │   ├── contracts/
│   │   └── schemas/
│   │
│   └── theme/
│
├── supabase/
│   ├── migrations/
│   └── functions/
│
├── assets/
│
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

The exact structure may evolve slightly as implementation proceeds.

---

# Planned Development Commands

These commands will be finalized once the Expo project is scaffolded.

Expected scripts include:

```bash
npm run dev
npm run typecheck
npm run lint
npm test
npm run test:watch
```

Expo development may also use:

```bash
npx expo start
```

---

# Environment Variables

Expected public mobile configuration:

```text
EXPO_PUBLIC_APP_ENV
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Server-only secrets such as:

```text
OPENAI_API_KEY
Supabase service-role key
database passwords
```

must never be included in the mobile application.

An eventual:

```text
.env.example
```

will document required local configuration without containing real secrets.

---

# Bundle Identifier

Planned iOS bundle identifier:

```text
com.yahavcorcos.havai
```

This may be adjusted before public release if necessary.

---

# Design Direction

havAI is intended to feel:

```text
dark
clean
focused
athletic
modern
```

The primary visual identity uses:

```text
dark gray
+
blood orange
```

Core palette:

```text
Primary Background
#111315

Surface
#191C1F

Elevated Surface
#22262A

Border
#30353A

Blood Orange
#FF4F1F

Primary Text
#F5F6F7
```

Blood orange should emphasize:

- primary CTAs
- active states
- important workout targets
- progression

It should not be used indiscriminately.

---

# V1 Scope Exclusions

The following are intentionally outside V1:

```text
nutrition tracking

calorie tracking

meal logging

Apple Health integration

Apple Watch app

camera-based form analysis

social feed

friends/followers

leaderboards

trainer marketplace

payments

subscriptions

automatic full workout-program generation

advanced periodization

push-notification coaching

web dashboard

desktop application

machine-learning progression

advanced multi-device conflict resolution
```

Future features should be driven by actual product usage rather than added preemptively.

---

# Testing Philosophy

havAI's most important testing areas are not cosmetic.

Priority should be given to:

```text
workout data durability
progression correctness
offline recovery
synchronization idempotency
RLS/security
AI contract validation
```

Critical scenarios include:

```text
start workout
↓
lose internet
↓
log several sets
↓
edit a set
↓
force close
↓
reopen
↓
resume
↓
finish offline
↓
generate recommendation
↓
reconnect
↓
sync exactly once
```

If this flow is unreliable, havAI is not ready to replace another workout tracker.

---

# Personal V1 Definition of Done

Before havAI becomes the primary workout tracker used during real training:

- no known workout data-loss bug
- no known duplicate-set synchronization bug
- active workout recovery works
- offline set logging works
- offline workout completion works
- offline recommendation persistence works
- template offline behavior works
- custom exercises work offline
- deterministic progression golden tests pass
- previous-performance UI is fast and useful
- recommendation UI is understandable
- real gym testing has been completed

---

# Future Direction

Possible later features include:

```text
rest timers
supersets
advanced set types
program blocks
periodization
body metrics
wearable integrations
Apple Health
Apple Watch
automatic workout programming
adaptive personalization
social features
```

These are not current implementation priorities.

---

# Current Status

```text
Status: Pre-implementation / documentation complete
```

The product and technical specifications have been established.

The next development stage is to begin executing:

```text
docs/MASTER_TASK_LIST.md
```

one task at a time.

---

# Core Product Loop

The product should remain focused on:

```text
TRAIN
  ↓
LOG
  ↓
UNDERSTAND
  ↓
PROGRESS
  ↓
REPEAT
```

If a user can walk into the gym, immediately know what they did last time, immediately know what to target today, record each set without friction, and leave knowing what to attempt next time, havAI has succeeded.
