# havAI V1 Product Requirements Document

## 1. Product Name

```text
havAI
```

Working description:

> A local-first workout progression tracker that helps users log training quickly, track performance over time, and receive deterministic next-workout recommendations with optional AI coaching.

---

# 2. Product Vision

havAI should make progressive overload easier to execute consistently.

The product should answer three questions extremely well:

```text
What did I do last time?

What should I do today?

What should I try next time?
```

The app should reduce the mental overhead of tracking:

- weights
- reps
- RPE
- previous performance
- exercise progression
- workout history
- PRs
- next-session targets

while remaining fast enough to use between sets.

---

# 3. Core Product Principle

havAI is first:

```text
A reliable workout tracker
```

then:

```text
A deterministic progression system
```

then:

```text
An AI-enhanced training assistant
```

AI must enhance the product.

AI must not be required for:

- logging workouts
- calculating progression
- viewing history
- detecting PRs
- recovering an active workout
- using the app offline

---

# 4. Problem Statement

Many gym-goers either:

- do not track workouts consistently
- use notes/spreadsheets manually
- use trackers that record data but do not help decide what comes next
- rely on memory for previous performance
- increase weight inconsistently
- struggle to distinguish one bad workout from a real plateau
- spend too much time navigating complicated fitness apps

Existing tracking tools often separate:

```text
logging
```

from:

```text
decision making
```

havAI should combine them.

---

# 5. Target User

Primary V1 user:

```text
A consistent recreational lifter
```

who:

- trains multiple times per week
- uses repeated exercises
- wants progressive overload
- tracks weight/reps
- may use RPE
- cares about strength and/or muscle growth
- wants a fast mobile experience
- may train in gyms with unreliable signal

---

# 6. Initial Usage Context

V1 is initially built for:

```text
personal use
```

with architecture suitable for later:

```text
external beta
public users
```

The product should not assume only one hardcoded user.

---

# 7. V1 Product Goals

havAI V1 must allow a user to:

- create an account
- configure training preferences
- browse exercises
- create custom exercises
- create workout templates
- start workouts
- log working sets
- log warm-up sets
- record weight and reps
- optionally record RPE
- see previous performance
- see the current target
- edit/delete sets
- add extra sets
- finish workouts
- recover workouts after app restart
- train without internet
- sync later
- view history
- view exercise progress
- detect PR events
- receive deterministic next-session recommendations
- understand why a recommendation was made
- ask contextual AI questions
- use AI-powered natural-language Quick Log

---

# 8. V1 Success Criteria

V1 is successful if the user can reliably complete this flow:

```text
Open App
↓
Start Push Workout
↓
Open Incline Bench
↓
Immediately See Last Session
↓
Immediately See Today's Target
↓
Log Sets in Seconds
↓
Finish Workout
↓
Receive Next Target
↓
Come Back Next Week
↓
Repeat
```

without manually calculating progression.

---

# 9. Core Product Guarantees

havAI V1 must guarantee:

```text
completed sets are not lost because internet failed

active workouts survive app restart

core workout logging works offline

AI failure never blocks training

progression logic is deterministic

recommendations are explainable

users can override recommendations

historical workouts remain stable

user data is isolated securely
```

---

# 10. Product Priorities

When tradeoffs arise, prioritize:

```text
1. workout data safety

2. fast logging

3. progression correctness

4. offline reliability

5. clear UX

6. security

7. useful AI

8. visual polish

9. speculative future features
```

---

# 11. Core V1 Feature Areas

V1 contains:

```text
Authentication

Onboarding

Home

Exercise Library

Custom Exercises

Workout Templates

Active Workout

Set Logging

Offline Recovery

Synchronization

Workout Summary

Progression Engine

Recommendations

History

Progress

PR Detection

AI Coach

Recommendation Explanation

Natural-Language Quick Log

Profile / Settings
```

---

# 12. Authentication

V1 supports:

