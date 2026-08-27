# havAI V1 Design Specification

## 1. Design Objective

havAI should feel like a workout tool, not a spreadsheet and not a chatbot.

The interface must prioritize:

- speed
- one-handed use
- minimal typing
- immediate visual feedback
- clear hierarchy
- low cognitive load
- excellent readability in a gym environment
- fast access to previous performance
- obvious next actions
- consistency across every workout screen

The user should be able to operate the primary workout experience while:

- standing
- moving between machines
- holding a water bottle
- tired
- sweaty
- distracted
- resting between sets
- using the phone with one hand

The design should therefore favor large targets, short interactions, strong contrast, and predictable placement over dense information.

---

# 2. Design Personality

havAI should feel:

- serious
- modern
- athletic
- precise
- confident
- technical without looking clinical
- premium without looking flashy

It should not feel:

- cartoonish
- overly gamified
- neon
- cyberpunk
- like a bodybuilding supplement website
- like a generic AI application
- like an Excel spreadsheet
- like a social network

The interface should communicate:

> Train. Log. Progress.

---

# 3. Color Direction

Primary visual identity:

```text
Dark Gray
+
Blood Orange
```

The application should be designed primarily as a dark-mode experience.

Dark mode should be the default for V1.

---

# 4. Core Color Palette

## App Background

```text
Background Primary
#111315
```

Very dark charcoal.

This should replace pure black.

Purpose:

- app background
- large screen areas
- behind navigation
- primary dark canvas

---

## Surface

```text
Surface Primary
#191C1F
```

Used for:

- cards
- exercise rows
- inputs
- panels
- sections

---

## Elevated Surface

```text
Surface Elevated
#22262A
```

Used for:

- selected cards
- modals
- bottom sheets
- popovers
- highlighted containers

---

## Border

```text
Border Default
#30353A
```

Used sparingly.

Avoid outlining every container.

Borders should mostly separate functional regions when spacing alone is insufficient.

---

# 5. Blood Orange

Primary accent:

```text
Blood Orange
#FF4F1F
```

This becomes havAI's recognizable brand color.

Use it for:

- primary CTA buttons
- active navigation states
- progression indicators
- selected controls
- active workout status
- key numbers
- sliders/toggles where appropriate
- loading/accent states
- branding

Blood orange should feel energetic without becoming fluorescent.

---

## Blood Orange Pressed

```text
#E74316
```

Used while pressing primary controls.

---

## Blood Orange Soft

```text
rgba(255, 79, 31, 0.14)
```

Used for:

- selected backgrounds
- recommendation cards
- subtle highlighted sections
- active chips

Example:

```text
┌──────────────────────────┐
│ TODAY'S TARGET           │
│                          │
│ 190 LB                   │
│ 6-8 reps                 │
└──────────────────────────┘
```

Instead of making the entire card orange, use a dark card with orange typography/accent.

---

# 6. Text Colors

## Primary Text

```text
#F5F6F7
```

Used for:

- exercise names
- primary numbers
- headings
- important information

---

## Secondary Text

```text
#A4ABB2
```

Used for:

- labels
- descriptions
- dates
- secondary metrics

---

## Muted Text

```text
#70777F
```

Used for:

- placeholders
- disabled information
- tertiary metadata

Muted text should never be used for important workout information.

---

# 7. Semantic Colors

Blood orange is the brand color and should not be overloaded as an error state.

Use separate semantic colors.

## Success

```text
#36C786
```

Uses:

- completed sets
- successful sync
- positive confirmation

---

## Warning

```text
#F6B94A
```

Uses:

- unsynced data
- incomplete workout
- caution states

---

## Error

```text
#F05A62
```

Uses:

- invalid input
- destructive actions
- failed sync
- authentication errors

---

## Informational

Prefer neutral gray or blood-orange accent rather than introducing a dominant blue visual identity.

---

# 8. Color Usage Rule

Target approximate interface balance:

```text
80% dark neutrals
15% text / secondary neutrals
5% blood orange
```

Blood orange should feel important because it is relatively rare.

Avoid:

```text
orange card
inside orange section
with orange icons
and orange buttons
```

Instead:

```text
dark surface
+
white information
+
one orange focal point
```

---

# 9. Typography

