# havAI V1 User Flow Specification

## 1. Purpose

This document defines the expected user journeys and navigation behavior for havAI V1.

It focuses on:

- entry into the app
- authentication
- onboarding
- main navigation
- workout template creation
- custom exercise creation
- starting a workout
- active workout navigation
- set logging
- offline behavior
- workout recovery
- workout completion
- progression recommendations
- history
- progress
- AI Coach
- recommendation explanations
- natural-language Quick Log
- profile/settings
- error and edge-case flows

The goal is to make the app predictable, fast, and difficult to misuse.

---

# 2. User Flow Principles

havAI user flows should optimize for:

```text
speed
clarity
low cognitive load
recoverability
offline safety
```

During a workout, the user should rarely be more than one or two interactions away from the action they need.

---

# 3. Primary Product Loop

The core havAI loop is:

```text
Open App
↓
Start Workout
↓
See Previous Performance
↓
See Today's Target
↓
Log Sets
↓
Finish Workout
↓
See Summary
↓
Receive Next Recommendation
↓
Return Next Session
```

Everything else supports this loop.

---

# 4. Navigation Model

Authenticated main navigation:

```text
Home
Workouts
Progress
Coach
Profile
```

These appear as the primary bottom tabs.

---

# 5. Root Routing Flow

```text
APP LAUNCH
   ↓
LOAD LOCAL DATABASE
   ↓
RESOLVE AUTH SESSION
   ↓
┌─────────────────────────────┐
│ Authenticated?              │
└────────────┬────────────────┘
             │
       ┌─────┴─────┐
       │           │
      NO          YES
       │           │
       ▼           ▼
   AUTH FLOW   LOAD PROFILE
                   │
                   ▼
           Onboarding complete?
               │          │
              NO         YES
               │          │
               ▼          ▼
          ONBOARDING   MAIN APP
```

Active workout restoration happens as part of authenticated app startup and must not wait for cloud refresh.

---

# 6. First-Time User Flow

```text
Launch App
↓
Welcome
↓
Create Account
↓
Account Created
↓
Profile Ensured
↓
Onboarding
↓
Main App
↓
Home
```

---

# 7. Returning User Flow

```text
Launch App
↓
Restore Session
↓
Load Profile
↓
Restore Local Workout State
↓
Main App
```

If active workout exists:

```text
Home
↓
Workout in Progress
↓
Resume Workout
```

If no active workout:

```text
Home
↓
Ready to Train
```

---

# 8. Welcome Screen Flow

Screen:

```text
Welcome to havAI
```

Primary actions:

```text
Create Account
Log In
```

Flow:

```text
Create Account
→ Signup

Log In
→ Login
```

No carousel or multi-page marketing flow is required.

---

# 9. Signup Flow

```text
Signup
↓
Enter Email
↓
Enter Password
↓
Confirm Password
↓
Validate
↓
Submit
↓
Supabase Auth
```

If successful:

```text
Ensure Profile
↓
Onboarding
```

If failed:

```text
Remain on Signup
↓
Show Inline Error
↓
Preserve Entered Email
```

---

# 10. Login Flow

```text
Login
↓
Enter Email
↓
Enter Password
↓
Validate
↓
Submit
```

If successful:

```text
Ensure Profile
↓
Check Onboarding
```

If onboarding incomplete:

```text
Onboarding
```

If complete:

```text
Home
```

---

# 11. Ensure Profile Flow

After successful authentication:

```text
Fetch Profile
↓
Exists?
```

If yes:

```text
Continue
```

If no:

```text
Create Default Incomplete Profile
↓
Continue
```

Profile initialization requires an authenticated session. A missing session produces the
sanitized application error `no_authenticated_session`.

The incomplete profile starts with provisional `lb` and `hybrid` selections, optional RPE,
balanced progression, a 120-second default rest duration, and onboarding incomplete. The compact
setup replaces the provisional weight unit and primary goal with explicit user selections before
marking onboarding complete.

This process must be idempotent.

---

# 12. Onboarding Flow

Sequence:

```text
Compact Setup Screen
  Weight Unit
  Primary Goal
↓
Start Training
↓
Save Profile with advanced defaults
↓
Home
```

Defaults are `rpe_preference = optional` and `progression_style = balanced`. These are changed later at `Profile → Training Preferences`, not during onboarding.

---

# 13. Compact Setup: Weight Unit

Screen:

```text
How do you measure weight?
```

Options:

```text
Pounds (lb)
Kilograms (kg)
```

User selects one.

# 14. Compact Setup: Primary Goal

Screen:

```text
What's your main training goal?
```

Options:

```text
Strength
Muscle Growth
Both
```

Stored internally as:

```text
strength
hypertrophy
hybrid
```

---

# 15. Start Training Flow