```text
Sign Up
Log In
Log Out
Persistent Session
```

Authentication provider:

```text
Supabase Auth
```

V1 does not require:

- social login
- Apple Sign In
- Google Sign In

unless later explicitly added.

---

# 13. User Profile

Each authenticated user has one havAI profile.

Profile stores:

```text
display name optional
weight unit
primary goal
RPE preference
progression style
onboarding completion
```

---

# 14. Onboarding

Initial onboarding collects:

## Weight Unit

```text
lb
kg
```

---

## Primary Goal

```text
strength
hypertrophy
hybrid
```

---

## RPE Preference

```text
hidden
optional
preferred
```

---

## Progression Style

```text
conservative
balanced
aggressive
```

---

# 15. Onboarding Requirements

Onboarding should be:

- short
- sequential
- easy to understand
- resumable if interrupted

Do not ask for unnecessary personal information in V1.

---

# 16. Main Navigation

Authenticated app tabs:

```text
Home
Workouts
Progress
Coach
Profile
```

---

# 17. Home Screen

The Home screen should answer:

```text
What should I do right now?
```

---

# 18. Home Without Active Workout

Show:

```text
Ready to Train

Workout Templates

Recent Training / Progress context where useful
```

Primary action:

```text
Start Workout
```

---

# 19. Home With Active Workout

If a workout is active:

```text
Workout in Progress
```

becomes the dominant state.

Show:

- workout name
- elapsed time
- exercise progress
- Resume Workout

Do not encourage starting another workout.

---

# 20. Exercise Library

V1 includes a built-in exercise library.

Exercises contain:

```text
name
primary muscle
secondary muscles
equipment
measurement type
```

---

# 21. Exercise Search

User must be able to search exercises by name.

Results should update quickly.

---

# 22. Exercise Filtering

V1 should support filtering by primary muscle group.

Equipment filtering may be added if useful and low complexity.

---

# 23. Built-In Exercises

Initial production library should contain approximately:

```text
50-100 common exercises
```

covering major movements.

The app does not need every exercise ever created.

---

# 24. Custom Exercises

Users must be able to create custom exercises.

Fields:

```text
name
primary muscle
secondary muscles optional
equipment
measurement type
```

---

# 25. Custom Exercise Behavior

Custom exercises:

- belong only to the user
- can be created offline
- receive locally generated UUIDs
- can be used immediately
- can be edited
- can be archived
- remain visible in historical workouts after archival

---

# 26. Workout Templates

Users can create reusable workout templates.

Examples:

```text
Push
Pull
Legs
Upper
Lower
Chest + Back
```

---

# 27. Template Fields

Template:

```text
name
notes optional
ordered exercises
```

Each template exercise:

```text
exercise
target sets
minimum reps
maximum reps
notes optional
```

---

# 28. Template Example

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

---

# 29. Template Operations

V1 supports:

```text
Create
Edit
Duplicate
Archive/Delete from normal view
```

UI may call the action:

```text
Delete Template
```

but V1 persistence uses archival/soft-delete behavior so historical references remain safe.

---

# 30. Template Ordering

Exercises can be reordered.

Order persists.

Position semantics:

```text
0-based internally
```

---

# 31. Offline Templates

Templates must work offline.

The user must be able to:

```text
create
edit
archive
start
```

a locally stored template without internet.

---

# 32. Starting a Workout

User can start:

```text
an existing workout template
```

V1 does not require a separate fully unstructured blank-workout workflow.

Adding exercises during the workout provides flexibility.

---

# 33. Active Workout Snapshot

Starting a workout snapshots:

```text
workout name
exercise order
target sets
rep ranges
recommended target
source recommendation ID
```

Later template changes must not modify the active workout.

---

# 34. Single Active Workout

V1 allows one active workout per local user/device.

If another workout is active and user attempts to start one:

Show:

```text
Resume Workout
Discard Workout
Cancel
```