Use the system font on iOS.

Recommended:

```text
SF Pro
```

React Native should generally rely on platform-native/system typography rather than bundling unnecessary custom fonts in V1.

The interface should use weight and size for hierarchy rather than excessive color changes.

---

# 10. Typography Scale

## Display Number

Used for critical workout values.

Examples:

```text
185
8
190 LB
```

Recommended:

```text
32-40 pt
Bold / Semibold
```

---

## Screen Title

```text
28 pt
Bold
```

Example:

```text
Push
Progress
Incline Bench
```

---

## Section Heading

```text
13-14 pt
Semibold
Uppercase optional
Letter spacing subtle
```

Example:

```text
TODAY'S TARGET
LAST SESSION
TODAY
```

---

## Exercise Name

```text
17-18 pt
Semibold
```

---

## Body

```text
15-16 pt
Regular
```

---

## Metadata

```text
13-14 pt
Regular / Medium
```

---

## Button

```text
16-17 pt
Semibold
```

---

# 11. Numerical Typography

Numbers are extremely important in havAI.

Weight, reps, RPE, and targets should visually dominate surrounding labels.

Example:

```text
185
LB
```

should visually prioritize:

```text
185
```

not `LB`.

Where supported, use tabular numerals for tables/set rows so numbers remain visually aligned.

---

# 12. Spacing System

Use an 8-point-based spacing system.

Primary values:

```text
4
8
12
16
24
32
40
```

Avoid arbitrary values unless required by a component.

---

# 13. Screen Margins

Primary horizontal page padding:

```text
16 px
```

Larger content sections may use:

```text
20 px
```

but the application should remain consistent.

---

# 14. Corner Radius

havAI should use moderately rounded corners.

Recommended:

```text
Small controls: 8 px
Inputs: 10 px
Cards: 12 px
Large panels: 16 px
Bottom sheets: 20-24 px top corners
```

Avoid excessive pill-shaped containers.

Pills should primarily be used for:

- filters
- small status indicators
- segmented options

---

# 15. Touch Targets

Minimum interactive target:

```text
44 × 44 pt
```

Prefer larger for workout actions.

Primary workout controls should target approximately:

```text
48-56 pt
```

height.

The user should not have to precisely tap tiny icons while training.

---

# 16. Buttons

## Primary Button

Example:

```text
START WORKOUT
COMPLETE SET
FINISH WORKOUT
```

Style:

```text
Blood-orange background
Dark/near-black text
Full or near-full width
48-56 px high
Semibold
10-12 px radius
```

Primary actions should be unmistakable.

---

## Secondary Button

Style:

```text
Elevated dark surface
White text
No orange fill
```

Example:

```text
Add Set
View History
```

---

## Tertiary Button

Text/button style.

Example:

```text
Cancel
Dismiss
Why?
```

Use orange text only if the action deserves emphasis.

---

## Destructive Button

Never use blood orange.

Use semantic error red.

Examples:

```text
Delete Workout
Discard Workout
```

---

# 17. Iconography

Use a single consistent icon library.

Prefer simple line icons.

Icons must not replace text when meaning could be unclear.

Good:

```text
trash icon + Delete Workout
```

Less desirable:

```text
trash icon alone
```

for important actions.

---

# 18. Bottom Navigation

V1 tabs:

```text
Home
Workouts
Progress
Coach
Profile
```

Visual behavior:

Inactive:

```text
muted gray icon
muted gray label
```

Active:

```text
blood-orange icon
primary text or blood-orange label
```

Do not use a large orange background behind the selected tab.

The bottom navigation should remain visually quiet.

---

# 19. Active Workout Navigation

When a workout is active, the user should enter a focused workout experience.

Normal bottom navigation should be minimized or removed from the main active-workout screen.

Instead provide:

```text
Back
Workout title
Elapsed time
More/options
```

and persistent access to:

```text
Workout Overview
Finish Workout
```

The active workout should feel like a mode.

---

# 20. Home Screen Design

The Home screen's job is not to show everything.

Its job is to answer:

> What do I do now?

Priority order:

```text
1. Resume current workout
2. Start workout
3. Recommended/likely workout
4. Recent performance
```

---

# 21. Home Without Active Workout