The weight-unit and primary-goal controls appear together. `Start Training` is disabled until both are valid. On activation, persist both selections, apply the advanced defaults, mark onboarding complete, and route to Home. No tutorial, tour, extra screen, or additional required question intervenes.

---

# 16. Advanced Preference Location

RPE preference and progression style remain editable under:

```text
Profile
↓
Training Preferences
```

They are not first-run steps.

---

# 17. Interrupted Onboarding Flow

If the app closes during onboarding:

```text
Reopen
↓
Restore Session
↓
Profile onboarding_completed = false
↓
Return to Onboarding
```

The user should not be sent into the main app with an incomplete required profile.

---

# 18. Main App Flow

```text
Home
Workouts
Progress
Coach
Profile
```

Tabs remain available except where a modal/full-screen workout flow temporarily sits above them.

---

# 19. Home Screen, No Active Workout

Screen should present:

```text
Ready to Train
```

Primary content:

```text
Workout Templates
```

Possible secondary content:

```text
Recent Workout
Recent PR
Progress Snapshot
```

Primary action:

```text
Start Workout
```

---

# 20. Home Template Start Flow

```text
Home
↓
Select Template
↓
Start Workout
```

If no active workout exists:

```text
Create Active Workout Snapshot
↓
Workout Overview
```

---

# 21. Active Workout Already Exists

If user tries to start another workout:

```text
Active Workout Exists
↓
Show Choice
```

Options:

```text
Resume Workout
Discard Current Workout
Cancel
```

---

# 22. Resume Existing Workout

```text
Resume Workout
↓
Restore Local Active Workout
↓
Active Workout Overview
```

No network requirement.

---

# 23. Discard Current Workout

```text
Discard Workout
↓
Confirmation
```

Confirmation should make clear that unsaved active workout data will be discarded.

If confirmed:

```text
Mark/Delete Local Active Workout State
↓
Queue Remote Cleanup if Needed
↓
Allow New Workout
```

---

# 24. Workouts Tab Flow

Default:

```text
Workouts
↓
Template List
```

Actions:

```text
Create Workout
Open Template
Start Template
```

---

# 25. Empty Workouts State

If no templates exist:

```text
No workouts yet.

Create your first workout to start tracking progression.

[Create Workout]
```

---

# 26. Create Workout Template Flow

```text
Workouts
↓
Create Workout
↓
Template Editor
```

Fields:

```text
Workout Name
Notes optional
Exercise List
```

Primary CTA:

```text
Save Workout
```

---

# 27. Empty Template Editor Flow

Initial editor:

```text
Workout Name
↓
Add Exercise
```

User cannot save until:

```text
name exists
AND
at least one exercise exists
```

---

# 28. Add Exercise to Template Flow

```text
Template Editor
↓
Add Exercise
↓
Exercise Picker
```

Exercise Picker supports:

```text
Popular
Favorites
Muscle Groups
Search
Built-In Exercises
Custom Exercises
```

Popular uses a system-curated or deterministic V1 order. Favorites are user-specific, available offline once saved, and synchronize later. Muscle Groups uses the canonical taxonomy and prioritizes Chest, Back, Shoulders, Biceps, Triceps, Quads, Hamstrings, Glutes, Calves, and Core.

---

# 29. Exercise Picker Selection Flow

```text
Select Exercise
↓
Exercise Configuration Sheet
```

Configure:

```text
Target Sets
Minimum Reps
Maximum Reps
Notes optional
```

Then:

```text
Add to Workout
```

Returns to:

```text
Template Editor
```

---

# 30. Create Custom Exercise Entry Points

User may create a custom exercise from:

```text
Exercise Library
Exercise Picker
```

Both should lead to the same creation flow.

---

# 31. Create Custom Exercise Flow

```text
Create Custom Exercise
↓
Enter Name
↓
Select Primary Muscle
↓
Select Secondary Muscles optional
↓
Select Equipment
↓
Select Measurement Type
↓
Save
```

---

# 32. Custom Exercise Success Flow

After save:

```text
Exercise Saved Locally
```

If creation was started from Exercise Picker:

```text
Return to Picker
↓
New Exercise Selected or Available
```

If from Exercise Library:

```text
Return to Library
↓
New Exercise Visible
```

No internet requirement.

---

# 33. Custom Exercise Offline Flow

```text
No Internet
↓
Create Custom Exercise
↓
Save Locally
↓
Use Immediately
↓
Sync Later
```

The user should not be blocked or told to wait for cloud creation.

---

# 34. Edit Custom Exercise Flow

```text
Exercise Detail
↓
Edit
↓
Modify Fields
↓
Save
```

Only user-created exercises are editable.

Built-in system exercises are read-only.

---

# 35. Archive Custom Exercise Flow

```text
Exercise Detail
↓
Archive/Delete
↓
Confirm
↓
Archive Locally
```

Result:

```text
Hidden from normal picker
Still shown in historical workouts
```