Do not silently replace it.

---

# 35. Active Workout Overview

Display:

- workout name
- elapsed time
- exercise list
- completion state
- current progress
- Finish Workout

User can jump between exercises freely.

---

# 36. Exercise Logging Screen

This is the most important V1 screen.

It should make these immediately visible:

```text
exercise name
today's target
previous performance
today's sets
```

---

# 37. Previous Performance

Example:

```text
Last time

185 × 8
185 × 7
185 × 6
```

The user should not need to open a history page while training.

---

# 38. Today's Target

Example:

```text
Today

185 lb

8 / 7 / 7
```

or:

```text
190 lb

3 × 6-8
```

Recommendation display should remain concise.

---

# 39. Set Logging

Normal working-set entry supports:

```text
weight
reps
RPE optional
```

---

# 40. Set Completion

Primary action:

```text
Complete Set
```

Logging should feel immediate.

No network spinner.

---

# 41. Weight Prefill

Where reasonable:

```text
next set weight
```

should prefill from the previous working set or current target.

Reps should remain easy to enter/change.

---

# 42. RPE

RPE is optional.

Depending on user preference:

```text
hidden
optional
preferred
```

The app must never require RPE to continue a workout.

---

# 43. Warm-Up Sets

Users can log warm-up sets.

Warm-ups:

- are stored in history
- are visibly distinguished
- do not count like working sets in progression logic

---

# 44. Extra Working Sets

Users can add sets beyond the template target.

Extra sets:

- are part of the actual workout
- do not automatically change the workout template
- can inform workout context

---

# 45. Edit Set

Completed sets can be edited.

Editable:

```text
weight
reps
RPE
```

---

# 46. Delete Set

Completed sets can be deleted with confirmation.

Offline/cloud behavior follows the sync specification.

---

# 47. Duplicate-Tap Protection

Actions such as:

```text
Complete Set
Finish Workout
Save Template
Create Custom Exercise
```

must not create duplicate records under rapid tapping.

---

# 48. Active Workout Flexibility

During a workout users may:

```text
switch exercises
add exercise
remove exercise
reorder exercises
change set load
add sets
```

These changes apply only to the active workout unless the user explicitly edits the template later.

---

# 49. Mixed Working Loads

V1 supports sets such as:

```text
190 × 6
185 × 8
185 × 7
```

The app must store what actually happened.

The progression engine may reduce confidence for irregular load patterns.

---

# 50. Workout Timer

Show elapsed workout time.

Canonical duration uses timestamps.

The timer must remain accurate after:

```text
phone lock
backgrounding
app restart
```

---

# 51. Offline Workout Requirement

A user must be able to complete the entire core workout without internet if required local data exists.

This includes:

```text
start workout
log sets
edit sets
add sets
finish workout
view summary
generate deterministic recommendation
```

---

# 52. Local Save Requirement

A set is considered successfully completed when:

```text
SQLite transaction succeeds
```

not when:

```text
Supabase responds
```

---

# 53. Offline Status

When offline:

```text
Offline · Saved on device
```

should appear subtly.

Do not interrupt the user repeatedly.

---

# 54. App Restart Recovery

If the app closes mid-workout:

```text
reopen
↓
Home
↓
Resume Workout
```

All completed sets must remain.

---

# 55. Phone Restart Recovery

Same expectation.

Active workout data must be durable.

---

# 56. Workout Completion

When user taps:

```text
Finish Workout
```

the app should:

- warn if major planned work is incomplete
- allow completion anyway
- mark workout complete locally
- calculate summary
- detect PR events
- calculate next recommendations
- display summary immediately
- sync later if necessary

---

# 57. Incomplete Workout

The user may intentionally stop early.

havAI should not force completion of every planned set.

Incomplete target completion becomes input to progression logic.

---

# 58. Workout Summary

Summary should show:

```text
duration
exercise count
working set count
exercise performance
PR events
next-session recommendations
```