Suggested layout:

```text
HAVAI                          Profile

Good evening

READY TO TRAIN?

┌────────────────────────────┐
│ PUSH                       │
│ 6 exercises                │
│                            │
│ Last: Aug 10               │
│                            │
│          Start Workout →   │
└────────────────────────────┘

QUICK START

[ Push ] [ Pull ] [ Legs ]

RECENT PROGRESS

Incline Bench
185 × 8
↑ +2 total reps
```

Do not overload Home with dashboards.

---

# 22. Home With Active Workout

This state should become extremely obvious.

Example:

```text
WORKOUT IN PROGRESS

PUSH
32 min

3 of 6 exercises

████████░░░░

[ RESUME WORKOUT ]
```

The Resume button should be the strongest CTA on the screen.

---

# 23. Workout Template Cards

Template cards should show only immediately useful information.

Example:

```text
PUSH

6 exercises
Last completed Aug 10

Incline Bench • Flat DB Bench • +4

[ Start ]
```

Do not display every exercise in the card.

---

# 24. Active Workout Overview

The overview should show the entire workout at a glance.

Example:

```text
PUSH                         42:18

3 / 6 exercises

✓ Incline Bench
  3 sets completed

✓ Flat DB Bench
  3 sets completed

● Cable Fly
  2 / 3 sets

○ Lateral Raise
○ Tricep Pushdown

+ Add Exercise

[ FINISH WORKOUT ]
```

Statuses:

```text
✓ completed
● currently active
○ not started
```

Use semantic colors sparingly.

---

# 25. Exercise Logging Screen

This is the most important screen in the application.

Recommended hierarchy:

```text
← PUSH                     42:18

Incline Bench Press

TODAY'S TARGET

190 LB
6-8 reps

Target: +1 total rep vs last time

LAST SESSION

185 × 8
185 × 8
185 × 7

TODAY

SET     WEIGHT     REPS     RPE

1       190        7        9
2       190        _        _
3       190        _        _


[ COMPLETE SET ]

+ Add Set
```

The user should understand the entire state in approximately one second.

---

# 26. Today's Target Card

The recommendation should visually stand apart without becoming distracting.

Recommended:

```text
dark elevated surface
thin orange left accent
```

Example:

```text
┃ TODAY'S TARGET

  190 LB

  6-8 reps

  ↑ Increase from 185

  Why?
```

Do not make this entire component bright orange.

---

# 27. Previous Session

Previous workout data must be visible without opening another screen.

Example:

```text
LAST SESSION

SET     WEIGHT     REPS
1       185        8
2       185        8
3       185        7
```

The current workout should visually dominate more than historical data.

History should use secondary text and slightly lower contrast.
If no comparable session exists, show a truthful empty state and do not manufacture values.

---

# 28. Set Rows

Set rows should be optimized for extremely fast scanning.

Example:

```text
1     185     8     8.5     ✓
2     185     7     9       ✓
3     185     _     _
```

Columns should remain aligned.

Avoid placing each set in a giant individual card.

This wastes vertical space.

---

# 29. Active Set

The current set should have subtle emphasis.

Possible treatment:

```text
slightly elevated background
orange left indicator
```

Do not animate aggressively.

---

# 30. Completed Set

Completed sets should immediately look finished.

Potential state:

```text
checkmark
normal white values
subtle success indicator
```

Avoid turning the whole row green.

---

# 31. Weight Input

Weight entry must be fast.

Recommended interaction:

```text
[-5]    185    [+5]
```

with the number itself tappable for keyboard entry.

For pounds:

Compact quick adjustments support:

```text
±5  ±10  ±25  ±45 lb
```

For kilograms:

```text
±2.5  ±5  ±10  ±20 kg
```

The smallest common increment may remain visible while larger increments use an expandable compact control. The displayed value remains tappable for manual numeric entry. Conversion occurs at the display boundary; persistence remains canonical kilograms.

---

# 32. Rep Input

Reps should be optimized for quick entry.

Possible UI:

```text
[-]    8    [+]
```

Number remains directly editable.

Because users commonly enter only a one or two digit value, a numeric keypad should open immediately when manual entry is selected.

---

# 33. Smart Prefill Behavior

When moving to the next set:

Weight:

```text
prefill previous set weight
```

Rep field:

```text
blank or intelligently suggested
```

RPE:

```text
blank
```

Never force users to retype the same weight three times.

---

# 34. Keyboard Behavior

Numeric entry should use numeric keyboards wherever appropriate.

The keyboard must never hide:

```text
Complete Set
```

without an obvious way to dismiss it.

Where possible:

```text
Done
Next
```

keyboard actions should move intelligently between fields.

---

# 35. RPE Interaction

RPE should not require typing.

Preferred UI:

```text
6  6.5  7  7.5  8  8.5  9  9.5  10
```

But showing all values simultaneously may be crowded.

Recommended solution:

tap RPE field:

```text
bottom sheet
```

with large selectable values.

Example:

```text
How hard was the set?

6      7      8
8.5    9      9.5
10

10 = Maximum effort
```

The exact layout should remain one-handed.

---

# 36. Complete Set Interaction

`Complete Set` should remain in a predictable location.

Ideally near the bottom safe area.

When tapped:

1. validate and save locally
2. only after the SQLite commit succeeds, show completed state
3. provide light haptic feedback
4. start the independent rest timer for a working set
5. expose a brief Undo action
6. advance focus to the next set
7. sync asynchronously

The app should not show a loading spinner just to save a normal set.

---

# 37. Haptic Feedback

Use haptics sparingly.

Recommended:

### Light

- adjusting weight
- changing reps
- selecting RPE

### Medium

- completing a set

### Success

- finishing workout
- meaningful PR

Avoid haptic feedback for every navigation tap.

---

# 38. Set Completion Feedback

After completing:

```text
185 × 8
```

a small inline feedback message may appear:

```text
+1 rep vs last session
```

or:

```text
Matched last session
```

Display for approximately a few seconds or until next interaction.

Do not trigger a modal.

---

# 39. PR Feedback

During workout:

```text
NEW REP PR
185 × 9
```

Should appear as a compact celebratory banner.

Example:

```text
🏆 New Rep PR · 185 × 9
```

No confetti in V1.

No full-screen interruption.

The user is still training.

---

# 40. Rest Timer

The automatic rest timer is included in V1 and starts only after a working-set SQLite commit succeeds.

Potential placement after completing a set:

```text
REST
2:14
```

This should never interfere with logging.

Controls:

```text
pause / resume
reset
add time
dismiss
```

The user may navigate, edit, or complete another set while it runs. The visual state derives from timestamps so backgrounding or phone lock does not depend on foreground ticks. Completion feedback uses haptic, sound, or notification where appropriate. Timer errors remain unobtrusive and never imply a workout-data failure.

---

# 40A. Set Completion Undo

After a successful completion, show a compact non-modal message:

```text
Set completed                     Undo
```

Undo is available briefly, restores the pre-completion inputs, and does not show the destructive-delete confirmation used for later deletion.

---

# 41. Exercise Switching

Users must be able to quickly jump between exercises.

Workout overview should always be one gesture/tap away.

Potential interaction:

```text
tap workout title
↓
exercise list bottom sheet
```

Example:

```text
Push

✓ Incline Bench
● Flat DB Bench
○ Cable Fly
○ Lateral Raise
○ Tricep Pushdown
```

Tap another exercise to switch immediately.

This is important when gym equipment is occupied.

---

# 42. Add Exercise During Workout

`+ Add Exercise` should open an exercise picker.

Picker structure:

```text
Search exercises...

[ Popular ] [ Favorites ] [ Muscle Groups ]

POPULAR
Incline Bench
Cable Row

MUSCLE GROUPS
Chest · Back · Shoulders · Biceps · Triceps
Quads · Hamstrings · Glutes · Calves · Core
```

Search should receive focus immediately when tapped.
Popular is curated or deterministically ordered, not social analytics. A favorite control is available on system and custom exercise rows and works from local state.

---

# 43. Exercise Search

Search results should show:

```text
Exercise name
Primary muscle
Equipment
```

Example:

```text
Incline Bench Press
Chest · Barbell
```

The exercise name should dominate.

---

# 44. Exercise Filters

Filters should use horizontal chips.

Example:

```text
[ All ] [ Chest ] [ Back ] [ Legs ] [ Shoulders ]
```