---

# 36. Template Exercise Reordering Flow

```text
Template Editor
↓
Drag Exercise
↓
New Position
↓
Persist Order
```

Reordering should not require opening each exercise.

---

# 37. Edit Template Flow

```text
Workouts
↓
Open Template
↓
Edit
```

User may change:

```text
name
notes
exercise order
exercise target settings
exercise list
```

Save updates only the template.

Past workouts remain unchanged.

---

# 38. Duplicate Template Flow

```text
Template
↓
Duplicate
↓
Create New Template Copy
↓
Open New Template
```

Copied:

```text
name
notes
exercise order
exercise targets
```

New IDs are generated.

---

# 39. Delete Template UX

UI may say:

```text
Delete Template
```

Flow:

```text
Delete Template
↓
Confirm
↓
Archive Internally
↓
Return to Template List
```

Historical workouts remain intact.

---

# 40. Start Workout Flow

From:

```text
Home
or
Workouts
```

User taps:

```text
Start
```

System:

```text
Check Active Workout
↓
Snapshot Template
↓
Snapshot Recommendations
↓
Create Local Workout
↓
Create Local Workout Exercises
↓
Queue Sync
↓
Open Active Workout
```

---

# 41. Starting Workout Offline

If template exists locally:

```text
Offline
↓
Start Workout
↓
Works Normally
```

No cloud confirmation required.

---

# 42. Active Workout Overview Flow

Screen contains:

```text
Workout Name
Elapsed Time
Exercise List
Completion Progress
Finish Workout
```

Each exercise row shows useful state such as:

```text
0/3 sets
2/3 sets
Complete
```

---

# 43. Exercise Selection During Workout

```text
Workout Overview
↓
Tap Exercise
↓
Exercise Logging Screen
```

User can return to Overview at any time.

---

# 44. Exercise Logging Screen Flow

Primary screen structure:

```text
Exercise Name

Today's Target

Last Time

Today's Sets

Set Entry

Complete Set
```

---

# 45. Today's Target Flow

Possible target display:

```text
190 lb
3 × 6-8
```

or:

```text
185 lb
8 / 7 / 7
```

User does not need to interact with target to log the set.

---

# 46. Previous Performance Flow

Display recent comparable session:

```text
Last Time

185 × 8
185 × 7
185 × 6
```

If no previous data:

```text
No previous performance yet.
```

Do not fabricate comparison.

---

# 47. Set Entry Flow

Normal path:

```text
Prefilled Weight with quick +/- controls
↓
Reps with [-] and [+] controls
↓
RPE optional
↓
Set note optional
↓
Complete Set
```

Weight may be prefilled.

Pound quick adjustments support ±5, ±10, ±25, and ±45; kilogram adjustments support ±2.5, ±5, ±10, and ±20. The exact UI may reveal larger increments compactly. Manual numeric weight and rep entry remains available, and weight persists in canonical kilograms.

---

# 48. Complete Set Flow

```text
Tap Complete Set
↓
Validate Input
↓
Save to SQLite
↓
Queue Sync
↓
Local Commit Success?
```

If yes:

```text
Mark Set Complete
↓
Haptic Feedback
↓
Start Rest Timer for working set
↓
Show brief Undo action
↓
Prepare Next Set Entry
```

If no:

```text
Do Not Mark Complete
↓
Show Storage Error
```

The rest timer starts only after the local commit succeeds. It runs independently and never blocks logging or navigation. A timer failure does not change the completed set.

---

# 48A. Undo Set Completion Flow

During the brief Undo window:

```text
Tap Undo
↓
Restore pre-completion entry state
↓
Revert local set mutation transactionally
```

If the set has not synchronized, remove or coalesce its pending mutation. If it already synchronized, use the normal tombstone/delete or safe update path. No destructive confirmation is shown for this immediate reversal. Undo does not make the rest timer authoritative over workout data.

---

# 48B. Rest Timer Flow

The timer supports start, pause, resume, reset, add time, and dismiss. Its default duration comes from Training Preferences, with an optional per-exercise override. It uses an end timestamp plus paused remaining duration so phone lock/backgrounding does not depend on foreground ticks. The user may log another set at any time. On completion, provide haptic, sound, or notification feedback where platform state and permissions make that appropriate.

---

# 49. Complete Set Cloud Failure

Cloud sync may fail after local success.

Flow:

```text
Local Set Saved
↓
Cloud Sync Fails
↓
Set Remains Complete
↓
Sync Status Updates
↓
Workout Continues
```

---

# 50. Next Set Prefill Flow

After completing a working set:

```text
Next Set
↓
Prefill Previous/Target Weight
↓
Reps Blank
↓
RPE Blank
```

This reduces repetitive input.

---

# 51. Warm-Up Set Flow

```text
Exercise Screen
↓
Add Warm-Up Set
↓
Enter Weight/Reps/RPE optional
↓
Complete
```