---

# 59. Summary Example

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

# 60. Progression Engine

havAI's core progression feature is deterministic.

The progression engine evaluates:

```text
current target
current session
recent sessions
RPE when available
exercise characteristics
user progression style
primary goal
available load increment
```

---

# 61. Progression Outputs

Recommendation types:

```text
increase_weight
increase_reps
repeat_target
maintain_weight
decrease_weight
insufficient_data
```

Meanings are defined in `PROGRESSION_ENGINE.md`.

---

# 62. Normal Progression Model

For a weighted 3 × 6-8 exercise:

```text
185 × 6 / 6 / 6
↓
185 × 7 / 6 / 6
↓
185 × 7 / 7 / 6
↓
...
↓
185 × 8 / 8 / 8
↓
190 × 6 / 6 / 6
```

This captures progressive overload without blindly increasing weight every session.

---

# 63. One Bad Session

One poor workout should generally not cause an immediate weight reduction.

havAI should consider recent history.

---

# 64. Repeated Failure

Repeated meaningful underperformance may lead to:

```text
decrease_weight
```

or repeated target behavior according to the engine rules.

---

# 65. Plateau Detection

A plateau requires multiple comparable sessions.

havAI should not label:

```text
one repeated performance
```

as a plateau.

---

# 66. Progression Styles

V1:

```text
Conservative
Balanced
Aggressive
```

Balanced is the default.

These adjust thresholds but use the same underlying engine.

---

# 67. User Override

Recommendations are advisory.

If havAI recommends:

```text
190 lb
```

and user chooses:

```text
185 lb
```

the app records:

```text
185 lb
```

without blocking or nagging.

---

# 68. Recommendation Persistence

Recommendations are stored with:

```text
exercise
source workout
source workout exercise
recommended target
confidence
reason codes
engine version
status
```

This allows future recommendation outcome analysis.

---

# 69. Recommendation Lifecycle

Recommendation states:

```text
active
consumed
superseded
```

---

# 70. Recommendation Consumption

When a workout begins using an active recommendation:

- target is snapshotted into workout
- recommendation ID is linked
- recommendation becomes consumed as appropriate

---

# 71. Recommendation Explanation

Every recommendation must have a deterministic explanation available from reason codes.

Example:

```text
Increase to 190 lb

You reached the top of your rep range across all planned working sets.
```

This must work without AI.

---

# 72. Personal Records

havAI detects:

```text
max weight PR
estimated 1RM PR
rep PR at a specific weight
```

---

# 73. Persistent PR State

V1 persistently tracks current:

```text
max_weight
estimated_1rm
```

state.

Rep PRs are detected/derived events rather than permanent rows for every load.

---

# 74. PR Source of Truth

PRs derive from raw workout history.

If historical data changes:

```text
recalculate
```

PR state.

---

# 75. Estimated 1RM

V1 uses the Epley formula.

Use one canonical implementation throughout the product.

---

# 76. History

History allows users to view completed workouts.

Each list item should show:

```text
date
workout name
duration
exercise count
```

---

# 77. Workout Detail

Completed workout detail shows:

```text
exercises
sets
weights
reps
RPE
warm-ups
```

---

# 78. Historical Editing

V1 may allow editing historical set data.

If edited:

- raw workout history changes
- PR state recalculates
- relevant progression state recalculates

---

# 79. Historical Workout Deletion

User may delete a historical workout with confirmation.

Dependent raw rows are removed.

Affected derived state must be recalculated.

---

# 80. Progress Tab

The Progress tab should help answer:

```text
Am I getting stronger?
```

---

# 81. Progress Home

Show:

```text
recent PRs
exercise search
exercise list
```

---

# 82. Exercise Progress

For an exercise, display:

```text
current estimated 1RM
best estimated 1RM
best weight
best set
recent sessions
recent trend
```

---