Do not build complicated nested filtering for V1.

Search is more important than filters.

---

# 44A. Notes in Training

The active exercise screen shows a user-owned persistent exercise note near the exercise name or target when present, for example `Seat 4 · Bench notch 3`. It must be visually distinct from structured targets and must not look like a global exercise instruction.

Workout notes are optional and accessible from the active workout overview, then shown in workout detail/history. A set note is optional in set entry/editing and remains progressively disclosed so the common logging path stays compact. Present user-authored notes as notes, not measured facts or progression signals.

---

# 45. Template Creation

Template editing does not need to be as compressed as workout logging.

Suggested:

```text
EDIT WORKOUT

Push

Incline Bench
3 sets · 6-8 reps
☰

Flat DB Bench
3 sets · 8-10 reps
☰

Cable Fly
3 sets · 10-15 reps
☰

+ Add Exercise

[ SAVE WORKOUT ]
```

Drag handles should clearly indicate reorder ability.

---

# 46. Template Exercise Editing

Tap an exercise row.

Open bottom sheet:

```text
Incline Bench

Sets
[-] 3 [+]

Rep Range

Min
6

Max
8

Notes
Optional

[ Save ]
```

Do not navigate through multiple screens for simple changes.

---

# 47. Bottom Sheets

Use bottom sheets extensively for:

- RPE selection
- exercise settings
- workout actions
- template exercise configuration
- filters
- confirmation when appropriate

Why:

- thumb-friendly
- maintains context
- avoids excessive screen transitions

---

# 48. Modals

Use full modals only when:

- creating something substantial
- destructive confirmation requires focus
- authentication requires it

Avoid modal overload.

---

# 49. Destructive Actions

Destructive actions should be visually separated from normal actions.

Example bottom sheet:

```text
Edit Exercise
Move Exercise
Remove from Workout

----------------

Delete Exercise
```

Delete uses red.

Blood orange should never indicate destruction.

---

# 50. Workout Completion

`Finish Workout` should not look like `Complete Set`.

Complete Set:

```text
blood orange
```

Finish Workout may initially be:

```text
dark secondary button
```

until tapped.

Then confirmation bottom sheet:

```text
Finish workout?

15 working sets
5 exercises
1h 04m

2 planned exercises incomplete

[ Finish Workout ]
[ Keep Training ]
```

The final Finish Workout button can use blood orange.

---

# 51. Workout Summary

Workout summary should feel rewarding without becoming game-like.

Example:

```text
WORKOUT COMPLETE

Push
1h 04m

15 working sets
5 exercises

PROGRESS

Incline Bench
+2 total reps

Flat DB Bench
New rep PR

NEXT TARGETS

Incline Bench
185 → 190 lb

Cable Fly
Keep 35 lb
Aim for 12+
```

Orange should emphasize:

```text
progress
next targets
```

---

# 52. Progress Screen

Avoid a dashboard filled with tiny cards.

Focus on:

```text
Select Exercise
↓
See useful progression
```

Home state:

```text
PROGRESS

Recent PRs

Incline Bench
185 × 9

Squat
315 × 3

EXERCISE PROGRESS

Search exercises...
```

---

# 53. Exercise Progress Detail

Suggested hierarchy:

```text
Incline Bench Press

ESTIMATED 1RM

234 LB
↑ 8 lb over 30 days

[ Show Graph ]

BEST SET

185 × 9

BEST WEIGHT

205 lb

RECENT SESSIONS
```

Avoid displaying ten different metrics simultaneously.

---

# 54. Charts

Charts should be:

- simple
- high contrast
- minimally labeled
- useful
- optional and user-revealed with `Show Graph`

For the strength trend:

```text
dark background
muted grid lines
blood-orange trend line
white key values
```

Do not add unnecessary gradients or 3D effects.
The initial V1 series is Estimated 1RM Over Time. Plot only real history points, do not draw invented continuity, and label a limited offline history window honestly. The screen must remain useful without revealing the graph.

The chart should answer:

> Am I getting stronger?

not:

> How much data can we fit here?

---

# 55. Coach Screen

The Coach tab should visually belong to havAI.

Do not make it look like a generic ChatGPT clone.