Displayed with a clear warm-up label.

Warm-up does not count toward normal working-set progression.

---

# 52. Extra Set Flow

After planned sets:

```text
Add Set
↓
New Working Set
↓
Log Normally
```

The template remains unchanged.

---

# 53. Edit Completed Set Flow

```text
Tap Completed Set
↓
Edit Sheet/Screen
↓
Change Weight/Reps/RPE
↓
Save
```

Then:

```text
Update SQLite
↓
Queue Latest Upsert
↓
Refresh Display
```

---

# 54. Delete Completed Set Flow

```text
Tap Completed Set
↓
Delete
↓
Confirm
```

If never synced:

```text
Remove Local Set
↓
Remove Pending Upsert
```

If previously synced:

```text
Hide/Tombstone Locally
↓
Queue Delete
```

---

# 55. Rapid Double-Tap Flow

If user taps Complete Set rapidly:

```text
First Tap
↓
Action Locks
↓
Second Tap Ignored
```

Exactly one set should be created.

---

# 56. RPE Hidden Flow

If:

```text
RPE Preference = hidden
```

the normal logging UI should not show RPE input.

---

# 57. RPE Optional Flow

If:

```text
RPE Preference = optional
```

show RPE unobtrusively.

Set can complete without it.

---

# 58. RPE Preferred Flow

If:

```text
RPE Preference = preferred
```

RPE should be easy/prominent to enter.

Still not strictly required.

---

# 59. Exercise Switching Flow

From exercise screen:

```text
Next Exercise
Previous Exercise
Overview
```

User may jump freely.

No enforced workout order.

---

# 60. Add Exercise During Workout

```text
Workout Overview
↓
Add Exercise
↓
Exercise Picker
↓
Select Exercise
↓
Configure Session Target
↓
Add
```

Result:

```text
Active Workout Updated
```

Template does not change automatically.

---

# 61. Remove Exercise During Workout

If no completed sets:

```text
Remove
↓
Confirm if appropriate
↓
Remove from Active Session
```

If completed sets exist:

```text
Remove
↓
Strong Confirmation
```

User should understand recorded sets may also be removed from that workout.

---

# 62. Reorder Exercise During Workout

```text
Workout Overview
↓
Reorder
↓
Move Exercise
↓
Persist Current Session Order
```

Template remains unchanged.

---

# 63. Mixed Working Load Flow

User may log:

```text
190 × 6
185 × 8
185 × 7
```

The UI should accept this normally.

No warning is needed merely because loads differ.

Progression may later show lower confidence.

---

# 64. Workout Timer Flow

```text
Workout Started
↓
startedAt Persisted
↓
UI Displays Elapsed Time
```

If backgrounded:

```text
Return
↓
Elapsed Time Recomputed
```

If app reopened:

```text
Restore startedAt
↓
Elapsed Time Correct
```

---

# 65. Phone Lock During Workout

```text
Lock Phone
↓
App Suspended
↓
Unlock
↓
Return to Active Workout
```

Completed sets remain.

Timer remains correct.

---

# 66. App Background Flow

```text
Leave havAI
↓
App Backgrounded
↓
Return Later
↓
Restore Active Workout State
```

No assumption of guaranteed background sync.

---

# 67. Force-Close Recovery Flow

```text
Active Workout
↓
Force Close App
↓
Launch havAI
↓
Open SQLite
↓
Find Active Workout
↓
Home Shows Workout in Progress
↓
Resume
```

---

# 68. Phone Restart Recovery Flow

Same as force-close.

SQLite persists active workout.

---

# 69. Offline During Workout Flow

```text
Network Lost
↓
Offline Banner Appears
↓
Workout Continues Normally
```

User can still:

```text
log
edit
delete
switch
finish
```

core workout data.

---

# 70. Offline Banner

Display:

```text
Offline · Saved on device
```

It should be visible but not disruptive.

---

# 71. Network Reconnect Flow

```text
Network Returns
↓
Sync Triggered
↓
Push Local Changes
↓
Pull Safe Cloud Changes
```

If successful:

```text
Offline Banner Disappears
```

---

# 72. Persistent Sync Failure Flow

```text
Sync Repeatedly Fails
↓
Show Non-Blocking Warning
```

Message:

```text
Some data hasn't synced yet.

Your workout is safely saved on this device.

[Retry]
```

---

# 73. Sync Failure During Active Workout

Do not open a blocking modal.

User continues training.

---

# 74. Finish Workout Flow

```text
Active Workout
↓
Finish Workout
```

System checks for incomplete planned work.

---

# 75. Finish Workout With All Planned Work Complete

```text
Finish Workout
↓
Complete Immediately
```

System:

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
Queue Sync
↓
Summary Screen
```

---

# 76. Finish Workout With Incomplete Work

Show confirmation:

```text
You still have planned sets/exercises remaining.