# 83. Strength Trend Chart

V1 may include a simple:

```text
estimated 1RM over time
```

chart.

It should be:

- readable
- minimal
- not overloaded with analytics

---

# 84. Insufficient Progress Data

If insufficient history exists:

Say so clearly.

Do not fabricate:

```text
trend
plateau
percentage improvement
```

---

# 85. AI Product Principle

AI should answer questions using actual user context.

It should not behave like a generic fitness chatbot disconnected from havAI data.

---

# 86. AI Coach

The Coach tab allows conversational questions such as:

```text
Why did my bench stall?

Should I try 190 again?

What should I do for my next set?

Am I progressing on incline bench?
```

---

# 87. Coach Context

When relevant, Coach may use:

```text
profile preferences
active workout
current exercise
local completed sets
recent workout history
progression recommendation
trend data
```

Only relevant context should be included.

---

# 88. Coach Current Workout Awareness

If today's latest sets are not synced yet:

```text
mobile current-session context
```

may be included in the request so Coach sees current performance.

---

# 89. Coach Boundaries

Coach may:

- explain
- suggest
- interpret
- discuss workout context

Coach must not:

- directly mutate sets
- secretly change progression recommendations
- fabricate workout history

---

# 90. AI Recommendation Explanation

The recommendation card may include:

```text
Why?
```

Offline:

```text
deterministic explanation
```

Online:

```text
optional richer AI explanation
```

---

# 91. AI Explanation Authority

AI explains:

```text
the canonical recommendation
```

It does not become a second competing progression engine.

---

# 92. Natural-Language Quick Log

Natural-Language Quick Log is **included in havAI V1**.

Example:

```text
185 for 8, 7, 6, last set RPE 9
```

havAI should convert this into candidate structured sets.

---

# 93. Quick Log Flow

```text
User Types
↓
AI Parses
↓
Candidate Sets
↓
User Reviews
↓
User Edits if Needed
↓
User Confirms
↓
Normal Set Persistence
```

---

# 94. Quick Log Confirmation Requirement

AI parser output must never save automatically.

The user must confirm parsed data.

---

# 95. Quick Log Ambiguity

If input is unclear:

```text
185 8 7 maybe 9
```

the parser should surface uncertainty.

Do not invent facts.

---

# 96. Quick Log Offline Behavior

Quick Log requires internet in V1.

If offline:

```text
Quick Log needs an internet connection.

You can still enter sets manually.
```

---

# 97. AI Failure Behavior

If AI is unavailable:

```text
Coach unavailable
AI explanation unavailable
Quick Log unavailable
```

but:

```text
manual workout
progression
history
recommendation
sync
```

continue normally.

---

# 98. AI Cost Principle

AI runs only on explicit user action.

Do not automatically call AI when:

```text
logging a set
finishing workout
calculating PRs
calculating progression
syncing
opening history
```

---

# 99. Sync

havAI synchronizes locally authored data to Supabase.

V1 sync entities include:

```text
workout templates
template exercises
custom exercises
workouts
workout exercises
sets
progression recommendations
```

---

# 100. PR Sync Strategy

Persistent PR state is not an offline queue entity.

PR state derives from raw workout history.

After raw data reaches cloud:

```text
recalculate PR state
```

---

# 101. Sync UX

Normal successful syncing should be mostly invisible.

Possible statuses:

```text
Offline
Syncing
Needs Attention
```

Do not display per-set technical sync states.

---

# 102. Reconnect Behavior

When connectivity returns:

```text
push local unsynced data
↓
pull safe cloud updates
```

---

# 103. Active Workout Protection

Cloud sync must never overwrite a newer active local workout.

The local active workout snapshot remains authoritative until completion/discard.

---

# 104. Multi-Device V1 Scope

V1 is optimized primarily for:

```text
one actively used device
```

The architecture supports future expansion but does not promise sophisticated simultaneous multi-device editing.

---