Initial state:

```text
HAVAI COACH

What do you want to know?

[ What should I focus on today? ]

[ Why has my incline bench stalled? ]

[ How has my squat progressed? ]

Ask havAI...
```

Conversation layout may still use message bubbles, but the focus should be training context.

---

# 56. Coach During Workout

When accessed inside a workout, use a bottom sheet or focused overlay rather than leaving the workout completely.

Header:

```text
havAI Coach

Incline Bench · Current Workout
```

This reinforces that the AI understands the current context.

---

# 57. AI Loading State

Never display:

```text
Thinking...
```

for a prolonged blank page.

Show context:

```text
Reviewing your recent incline bench sessions...
```

or:

```text
Analyzing today's sets...
```

This communicates what the system is doing.

---

# 58. AI Response Design

AI responses should be concise by default.

Recommended structure:

```text
KEEP 190 LB

Your first set was 190 × 6 @ RPE 10, which suggests the load is already near your current limit.

For set 2:
• Rest at least 3 minutes
• Aim for 5-6 clean reps
• Drop to 185 if form breaks down
```

The recommendation should visually appear before explanation.

Do not display giant paragraphs.

---

# 59. AI Recommendation vs Deterministic Recommendation

The UI must distinguish:

```text
HAVAI TARGET
```

from:

```text
COACH ANALYSIS
```

The progression engine remains the source of structured targets.

AI explains/advises.

This prevents users from assuming every value was invented by the LLM.

---

# 60. Loading Skeletons

When retrieving history or templates, use subtle skeleton states.

Avoid large centered spinners whenever possible.

A centered spinner is acceptable for:

```text
initial authentication
```

but not routine screen navigation.

---

# 61. Empty States

Empty states should always tell the user what to do next.

Bad:

```text
No workouts.
```

Good:

```text
No workouts yet

Create your first workout so you can start tracking progression.

[ Create Workout ]
```

---

# 62. Offline State

Do not use disruptive alerts when connectivity disappears.

Use a subtle status:

```text
Offline · Workout saved locally
```

Possible location:

top status banner.

Color:

warning, but muted.

The user should keep training normally.

---

# 63. Pending Sync

Example:

```text
Syncing...
```

or:

```text
1 workout waiting to sync
```

Should be informational.

Only escalate if data has remained unsynced for an unusually long period or the user attempts to log out.

---

# 64. Errors

Errors should explain:

1. what happened
2. whether data is safe
3. what the user should do

Example:

```text
Couldn't sync workout

Your workout is saved on this device.

[ Retry ]
```

Far better than:

```text
Error 500
```

---

# 65. Form Validation

Validation should occur inline.

Example:

```text
Reps
[-]

Enter reps to complete the set.
```

Do not wipe valid input because one field is invalid.

---

# 66. Animation

Motion should be subtle.

Recommended:

```text
150-250 ms
```

for most UI transitions.

Useful animation:

- bottom sheet opening
- set row completing
- card selection
- progress changes
- small PR banner

Avoid:

- bouncing
- exaggerated scaling
- spinning icons
- constant pulsing
- decorative animation during workouts

---

# 67. Accessibility

Accessibility is required even for the initial personal build.

Design requirements:

- minimum 44pt touch targets
- high text contrast
- dynamic text support where practical
- icons should have labels/accessibility descriptions
- color must not be the only indicator of status
- controls should retain logical reading order
- text should not be embedded in images

---

# 68. One-Handed Reachability

Frequently used controls should live primarily in:

```text
middle
and
lower portion
```

of the screen.

Examples:

```text
Complete Set
Add Set
Next Exercise
RPE
Weight controls
Rep controls
```

Important but infrequent controls may remain near the top:

```text
Close
Options
Workout overview
```

---

# 69. Thumb-Zone Rule

During active workouts, avoid putting critical frequent actions exclusively in the top-right corner.

Primary interaction zone:

```text
lower 60% of screen
```

This is especially important on larger iPhones.

---

# 70. Information Density

havAI should be information-rich but not visually dense.

Use:

```text
spacing
typographic hierarchy
alignment
```

instead of wrapping every piece of information inside separate containers.

Example:

Prefer:

```text
SET   WEIGHT   REPS   RPE

1     185      8      8
2     185      7      9
3     185      6      10
```