Finish anyway?
```

Actions:

```text
Keep Training
Finish Workout
```

Do not block completion permanently.
There is no dedicated Skip Exercise state or flow; incomplete planned work simply remains incomplete.

---

# 77. Workout Summary Flow

After completion:

```text
Workout Complete
```

Show:

```text
Duration
Working Sets
Exercise Results
PR Events
Next Targets
```

Primary CTA:

```text
Done
```

---

# 78. Summary Offline Flow

If offline:

```text
Workout Complete

Saved on this device · Will sync when online
```

Recommendations should still display if locally generated.

---

# 79. PR Event Flow

If a PR is detected:

Show a concise highlight.

Examples:

```text
New Weight PR

New Estimated 1RM PR

Rep PR
```

Do not interrupt workout completion with a separate mandatory flow.

---

# 80. Progression Recommendation Flow

After workout:

```text
Current Session
+
Recent History
↓
Progression Engine
↓
Recommendation
```

Possible results:

```text
Increase Weight
Increase Reps
Repeat Target
Maintain Weight
Decrease Weight
Insufficient Data
```

---

# 81. Increase Reps Flow

Example:

```text
Last Target:
185 × 8 / 7 / 6

Next:
185 × 8 / 7 / 7
```

User sees same load with a higher explicit rep target.

---

# 82. Increase Weight Flow

Example:

```text
185 × 8 / 8 / 8
```

becomes:

```text
190 lb
3 × 6-8
```

---

# 83. Repeat Target Flow

Example:

```text
Target:
185 × 8 / 8 / 8

Actual:
185 × 8 / 7 / 7
```

Next:

```text
185 × 8 / 8 / 8
```

---

# 84. Maintain Weight Flow

Used where same load is appropriate but precise rep-step progression is not justified.

Example:

```text
190 × 6
185 × 8
185 × 7
```

Recommendation may show:

```text
Stay at your current working weight range
Target 6-8 reps
```

---

# 85. Decrease Weight Flow

If repeated evidence warrants it:

```text
Reduce Load
```

UI should explain without judgment.

Example:

```text
Drop to 185 lb and rebuild within 6-8 reps.
```

---

# 86. Insufficient Data Flow

Show:

```text
Not enough history yet to recommend a change.
```

Then show the template/current baseline target where appropriate.

Do not invent precision.

---

# 87. Recommendation Card

Should show:

```text
Next Time

190 lb
3 × 6-8

[Why?]
```

---

# 88. Deterministic Why Flow

```text
Recommendation
↓
Tap Why?
↓
Show Basic Explanation
```

Example:

```text
You reached the top of your target rep range across all planned working sets.
```

Works offline.

---

# 89. AI-Enhanced Why Flow

If online:

```text
Basic Explanation
↓
Optional AI Explanation
```

or the screen may fetch richer explanation automatically after opening.

AI failure should fall back to deterministic explanation.

---

# 90. Recommendation Override Flow

At the next workout:

```text
Recommendation says 190
↓
User enters 185
↓
Complete Set
```

Result:

```text
185 is stored
```

No confirmation required.

---

# 91. Recommendation Consumption Flow

When starting a workout using an active recommendation:

```text
Recommendation Target
↓
Snapshot into Workout Exercise
↓
Link sourceRecommendationId
↓
Recommendation Marked Consumed
```

If offline, this occurs locally and syncs later.

---

# 92. History Tab Entry

History may be accessed from:

```text
Workouts
Progress
or relevant detail navigation
```

depending on final UI.

Primary history flow:

```text
History List
↓
Workout Detail
```

---

# 93. Workout History List

Each item shows:

```text
Date
Workout Name
Duration
Exercise Count
```

Loaded incrementally/paginated.

---

# 94. Workout Detail Flow

```text
Select Workout
↓
Workout Detail
```

Show:

```text
Workout Name
Date
Duration
Exercises
Sets
Warm-Ups
RPE
Workout note
Set notes where present
```

---

# 95. Historical Set Edit Flow

```text
Workout Detail
↓
Tap Set
↓
Edit
↓
Save
```

Then:

```text
Update Raw History
↓
Queue Sync
↓
Recalculate Affected PR State
↓
Recalculate Affected Recommendation
```

---

# 96. Historical Workout Delete Flow

```text
Workout Detail
↓
Delete Workout
↓
Confirm
```

Then:

```text
Delete Raw Workout
↓
Recalculate Affected Derived State
↓
Return to History
```

---

# 97. Progress Tab Flow

```text
Progress
↓
Recent PRs
+
Exercise List/Search
```

---

# 98. Exercise Progress Flow

```text
Progress
↓
Select Exercise
↓
Exercise Progress Screen
```

Show:

```text
Current e1RM
Best e1RM
Best Weight
Best Set
Recent Trend
Recent Sessions
Show Graph (optional control)
```

---

# 99. Insufficient Progress History

If too little data:

```text
Train this exercise a few more times to build a meaningful trend.
```

Do not show fake charts or percentages.

---

# 100. Exercise Progress Chart Flow

The normal Progress screen remains useful without a graph. The user may select:

```text
Show Graph
```

to reveal the simple:

```text
Estimated 1RM Over Time
```

No interaction beyond basic readability is required in V1. Points come only from real workout history; do not interpolate fake continuity. If the offline history window is incomplete, label the limited scope rather than implying complete lifetime history.

---

# 101. Coach Tab Flow

```text
Coach
↓
Initial Prompt Screen
```

Show suggested prompts such as:

```text
Why did my bench stall?