# 105. Conflict Safety

If a conflict occurs:

Prioritize:

```text
preserve unsynced raw data
protect active workout
avoid silent overwrite
regenerate derived state
```

---

# 106. Profile / Settings

Profile allows changing:

```text
weight unit
primary goal
RPE preference
progression style
```

and logging out.

---

# 107. Unit Preference Change

Changing:

```text
lb → kg
```

must not rewrite stored workout history.

Only display/input representation changes.

---

# 108. RPE Preference Change

Changing RPE preference affects future logging UI.

Historical RPE values remain.

---

# 109. Progression Style Change

Changing progression style affects future recommendation behavior.

Raw historical data remains unchanged.

---

# 110. Logout Safety

If unsynced local data exists:

havAI should not silently log out and abandon it.

Offer:

```text
Cancel
Try Sync
```

---

# 111. Error Handling

Errors should explain:

```text
what happened
whether data is safe
what the user can do
```

---

# 112. Local Save Failure Example

```text
Couldn't safely save this set.

Please try again.
```

Do not show completed state.

---

# 113. Cloud Failure Example

```text
Couldn't sync yet.

Your workout is saved on this device.
```

Workout continues.

---

# 114. Empty States

Every empty state should provide an action.

Example:

```text
No workout templates yet.

Create your first workout to start tracking progression.

[Create Workout]
```

---

# 115. Design Direction

havAI should feel:

```text
dark
clean
focused
athletic
modern
```

Primary visual identity:

```text
dark gray
+
blood orange
```

---

# 116. Core Colors

From Design Spec:

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

---

# 117. Blood Orange Usage

Use for:

```text
primary CTA
active states
important workout targets
progress emphasis
```

Do not use it for every element.

---

# 118. Primary Interaction Principle

Workout logging must be usable:

```text
quickly
one-handed
between sets
```

---

# 119. One Primary Action

Each screen should have one dominant action where practical.

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

# 120. Progressive Disclosure

Secondary detail should remain available without cluttering workout flow.

Examples:

```text
Why?
View History
Details
```

---

# 121. Accessibility

Core screens/components should support:

- accessibility labels
- appropriate roles
- usable touch targets
- screen-reader ordering
- text scaling
- status not conveyed only by color

---

# 122. Performance Requirements

Set completion should feel immediate.

The user should not perceive:

```text
network latency
AI latency
cloud persistence latency
```

during normal logging.

---

# 123. Startup Requirements

Startup should prioritize:

```text
local database
auth state
active workout
local Home state
```

Cloud refresh happens afterward.

---

# 124. Workout Recovery Requirement

A completed set must survive:

```text
backgrounding
phone lock
force close
app termination
```

after local commit.

---

# 125. Security Requirements

V1 cloud data must use:

```text
Supabase Auth
RLS
```

Users must not access other users':

```text
profiles
custom exercises
templates
workouts
sets
recommendations
PR state
```

---

# 126. Parent Ownership Security

The system must reject attempts such as:

```text
User A creates a set
referencing User B workout ID
```

even if the child row contains User A's own `user_id`.

---

# 127. Secrets

The mobile application must never contain:

```text
OpenAI API key
Supabase service-role key
database password
```

---

# 128. Analytics

Product analytics is not required for personal V1.

Before broader beta, useful events may include:

```text
workout_started
set_logged
workout_completed
recommendation_viewed
coach_used
quick_log_used
```

Do not log unnecessary raw private content.

---

# 129. Crash Monitoring

Not required for initial personal use.

Recommended before broader external beta.

---

# 130. V1 Scope Exclusions

The following are explicitly out of V1:

```text
nutrition tracking

calorie tracking

meal logging

bodyweight tracking system

body measurement tracking

Apple Health integration

Apple Watch app

exercise camera/form analysis

social feed

friends/followers

leaderboards

public profiles

trainer marketplace

payments

subscriptions

automatic full workout-program generation

periodization engine

push notification coaching

web dashboard

desktop application

advanced multi-device conflict resolution

machine-learning progression
```