over:

```text
[ Set 1 card ]
[ Set 2 card ]
[ Set 3 card ]
```

---

# 71. Data Priority

During a workout, prioritize information in this order:

```text
1. What exercise am I doing?
2. What should I attempt?
3. What did I do last time?
4. What have I done today?
5. What should I enter next?
6. Why is this recommended?
7. Historical analysis
```

The screen hierarchy must reflect this order.

---

# 72. Progressive Disclosure

Do not show advanced information until requested.

Example:

Default:

```text
TARGET
190 lb · 6-8 reps
```

User taps:

```text
Why?
```

Then sees:

```text
You completed 185 × 8/8/8 last session...
```

This keeps the main experience clean.

---

# 73. Default vs Advanced User

havAI should support serious lifters without making every screen feel complicated.

Default workout logging:

```text
weight
reps
```

Optional:

```text
RPE
warm-up set
extra set
history
AI coaching
```

Advanced functionality should remain accessible but secondary.

---

# 74. Onboarding Design

Onboarding is one compact setup screen and should take well under approximately one minute.

Example:

```text
WHAT DO YOU LIFT IN?

[ LB ]

[ KG ]

PRIMARY GOAL

[ BUILD MUSCLE ]
[ GET STRONGER ]
[ BOTH ]

[ START TRAINING ]
```

No carousel.

No tutorial explaining every feature.

Do not request RPE preference or progression style here. Their defaults are Optional and Balanced, and both are editable later under Profile → Training Preferences.

Users should learn the app through normal use.

---

# 75. App Icon Direction

Future app icon should use:

```text
very dark gray background
blood-orange mark
```

Potential concepts:

- stylized upward progression line
- minimal barbell combined with upward indicator
- abstract `G`
- stacked plates forming progression

Avoid:

- flexing arm emoji aesthetic
- detailed bodybuilder silhouettes
- flame clichés
- generic robot heads

Brand identity should communicate training + progression rather than "AI."

---

# 76. Brand Priority

The app itself should emphasize:

```text
progression first
AI second
```

The interface should not have:

```text
AI
AI
AI
AI
```

everywhere.

The user is here to lift better.

AI is infrastructure behind the experience.

---

# 77. Recommended Screen Structure

Primary screens for V1:

```text
AUTH

Welcome
Create Account
Login

ONBOARDING

Compact Setup

HOME

Home

WORKOUTS

Templates
Template Detail
Template Editor
Exercise Library
Create Exercise
Workout History
Workout Detail

ACTIVE WORKOUT

Workout Overview
Exercise Logging
Exercise History
Add Exercise
Finish Confirmation
Workout Summary

PROGRESS

Progress Home
Exercise Progress

COACH

Coach Home
Coach Conversation

PROFILE

Profile
Training Preferences
Account Settings
```

---

# 78. Reusable Component Library

Cursor should build reusable UI components rather than styling every screen independently.

Minimum component set:

```text
Screen
AppHeader
SectionHeader

PrimaryButton
SecondaryButton
TextButton
IconButton

Card
MetricCard
RecommendationCard

ExerciseRow
WorkoutTemplateCard
WorkoutHistoryRow

SetRow
SetInputRow
WeightInput
RepInput
RPEInput

Chip
FilterChip
SegmentedControl

TextInput
SearchInput

BottomSheet

EmptyState
ErrorState
OfflineBanner
SyncIndicator

PRBanner

ProgressChart

CoachMessage
CoachPromptChip
```

---

# 79. Design Tokens

All colors, spacing, radii, typography, and common component dimensions must live in centralized design tokens.

Example conceptual structure:

```text
theme/
├── colors
├── spacing
├── typography
├── radius
├── sizing
└── shadows
```

Do not hard-code:

```text
#FF4F1F
```

in twenty different components.

Use something such as:

```text
colors.accent.primary
```

This allows the visual system to evolve without rewriting the app.

---

# 80. Shadow Usage

Dark interfaces should not depend heavily on shadows.

Prefer:

```text
surface contrast
borders
spacing
```

If shadows are used:

- subtle
- only for elevated elements
- primarily bottom sheets/modals

---

# 81. Visual Hierarchy Rule