Should I increase weight next time?

How is my incline bench progressing?
```

---

# 102. Coach Question Flow

```text
Type Question
↓
Send
↓
Validate
↓
Call Edge Function
↓
Load Relevant Context
↓
AI Response
↓
Conversation Continues
```

---

# 103. Coach During Active Workout

From active exercise/workout:

```text
Ask Coach
↓
Coach Opens With Active Context
```

Coach receives:

```text
current exercise
current local completed sets
current target
recent cloud history
profile preferences
```

---

# 104. Coach Offline Flow

If offline:

```text
Coach requires an internet connection.
```

User can return immediately to workout.

---

# 105. Coach Failure Flow

If provider fails:

```text
Coach is unavailable right now.

Your workout is unaffected.

[Retry]
```

---

# 106. Natural-Language Quick Log Entry

Entry point should be available from the active exercise logging screen.

Example action:

```text
Quick Log
```

---

# 107. Quick Log Flow

```text
Tap Quick Log
↓
Text Input
↓
Enter:
"185 for 8, 7, 6, last set RPE 9"
↓
Parse
↓
Candidate Preview
```

---

# 108. Quick Log Preview

Display parsed rows such as:

```text
Set 1
185 lb × 8

Set 2
185 lb × 7

Set 3
185 lb × 6 @ 9 RPE
```

Actions:

```text
Edit
Confirm
Cancel
```

---

# 109. Quick Log Confirmation

```text
Confirm
↓
Convert Weight to Canonical kg
↓
Use Normal Set Persistence
↓
Save Locally
↓
Queue Sync
```

AI does not bypass normal set logic.

---

# 110. Quick Log Ambiguity Flow

If parser returns ambiguity:

```text
I wasn't sure whether "9" meant 9 reps or RPE 9.
```

User must resolve ambiguity before confirmation.

---

# 111. Quick Log Offline Flow

If offline:

```text
Quick Log needs an internet connection.

You can still enter sets manually.
```

Return user to manual logging.

---

# 112. Profile Tab Flow

```text
Profile
↓
Training Preferences
Account
Diagnostics optional/dev only
Logout
```

---

# 113. Change Weight Unit Flow

```text
Profile
↓
Units
↓
Select lb / kg
↓
Save
```

Effect:

```text
Display changes immediately
Stored kg data unchanged
```

---

# 114. Change Primary Goal Flow

```text
Profile
↓
Primary Goal
↓
Select
↓
Save
```

Affects future progression context.

Historical raw data remains unchanged.

---

# 115. Change RPE Preference Flow

```text
Profile
↓
RPE Preference
↓
Select
↓
Save
```

Future workout UI updates.

Historical RPE remains.

---

# 116. Change Progression Style Flow

```text
Profile
↓
Progression Style
↓
Select
↓
Save
```

Future recommendation behavior updates.

Existing raw history remains.

---

# 116A. Change Default Rest Duration Flow

```text
Profile → Training Preferences
↓
Default Rest Duration
↓
Save positive duration
```

Future working-set completions use the new default unless the exercise has a user-specific override. Changing it never changes workout data.

---

# 116B. Persistent Exercise Preference Flow

From an exercise detail or relevant picker action, the user may toggle Favorite, edit a persistent personal note, and optionally set/clear a rest-duration override. Save locally first, update immediately offline, and synchronize later. System exercise fields remain unchanged.

---

# 116C. Workout Note Flow

From the active workout overview, add/edit/clear an optional workout note. Persist it locally on the workout, synchronize normally, and display it in workout detail/history.

---

# 117. Logout With No Pending Data

```text
Logout
↓
No Unsynced Data
↓
Sign Out
↓
Welcome
```

---

# 118. Logout With Pending Data

```text
Logout
↓
Pending Local Data Detected
↓
Warning
```

Show:

```text
Some workout data hasn't synced yet.