---

# 131. Rest Timer

A dedicated configurable rest timer is not required for V1.

The workout elapsed timer is required.

A rest timer can be considered later if real gym testing shows meaningful need.

---

# 132. Superset Support

Dedicated superset/grouping mechanics are not required for V1.

Users may still perform exercises in any order.

---

# 133. Drop Set Support

Dedicated drop-set classification is not required for V1.

Users can record mixed working loads.

Future `set_type` values may add dedicated behavior.

---

# 134. Assisted Bodyweight

Formal assisted-weight semantics are not required in V1.

A custom weighted exercise can be used as a workaround if necessary.

---

# 135. Added-Weight Bodyweight Progression

Automatic weighted pull-up/dip progression is not required in V1's bodyweight measurement mode.

A weighted custom exercise can represent the movement if the user wants external-load progression.

---

# 136. Program Generation

havAI V1 does not automatically design a full training program.

It helps progress exercises inside user-created workout templates.

This keeps V1 focused.

---

# 137. AI Programming Advice

Coach may discuss programming conceptually.

It should not automatically rewrite templates/programs without explicit user action and future product support.

---

# 138. V1 Data Model Summary

Core concepts:

```text
User Profile

Exercise
Custom Exercise

Workout Template
Workout Template Exercise

Workout
Workout Exercise
Workout Set

Progression Recommendation

Personal Record State
```

---

# 139. Raw vs Derived Product Data

Raw:

```text
workouts
sets
```

Derived:

```text
progression
PR state
metrics
trend
```

AI:

```text
explanation
interpretation
conversation
```

These must remain conceptually separate.

---

# 140. User Stories

## Authentication

> As a user, I want to create an account so my workout history can be stored securely.

---

## Onboarding

> As a user, I want to choose pounds or kilograms so the app matches how I train.

---

## Template

> As a user, I want to create a Push workout once so I can reuse it every week.

---

## Offline Template

> As a user, I want my templates to still work when the gym has poor reception.

---

## Custom Exercise

> As a user, I want to create an exercise havAI does not already contain.

---

## Previous Performance

> As a user, I want to instantly see what I did last time so I do not need to remember it.

---

## Set Logging

> As a user, I want to log a set in seconds without waiting for the internet.

---

## Recovery

> As a user, I want my workout to survive if I accidentally close the app.

---

## Progression

> As a user, I want havAI to tell me whether I should add weight, add reps, repeat the target, or back off.

---

## Explanation

> As a user, I want to know why havAI made that recommendation.

---

## Override

> As a user, I want to ignore havAI's recommendation without the app fighting me.

---

## History

> As a user, I want to review past workouts.

---

## Progress

> As a user, I want to see whether an exercise is improving over time.

---

## Coach

> As a user, I want to ask questions about my actual recent training.

---

## Quick Log

> As a user, I want to type "185 for 8, 7, 6" and have havAI prepare those sets for confirmation.

---

# 141. Primary User Journey

```text
SIGN UP
   ↓
ONBOARD
   ↓
CREATE TEMPLATE
   ↓
START WORKOUT
   ↓
VIEW PREVIOUS PERFORMANCE
   ↓
VIEW TARGET
   ↓
LOG SETS
   ↓
FINISH WORKOUT
   ↓
VIEW SUMMARY
   ↓
RECEIVE NEXT TARGET
   ↓
VIEW PROGRESS
```

---

# 142. AI User Journey

```text
ACTIVE WORKOUT
   ↓
OPEN COACH
   ↓
ASK QUESTION
   ↓
HAVAI LOADS RELEVANT CONTEXT
   ↓
AI RESPONDS
   ↓
USER RETURNS TO WORKOUT
```

---

# 143. Quick Log Journey