Each screen should have exactly one obvious primary action.

Examples:

Home:

```text
Start Workout
```

Template editor:

```text
Save Workout
```

Active exercise:

```text
Complete Set
```

Workout overview:

```text
Continue / current exercise
```

Workout completion:

```text
Finish Workout
```

Avoid competing full-width orange buttons.

---

# 82. Interaction Rule

Common actions should always behave the same way.

Examples:

```text
tap row
→ details

tap +
→ add

swipe/back
→ previous screen

orange button
→ primary action

red action
→ destructive
```

Consistency is more important than cleverness.

---

# 83. Workout Logging Performance Goal

The design should enable the following interaction:

```text
Set finished
↓
Unlock phone
↓
Enter reps
↓
Complete Set
↓
Lock phone
```

in approximately a few seconds when weight is unchanged.

If it takes multiple screens or excessive taps, the design has failed.

During an active workout, the common case uses as few interactions as reasonably possible. Prefer prefilled values, one-handed +/- controls, large touch targets, minimal keyboard use, and immediate local feedback. Avoid unnecessary confirmations, modal-heavy logging, network-dependent UI, and configuration during training. When suggested weight and reps are already correct, completing a set should ideally require only `Complete Set`.

---

# 84. Ideal Set Entry Scenario

Previous set:

```text
185 × 8
```

Next set defaults:

```text
Weight
185

Reps
_

RPE
_
```

User does:

```text
tap reps
→ 7
→ Complete Set
```

That's roughly the ideal interaction.

---

# 85. Visual Example

Conceptual active workout screen:

```text
‹ PUSH                              42:18


Incline Bench Press


┃ TODAY'S TARGET

  190 LB

  6-8 reps

  ↑ Increase from 185        Why?


LAST SESSION

Set        Weight       Reps

1          185          8
2          185          8
3          185          7


TODAY

Set        Weight       Reps       RPE

✓ 1        190          7          9

  2        190          _          _

  3        190          _          _



              + Add Set


┌────────────────────────────────┐
│         COMPLETE SET           │
└────────────────────────────────┘
```

The screen should not contain unnecessary graphics.

---

# 86. Visual Example: Home

```text
HAVAI


Good evening


READY TO TRAIN?

┌────────────────────────────────┐
│ PUSH                           │
│                                │
│ 6 exercises                    │
│ Last trained 3 days ago        │
│                                │
│                        START → │
└────────────────────────────────┘


YOUR WORKOUTS

Push
Pull
Legs


RECENT PROGRESS

Incline Bench

185 × 8
+2 reps from last session
```

---

# 87. Visual Example: Workout Complete

```text
✓

WORKOUT COMPLETE

Push
1h 04m


PROGRESS

Incline Bench

185 × 8 / 8 / 8

+3 total reps


NEW PR

Lateral Raise
30 × 15


NEXT TIME

Incline Bench

190 LB
6-8 reps


[ DONE ]
```

---

# 88. Core Design Principle

Every screen must pass this test:

> Could someone understand what to do next while tired, distracted, and standing in a busy gym?

If not, simplify it.

---

# 89. V1 Visual Identity Summary

```text
Primary background
#111315

Surface
#191C1F

Elevated surface
#22262A

Border
#30353A

Blood Orange
#FF4F1F

Blood Orange Pressed
#E74316

Primary Text
#F5F6F7

Secondary Text
#A4ABB2

Muted Text
#70777F

Success
#36C786

Warning
#F6B94A

Error
#F05A62
```

The design should be:

```text
dark
clean
high contrast
orange-accented
information-first
thumb-friendly
```

---

# 90. Design Definition of Done

The V1 design is successful when:

- the user can start a workout with minimal navigation
- the user can log repeated sets in seconds
- previous performance is visible without leaving the exercise
- today's recommendation is immediately obvious
- additional details are available without cluttering the primary screen
- active workout data remains readable with one hand
- buttons are easy to hit
- blood orange communicates importance without overwhelming the interface
- AI feels integrated rather than bolted on
- the visual system is consistent across all screens
- important actions are predictable
- destructive actions are clearly separated
- poor connectivity does not visually overwhelm the workout
- the interface feels like a serious training tool rather than a generic tracker