[Cancel]
[Try Sync]
```

Do not silently abandon pending data.

---

# 119. Try Sync Before Logout

```text
Try Sync
↓
Sync Success?
```

If yes:

```text
Logout
```

If no:

```text
Remain Signed In
↓
Explain Data Is Still Safe Locally
```

---

# 120. Authentication Expires During Workout

```text
Workout Active
↓
Auth Refresh Fails
↓
Workout Continues Locally
```

User can:

```text
log
edit
finish
view summary
```

Cloud sync pauses.

---

# 121. Reauthentication Flow

Later:

```text
Authentication Required
↓
Log In
↓
Same Account Confirmed
↓
Resume Sync
```

Local workout data remains.

---

# 122. Startup Offline With Existing Usable Session

```text
Launch Offline
↓
Cached Session Usable
↓
Open Local App
↓
Restore Active Workout / Home
```

Cloud refresh waits.

---

# 123. Startup Offline Without Usable Session

```text
Launch Offline
↓
No Usable Session
↓
Show:
"Connect to the internet to sign in."
```

---

# 124. System Exercise Detail Flow

```text
Exercise Library
↓
Select System Exercise
↓
Exercise Detail
```

Show:

```text
name
muscle groups
equipment
measurement type
history/progress entry when available
```

No Edit action.

---

# 125. Custom Exercise Detail Flow

Same as system detail, plus:

```text
Edit
Archive
```

---

# 126. No Previous Session Flow

During active exercise:

```text
Last Time

No previous session yet.
```

Today's template/initial target remains visible.

---

# 127. No Recommendation Flow

If no active recommendation exists:

Show:

```text
Today's Target
```

from template baseline.

Do not show an empty recommendation card pretending AI has analyzed something.

---

# 128. Recommendation Insufficient Data Flow

If engine returns:

```text
insufficient_data
```

display:

```text
Keep building history

havAI needs more comparable sessions before recommending a progression change.
```

---

# 129. Mixed-Load Recommendation Flow

If engine returns:

```text
maintain_weight
```

because session used mixed loads:

Show general guidance.

Example:

```text
Stay around your current working weight.

Your sets used different loads, so havAI is keeping the target broad for now.
```

---

# 130. Bodyweight Max Flow

Example:

```text
Pull-Ups
3 × 8-12

12 / 12 / 12
```

Recommendation:

```text
Repeat 12 / 12 / 12
```

Explanation:

```text
You've reached the top of the configured rep range. Added-weight progression isn't automatic for this exercise in V1.
```

---

# 131. App Error Principles

Whenever possible, errors answer:

```text
What happened?

Is my data safe?

What should I do?
```

---

# 132. Local Storage Failure Flow

```text
Complete Set
↓
SQLite Failure
```

Show:

```text
Couldn't safely save this set.

Please try again.
```

Set remains incomplete.

---

# 133. Cloud Sync Failure Flow

```text
Local Save Succeeded
↓
Cloud Sync Failed
```

Show only if useful:

```text
Couldn't sync yet.

Your workout is saved on this device.
```

---

# 134. Invalid Input Flow

Examples:

```text
negative reps
invalid RPE
empty template name
max reps below min reps
```

Show inline validation.

Do not send invalid data to persistence layer.

---

# 135. Exercise Search No Results

```text
No exercises found.
```

If applicable:

```text
[Create Custom Exercise]
```

---

# 136. History Empty State

```text
No completed workouts yet.

Finish your first workout to start building history.
```

---

# 137. Progress Empty State

```text
No progress data yet.