```text
ACTIVE EXERCISE
   ↓
QUICK LOG
   ↓
TYPE NATURAL LANGUAGE
   ↓
AI PARSES
   ↓
PREVIEW
   ↓
CONFIRM
   ↓
SETS SAVE LOCALLY
```

---

# 144. Offline User Journey

```text
OPEN HAVAI
   ↓
START LOCAL TEMPLATE
   ↓
LOSE NETWORK
   ↓
LOG SETS
   ↓
LOCK PHONE
   ↓
RETURN
   ↓
FINISH
   ↓
VIEW RECOMMENDATION
   ↓
RECONNECT
   ↓
SYNC
```

The workout must remain intact throughout.

---

# 145. V1 Acceptance Scenario

A representative V1 scenario:

User opens Push.

Previous Incline Bench:

```text
185 × 8
185 × 7
185 × 6
```

havAI target:

```text
185
8 / 7 / 7
```

User performs:

```text
185 × 8
185 × 8
185 × 7
```

havAI records immediately.

After workout:

```text
Next target:
185
8 / 8 / 8
```

At a later session:

```text
185 × 8 / 8 / 8
```

havAI recommends:

```text
190
6 / 6 / 6
```

This progression should work without AI.

---

# 146. Personal V1 Release Criteria

Before havAI becomes the user's primary workout tracker:

- no known data-loss bug
- no duplicate-set sync bug
- active workout recovery proven
- offline set logging proven
- offline workout completion proven
- offline recommendation persistence proven
- template offline behavior proven
- custom exercise offline behavior proven
- progression golden tests pass
- previous-performance UI is fast/useful
- recommendation UI is understandable
- real gym testing is completed

---

# 147. External Beta Requirements

Before inviting external users:

- separate production Supabase
- RLS security tests pass
- parent ownership security tested
- authentication hardened
- cloud migrations reviewed
- AI endpoints authorize resources
- OpenAI secrets server-side
- crash monitoring considered/implemented
- migration upgrade testing
- broader iPhone testing
- sync failure UX polished

---

# 148. Product Metrics for Future Beta

Useful later:

```text
workouts completed per user
workout completion rate
sets per workout
recommendation usage rate
recommendation override rate
Coach usage
Quick Log usage
sync failure rate
```

Not necessary for personal V1.

---

# 149. Recommendation Quality Future Metric

Because recommendations are linked to later workouts, havAI can eventually calculate:

```text
recommendation success rate
```

Example:

```text
havAI recommended 190 lb

Did the user successfully perform the target?
```

This is future analytics, not V1 adaptive ML.

---

# 150. Product Evolution

Potential later versions may add:

```text
rest timers
supersets
advanced set types
program blocks
periodization
body metrics
Apple Health
wearables
automatic program design
adaptive personalization
social features
```

These should be driven by real usage, not added preemptively.

---

# 151. V1 Definition of Done

havAI V1 is complete when a user can:

```text
Create Account
↓
Complete Onboarding
↓
Create Custom Exercise
↓
Create Workout Template
↓
Start Workout
↓
See Previous Performance
↓
See Current Target
↓
Log Working and Warm-Up Sets
↓
Edit/Delete Sets
↓
Train Offline
↓
Recover After App Restart
↓
Finish Workout
↓
See Summary
↓
Receive Deterministic Recommendation
↓
Understand Why
↓
Sync Later
↓
Review History
↓
Review Exercise Progress
↓
Ask Context-Aware AI Questions
↓
Use Natural-Language Quick Log
↓
Change Preferences
```

without compromising:

```text
data durability
progression determinism
offline operation
security
historical integrity
```

---

# 152. Final Product Principle

havAI should not try to be every fitness app at once.

V1 should win on a very specific loop:

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

If the user can walk into the gym, immediately know what they did last time, immediately know what to target today, record each set without friction, and leave knowing what to attempt next time, havAI V1 has succeeded.

Everything else is secondary.