Complete workouts to start tracking strength trends.
```

---

# 138. Coach Empty State

Instead of a blank chat screen:

```text
Ask havAI about your training.
```

Show suggested prompts.

---

# 139. Loading Principles

Avoid blocking full-screen loaders when local data can render immediately.

Example startup:

```text
Render Local Home
↓
Refresh Cloud in Background
```

---

# 140. Active Workout Loading Rule

Never hide an available local active workout behind:

```text
Loading cloud data...
```

---

# 141. Destructive Confirmation Principle

Require explicit confirmation for:

```text
discard active workout
delete historical workout
delete completed set
archive custom exercise
delete/archive template
```

Do not add confirmations to normal low-risk actions.

---

# 142. Back Navigation During Template Editing

If no unsaved changes:

```text
Back
↓
Leave
```

If unsaved changes:

```text
Back
↓
Discard Changes?
```

Options:

```text
Keep Editing
Discard
```

---

# 143. Back Navigation During Active Workout

Back navigation should normally return to:

```text
Workout Overview
```

not abandon the workout.

---

# 144. Closing Active Workout Screen

Leaving the active workout flow does not end the workout.

The user may navigate back through the app and resume later.

---

# 145. App Tab Navigation During Workout

The user may access:

```text
Coach
Profile
Progress
```

where navigation design permits.

Home must continue showing:

```text
Workout in Progress
```

---

# 146. Recommendation Card Why Offline

```text
Tap Why?
↓
Show Deterministic Explanation Immediately
```

No spinner required for basic explanation.

---

# 147. Recommendation Card Why Online

Optional flow:

```text
Show Basic Explanation
↓
Load AI Enhancement
↓
Replace/Append Rich Explanation
```

If AI fails:

```text
Keep Basic Explanation
```

---

# 148. History Pagination Flow

```text
Open History
↓
Load First Page
↓
Scroll
↓
Load More
```

Do not fetch entire lifetime history at once.

---

# 149. Progress History Loading

Exercise Progress may load:

```text
recent cached data first
↓
cloud history if online
```

The UI should not misrepresent partial cache as complete all-time truth.

---

# 150. Offline Progress Flow

If cached data exists:

```text
Show Available Recent Progress
```

If all-time metrics are not trustworthy offline:

```text
Some historical data may be unavailable offline.
```

Only show this if necessary.

---

# 151. Sync Conflict User Flow

Advanced multi-device conflict resolution is not a normal V1 UX.

If a meaningful conflict is detected:

- preserve local dirty data
- avoid automatic destructive overwrite
- surface a controlled warning if resolution is required

Do not expose technical conflict internals during normal use.

---

# 152. Dirty Template Conflict Flow

If remote change conflicts with unsynced local template:

```text
Preserve Local Version
↓
Do Not Overwrite
↓
Log/Flag Conflict
```

V1 may defer full resolution UI.

---

# 153. Active Workout Conflict Flow

If cloud contains conflicting active state:

```text
Protect Current Local Workout
```

Do not merge sets automatically.

---

# 154. Sync Status Normal Flow

Normal online state:

```text
No visible sync indicator
```

unless currently syncing or there is a problem.

---

# 155. Syncing Flow

A subtle state may appear:

```text
Syncing...
```

No interaction should be blocked.

---

# 156. Successful Sync Feedback

A temporary:

```text
Synced
```

message is optional.

Avoid unnecessary toast spam.

---

# 157. Developer Debug Flow

Development-only hidden entry may show:

```text
Environment
User ID
Active Workout
Pending Queue
Network
Last Sync
AI Provider
Progression Engine Version
```

---

# 158. Force Sync Debug Flow

Development only:

```text
Debug
↓
Force Sync
↓
Run Sync Engine
↓
Show Result
```

---

# 159. Simulate Offline Debug Flow

Development only:

```text
Debug
↓
Simulate Offline
↓
App Behaves As Offline
```

Useful for gym testing before real dead-zone conditions.

---

# 160. User Flow Priority

If two flows conflict, favor the one that:

```text
protects data
reduces gym friction
preserves offline behavior
keeps user control
```

---

# 161. Primary Gym Flow Target

A typical set interaction should look like:

```text
Unlock Phone
↓
havAI Already on Active Exercise
↓
Enter Reps
↓
Tap Complete Set
↓
Lock Phone
```

If the weight is unchanged and prefilled, this should take only a few seconds.

---

# 162. Minimal Interaction Goal

Normal set logging should not require:

```text
opening menus
choosing the exercise again
confirming cloud save
opening history
asking AI
```

between every set.

---

# 163. One-Handed Use Goal

The most common controls should be reachable with one thumb.

Especially:

```text
reps input
RPE input
Complete Set
next exercise/navigation
```

---

# 164. User Flow Definition of Done

The V1 flows are complete when a user can:

- create an account
- complete onboarding on one compact two-field screen
- reopen without repeated onboarding
- create custom exercises
- create templates
- create both while offline
- edit templates
- archive templates
- start a template offline
- prevent accidental second active workout
- see previous performance
- adjust weight and reps without requiring the keyboard
- see today's target
- log working sets
- log warm-ups
- add extra sets
- edit/delete sets
- undo an accidental set completion briefly
- use the non-blocking automatic rest timer
- save persistent exercise, workout, and set notes
- browse Popular, Favorites, Muscle Groups, and Search
- move between exercises freely
- add/remove/reorder exercises during a workout
- close and reopen the app without losing progress
- finish incomplete workouts intentionally
- finish fully offline
- see workout summary
- see PR events
- receive deterministic recommendations
- understand recommendation reasons offline
- override recommendations freely
- sync later
- view history
- edit/delete historical data
- view exercise progress
- optionally reveal the real-history e1RM graph
- ask Coach questions
- use Coach during an active workout
- use Quick Log with confirmation
- fall back to manual logging offline
- safely change preferences
- avoid logging out with unsynced data accidentally
- recover from cloud/AI failures without losing the workout

---

# 165. Final User Flow Principle

havAI should feel like the app is following the lifter, not forcing the lifter to follow the app.

The ideal active-workout experience is:

```text
SEE
↓
LOG
↓
TRAIN
```

not:

```text
NAVIGATE
↓
CONFIGURE
↓
WAIT
↓
CONFIRM
↓
TRAIN
```

Every flow should preserve the user's momentum in the gym while keeping the underlying data safe.
