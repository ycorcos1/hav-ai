# havAI V1 Progression Engine Specification

## 1. Purpose

This document defines havAI V1's deterministic progression engine.

The progression engine decides what the user should target the next time they perform an exercise.

It is responsible for producing structured outputs such as:

```text
Increase to 190 lb
3 sets
6-8 reps
```

or:

```text
Stay at 185 lb
Target 8 / 7 / 7
```

or:

```text
Repeat 185 lb
Target 8 / 8 / 8
```

The progression engine is deterministic application logic.

It is not an AI system.

---

# 2. Core Principle

Progression must be:

```text
deterministic
explainable
testable
offline-capable
```

Given identical inputs, the engine must always produce identical outputs.

The progression engine must not depend on:

```text
OpenAI
network access
Supabase
React state
randomness
device-specific timing
```

---

# 3. Progression Architecture

```text
WORKOUT HISTORY
      +
CURRENT SESSION
      +
CURRENT TARGET
      +
USER PREFERENCES
      +
EXERCISE CHARACTERISTICS
      ↓
PROGRESSION ENGINE
      ↓
STRUCTURED RECOMMENDATION
      ↓
REASON CODES
      ↓
DETERMINISTIC EXPLANATION
```

AI may later explain the recommendation in richer language.

AI does not choose the canonical recommendation.

---

# 4. Engine Responsibilities

The engine is responsible for:

- evaluating current session performance
- comparing current session to target
- comparing recent sessions
- detecting improvement or decline
- interpreting optional RPE
- detecting repeated underperformance
- detecting stalls
- selecting next rep target
- selecting next load
- deciding whether to increase, maintain, repeat, or decrease
- assigning confidence
- producing reason codes
- versioning recommendation behavior

---

# 5. Engine Non-Responsibilities

The engine does not:

- save workouts
- write database rows
- call OpenAI
- synchronize data
- display UI
- convert user-facing pounds into canonical storage
- determine authentication
- enforce RLS
- decide if a workout should be deleted
- permanently persist PR state

---

# 6. Canonical Weight Unit

The progression engine uses:

```text
kilograms
```

internally.

Example:

```ts
targetWeightKg: 83.9146;
```

UI may display:

```text
185 lb
```

but unit conversion occurs outside the progression engine.

---

# 7. Supported Exercise Measurement Types

V1 supports:

```text
weight_reps
bodyweight_reps
reps_only
```

The progression strategy differs slightly depending on measurement type.

---

# 8. Weighted Exercise Definition

A standard weighted exercise uses:

```text
weight_reps
```

Examples:

```text
Barbell Bench Press
Incline Dumbbell Press
Leg Press
Cable Row
```

Progression may modify:

```text
load
reps
```

---

# 9. Bodyweight Exercise Definition

A bodyweight exercise uses:

```text
bodyweight_reps
```

Examples:

```text
Pull-Up
Push-Up
Dip
```

V1 assumes no explicit added-weight tracking for bodyweight exercises unless the exercise is represented as a weighted custom exercise.

Progression primarily modifies:

```text
reps
```

---

# 10. Reps-Only Exercise Definition

A reps-only exercise uses:

```text
reps_only
```

Examples may include movements where external load is not meaningful.

Progression modifies:

```text
rep target
```

only.

---

# 11. Core Input Contract

Conceptually:

```ts
type ProgressionInput = {
  exercise: {
    exerciseId: UUID;

    measurementType: "weight_reps" | "bodyweight_reps" | "reps_only";

    equipmentType: EquipmentType;
  };

  currentTarget: {
    targetSets: number;

    minReps: number;
    maxReps: number;

    targetWeightKg?: number;

    targetSetReps?: number[];
  };

  currentSession: ExerciseSessionPerformance;

  recentSessions: ExerciseSessionPerformance[];

  preferences: {
    primaryGoal: "strength" | "hypertrophy" | "hybrid";

    progressionStyle: "conservative" | "balanced" | "aggressive";
  };

  availableWeightIncrementKg?: number;
};
```

---

# 12. Session Performance Contract

```ts
type ExerciseSessionPerformance = {
  workoutId: UUID;

  completedAt: ISODateTime;

  sets: {
    weightKg?: number;

    reps: number;

    rpe?: RPE;
  }[];
};
```

Only relevant working sets should normally be passed to progression calculations.

Warm-up sets must be excluded.

---

# 13. Core Output Contract

```ts
type ProgressionResult = {
  recommendationType:
    | "increase_weight"
    | "maintain_weight"
    | "increase_reps"
    | "repeat_target"
    | "decrease_weight"
    | "insufficient_data";

  recommendedWeightKg?: number;

  targetSets?: number;

  targetMinReps?: number;
  targetMaxReps?: number;

  targetSetReps?: number[];

  confidence: "low" | "medium" | "high";

  reasonCodes: ProgressionReasonCode[];

  engineVersion: string;
};
```

---

# 14. Engine Version

Initial engine:

```text
progression-v1
```

Any material behavioral change should create a new version.

Examples:

```text
progression-v2
progression-v3
```

Do not retroactively pretend old recommendations were produced by new logic.

---

# 15. Recommendation Type Semantics

These meanings are fixed across the entire application.

---

## increase_weight

The recommended external load increases.

Example:

```text
185 lb → 190 lb
```

The rep target may reset toward the bottom of the configured rep range.

---

## increase_reps

The load remains the same and the engine provides a higher explicit rep target.

Example:

```text
185 × 8 / 7 / 6
```

becomes:

```text
185 × 8 / 7 / 7
```

This is the normal same-load progression mechanism when performance supports advancement.

---

## repeat_target

The user should repeat essentially the same intended target.

Example:

```text
Target:
185 × 8 / 8 / 8

Actual:
185 × 8 / 7 / 6
```

and evidence does not justify increasing the target yet.

Next target remains:

```text
185 × 8 / 8 / 8
```

---

## maintain_weight

The load remains the same, but no precise higher set-by-set progression target is appropriate.

Typical cases:

- mixed working loads
- irregular session structure
- ambiguous successful performance
- current session not comparable cleanly enough for a specific rep-step target

Example:

```text
190 × 6
185 × 8
185 × 7
```

The engine may recommend:

```text
maintain_weight
185-190 working load pattern
```

with a general rep range rather than a precise set target.

---

## decrease_weight

The recommended load decreases because repeated evidence suggests the current load is inappropriate.

---

## insufficient_data

The engine cannot produce a meaningful progression decision.

This should be used rather than inventing false precision.

---

# 16. Recommendation-Type Decision Rule

The engine must never return:

```text
increase_reps OR maintain_weight
```

without deterministic branching criteria.

Every branch must map to exactly one recommendation type.

---

# 17. Target Model

A workout target may be represented as either:

## General Range

```text
3 sets
6-8 reps
185 lb
```

or:

## Explicit Set Targets

```text
185 lb

8
7
7
```

Both are valid.

---

# 18. Target Set Reps

Optional:

```ts
targetSetReps?: number[];
```

Example:

```ts
[8, 7, 7];
```

If absent, the target remains a general range.

---

# 19. Current Target Source

The current target should normally come from:

```text
active progression recommendation
```

or:

```text
template baseline
```

for first-time or insufficient-history cases.

---

# 20. Minimum Required Input

For a weighted exercise, meaningful progression generally requires:

```text
target rep range
current session working sets
current working load
```

Historical data improves confidence but is not always required.

---

# 21. First-Ever Session

If no relevant history exists:

The engine should generally establish a baseline rather than aggressively progress.

Possible output:

```text
recommendationType = repeat_target
```

or:

```text
insufficient_data
```

depending on whether a meaningful existing target exists.

---

# 22. Initial Baseline Rule

If:

```text
target exists
+
user completes enough working sets
+
performance is interpretable
```

the engine may create a baseline recommendation.

Reason code:

```text
INITIAL_BASELINE_ESTABLISHED
```

---

# 23. Session Classification

Each weighted session should first be classified relative to the intended target.

Recommended classes:

```text
perfect
successful
partial_underperformance
severe_underperformance
irregular
```

---

# 24. Perfect Session

A session is `perfect` when all intended working sets reach the top of the target rep range or explicit set targets.

Example target:

```text
3 × 6-8
```

Actual:

```text
8 / 8 / 8
```

Reason code:

```text
TOP_OF_REP_RANGE_REACHED
```

---

# 25. Successful Session

A session is successful when:

- intended set count is substantially completed
- reps remain within target range
- there is meaningful progress or acceptable performance
- no major failure signal dominates

Examples:

```text
8 / 7 / 6
```

```text
7 / 7 / 7
```

for target:

```text
3 × 6-8
```

---

# 26. Partial Underperformance

Examples:

```text
6 / 6 / 5
```

or:

```text
7 / 5 / 5
```

where performance falls somewhat below target but not enough to justify immediate load reduction from one session.

Reason codes may include:

```text
BELOW_TARGET_RANGE
SINGLE_SESSION_UNDERPERFORMANCE
```

---

# 27. Severe Underperformance

Examples:

```text
4 / 4 / 4
```

against:

```text
3 × 6-8
```

or inability to complete most intended work.

One severe session should usually result in:

```text
repeat_target
```

or:

```text
maintain_weight
```

not immediate automatic weight reduction unless there is strong supporting history.

---

# 28. Irregular Session

A session is irregular when comparison is unreliable.

Examples:

```text
mixed working loads
substantially changed set count
unusual exercise structure
large deviations in load during the session
```

Irregular sessions generally reduce confidence.

They may produce:

```text
maintain_weight
```

rather than precise rep-step progression.

---

# 29. Total Rep Metric

For relevant working sets:

```text
totalReps = sum(reps)
```

Example:

```text
8 + 7 + 6 = 21
```

---

# 30. Average Rep Metric

```text
averageReps =
totalReps / workingSetCount
```

Useful for trend/context.

Not sufficient alone to decide progression.

---

# 31. Best Set Rep Metric

For equal load:

```text
bestSetReps = max(reps)
```

Useful for rep progression.

---

# 32. Working-Set Count

Only:

```text
set_type = working
```

counts toward normal progression evaluation.

Warm-ups are excluded.

---

# 33. Extra Sets

If user performs more working sets than targeted:

Reason:

```text
EXTRA_SETS_PERFORMED
```

Do not automatically increase future template target set count.

Extra sets are evidence, not an automatic program-structure change.

---

# 34. Missing Target Sets

If fewer working sets are completed than planned:

Reason:

```text
INCOMPLETE_TARGET_SETS
```

This lowers confidence.

It should not automatically cause load reduction.

---

# 35. Rep Range Example

Target:

```text
3 × 6-8
185 lb
```

Progression can occur gradually inside the range.

Example sequence:

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
increase load
```

Exact sequence depends on current performance.

---

# 36. Rep Target Generator Goal

For same-load progression, generate the smallest meaningful next target.

Do not jump unnecessarily from:

```text
6 / 6 / 6
```

to:

```text
8 / 8 / 8
```

---

# 37. Rep Target Generator

Given:

```text
target max = 8
current achieved = 8 / 7 / 6
```

recommended next:

```text
8 / 7 / 7
```

The engine should generally increase one lagging set by one rep.

---

# 38. Fatigue Ordering Rule

Set targets should remain realistic across fatigue.

Avoid generating:

```text
6 / 8 / 8
```

when the earlier set is intentionally lower than later sets without a good reason.

Prefer non-increasing or sensible progression structures such as:

```text
8 / 7 / 7
```

or:

```text
8 / 8 / 7
```

---

# 39. Rep Target Maximum

Generated set targets must never exceed:

```text
targetMaxReps
```

unless the session itself exceeded the range and that performance is being interpreted as evidence to increase load.

---

# 40. Rep Range Exceeded

If user performs above the intended max:

Example target:

```text
6-8
```

Actual:

```text
9 / 9 / 8
```

Reason:

```text
REP_RANGE_EXCEEDED
```

This is strong evidence the current load may be too light.

For weighted exercises, this generally supports:

```text
increase_weight
```

---

# 41. Top of Rep Range Reached

If:

```text
8 / 8 / 8
```

for:

```text
3 × 6-8
```

Reason:

```text
TOP_OF_REP_RANGE_REACHED
```

This strongly supports load progression.

---

# 42. REP_RANGE_MAXED

Use:

```text
REP_RANGE_MAXED
```

primarily when a rep-only or bodyweight exercise reaches the configured maximum target but there is no supported external-weight progression path in V1.

Example:

```text
Pull-Up
3 × 8-12

12 / 12 / 12
```

The engine cannot increase canonical external load automatically.

It may:

- maintain current maximum target
- indicate range maxed
- leave future added-weight progression to a later feature or custom weighted exercise

---

# 43. Weighted Exercise Load Progression

When a weighted exercise reaches progression criteria:

```text
increase_weight
```

to a practical available load.

---

# 44. Weight Increment Input

The engine may receive:

```ts
availableWeightIncrementKg?: number
```

Example:

```text
2.26796 kg
```

approximately:

```text
5 lb
```

---

# 45. Default Increment

If no explicit increment exists, infer a sensible default from equipment type/configuration.

This inference must be centralized and deterministic.

Example conceptual defaults:

```text
barbell
→ 5 lb total equivalent

dumbbell
→ next common dumbbell increment

machine
→ next machine stack increment if known
```

Exact implementation values belong in centralized configuration.

---

# 46. Increment Guardrail

Do not progress to a load that represents an unreasonable percentage jump solely because equipment increment is large.

Example:

```text
10 lb increase
```

may be appropriate for one exercise but excessive for another.

The engine may use:

```text
SMALLEST_INCREMENT_TOO_LARGE
```

when the available increment is disproportionately large.

---

# 47. Smallest Increment Too Large

If progression criteria are met but the smallest practical increment is too large:

Prefer:

```text
increase_reps
```

or:

```text
repeat_target
```

rather than forcing an unreasonable load jump.

Reason:

```text
SMALLEST_INCREMENT_TOO_LARGE
```

---

# 48. Load Increase Rep Reset

After increasing weight, target reps generally reset toward:

```text
targetMinReps
```

Example:

```text
185 × 8 / 8 / 8
```

becomes:

```text
190 × 6 / 6 / 6
```

for a 6-8 range.

---

# 49. Load Increase Target

Default weighted progression after fully maxing the range:

```text
newWeight
targetSets unchanged
targetMinReps unchanged
targetMaxReps unchanged
targetSetReps = [min, min, min]
```

if explicit set targets are used.

---

# 50. Single Bad Session Principle

One poor session should not immediately cause a load decrease.

Possible reasons for temporary underperformance:

- poor sleep
- stress
- exercise ordering
- short rest
- fatigue
- hydration
- normal variation

Therefore:

```text
single underperformance
```

usually produces:

```text
repeat_target
```

or:

```text
maintain_weight
```

---

# 51. Single Underperformance Reason

Use:

```text
SINGLE_SESSION_UNDERPERFORMANCE
```

when the current session falls below target but recent history does not yet show a repeated failure pattern.

---

# 52. Repeated Underperformance

If multiple comparable sessions fall below target:

Use:

```text
REPEATED_UNDERPERFORMANCE
```

This may justify:

```text
decrease_weight
```

or a conservative repeated target depending on severity.

---

# 53. Repeated Failed Progression

A particularly useful pattern:

```text
User succeeds at 185
↓
moves to 190
↓
fails target
↓
tries 190 again
↓
fails target again
```

Reason:

```text
REPEATED_FAILED_PROGRESSION
```

This strongly supports returning to a more manageable load.

---

# 54. Weight Decrease Rule

A weight decrease should generally require more evidence than a same-load repeat.

Good triggers include:

- repeated significant underperformance
- repeated failed new-weight attempts
- severe decline across comparable sessions
- strong high-RPE evidence supporting overload

---

# 55. Decrease Target

After decrease:

Use a practical lower load.

Prefer:

```text
previous successfully managed load
```

when available.

Otherwise use configured decrement.

---

# 56. Unusual Performance Drop

If one session is dramatically worse than recent history:

Reason:

```text
UNUSUAL_PERFORMANCE_DROP
```

Do not immediately assume permanent regression.

Prefer lower confidence and repeated target.

---

# 57. Multi-Session Trend Window

Recommended V1 trend window:

```text
3-5 comparable sessions
```

More history may exist, but recent comparable performance should dominate progression decisions.

---

# 58. Comparable Session Definition

Sessions are most comparable when:

- same exercise
- same measurement type
- similar working load
- similar target structure
- enough working sets completed

Mixed or heavily altered sessions reduce comparability.

---

# 59. Trend Categories

```text
improving
flat
declining
insufficient_data
```

---

# 60. Improving Trend

Potential evidence:

- total reps increasing
- explicit target progression
- e1RM improving
- same performance at lower RPE

Reason may include:

```text
TOTAL_REPS_IMPROVED
ESTIMATED_1RM_IMPROVED
RPE_IMPROVED
```

---

# 61. Flat Trend

Performance is substantially unchanged across comparable sessions.

Reason:

```text
PERFORMANCE_REPEATED
```

If persistent:

```text
MULTI_SESSION_STALL
```

may apply.

---

# 62. Declining Trend

Potential evidence:

- repeated rep decline
- e1RM decline
- repeated high RPE
- repeated failure to meet minimum range

Reasons may include:

```text
TOTAL_REPS_DECLINED
ESTIMATED_1RM_DECLINED
RPE_WORSENED
```

---

# 63. Insufficient Trend Data

If fewer than the minimum useful comparable sessions exist:

```text
direction = insufficient_data
```

Reason:

```text
INSUFFICIENT_HISTORY
```

Do not fabricate a trend.

---

# 64. Plateau Definition

A plateau is not:

```text
one repeated workout
```

A plateau requires a multi-session pattern.

---

# 65. Plateau States

```text
none
possible
likely
```

---

# 66. Possible Plateau

May require approximately:

```text
3 comparable sessions
```

with minimal meaningful improvement.

---

# 67. Likely Plateau

May require stronger evidence such as:

```text
4-5 comparable sessions
```

with:

- no rep progression
- no e1RM progression
- no meaningful RPE improvement

---

# 68. Plateau Reason Codes

```text
MULTI_SESSION_STALL
PLATEAU_DETECTED
```

---

# 69. Plateau Does Not Automatically Mean Deload

A plateau may justify:

- repeating target
- changing progression pace
- smaller increment
- holding load

V1 should not automatically implement advanced programming changes.

---

# 70. Estimated 1RM

Use one canonical formula throughout havAI.

V1 formula:

```text
Epley
```

For reps > 1:

```text
e1RM =
weight × (1 + reps / 30)
```

For exactly one rep:

```text
e1RM = weight
```

---

# 71. e1RM Contract

```ts
type EstimatedOneRepMaxResult = {
  estimated1RMKg: number;

  sourceWeightKg: number;

  reps: number;

  formulaVersion: string;
};
```

Recommended formula version:

```text
epley-v1
```

---

# 72. e1RM Role

e1RM is supporting evidence.

It should not override obvious rep-target logic by itself.

Example:

If the user clearly completed:

```text
8 / 8 / 8
```

within a 6-8 range, explicit target completion is already strong evidence.

---

# 73. High-Rep e1RM

Epley becomes less meaningful at very high reps.

V1 should define a practical maximum reps threshold for progression analytics.

Example conceptual cutoff:

```text
<= 15 reps
```

Exact threshold should be centralized in config and tested.

Above threshold:

- do not treat e1RM as strong evidence
- progression may still use rep performance

---

# 74. RPE Is Optional

The engine must work correctly with no RPE.

No recommendation may require RPE data.

---

# 75. RPE Coverage

Calculate:

```text
RPE coverage =
working sets with RPE
/
total working sets
```

Example:

```text
2 / 3
```

RPE evidence should be weaker when coverage is partial.

---

# 76. RPE Average

If RPE exists:

```text
averageRPE =
sum(RPE) / RPECount
```

Use only available values.

---

# 77. RPE Acceptable

Reason:

```text
RPE_ACCEPTABLE
```

when effort supports progression or continuation.

Exact thresholds belong in centralized progression config.

---

# 78. High RPE

Reason:

```text
RPE_HIGH
```

Example:

```text
multiple sets at 9.5-10
```

This may reduce willingness to increase load, particularly in conservative mode.

---

# 79. RPE Improvement

Same or better performance at lower RPE may indicate improvement.

Reason:

```text
RPE_IMPROVED
```

---

# 80. RPE Worsening

Comparable performance requiring meaningfully higher RPE:

```text
RPE_WORSENED
```

This weakens progression confidence.

---

# 81. No RPE

If RPE is absent:

Reason may include:

```text
RPE_UNAVAILABLE
```

but this should not be treated as a failure.

---

# 82. RPE Should Not Overrule Clear Success Automatically

Example:

```text
185 × 8 / 8 / 8
```

with one set at RPE 9.5.

The engine should consider the full context.

Conservative mode may delay the increase.

Balanced mode may still increase if overall evidence is strong.

Aggressive mode may increase more readily.

---

# 83. Progression Styles

V1 supports:

```text
conservative
balanced
aggressive
```

These modify thresholds.

They do not create entirely separate engines.

---

# 84. Balanced Style

Balanced is the default.

Primary behavior:

- progress when evidence is clear
- increase reps before load
- increase load after range is fully achieved
- tolerate one bad session
- decrease only after repeated evidence

---

# 85. Conservative Style

Conservative mode should:

- require stronger evidence before load increase
- give high RPE more influence
- repeat strong but high-effort sessions more often
- avoid rapid load jumps

It should not be so conservative that progression effectively stops.

---

# 86. Aggressive Style

Aggressive mode may:

- progress slightly earlier
- accept strong near-top-range sessions
- use improving trend as additional support
- tolerate slightly higher effort

But it must still avoid unreasonable jumps or obvious failed progression.

---

# 87. Style Does Not Change Canonical Meaning

Recommendation types mean the same thing in all modes.

Only decision thresholds differ.

---

# 88. Balanced Weighted Progression Decision Order

For a regular comparable weighted session, evaluate roughly in this order:

```text
1. Is data sufficient?
2. Is session structurally interpretable?
3. Was top of rep range fully achieved?
4. Was rep range exceeded?
5. Is same-load rep progression available?
6. Is this one underperforming session?
7. Is underperformance repeated?
8. Is current load repeatedly failing?
9. Is trend stalled/declining?
10. Is RPE evidence materially relevant?
11. Select exact recommendation
```

---

# 89. Balanced Perfect Session

Target:

```text
3 × 6-8
185 lb
```

Actual:

```text
8 / 8 / 8
```

Default recommendation:

```text
increase_weight
```

Next:

```text
190 lb
3 × 6-8
```

Potential explicit target:

```text
6 / 6 / 6
```

Reasons:

```text
TOP_OF_REP_RANGE_REACHED
```

plus applicable RPE/trend reasons.

---

# 90. Balanced Above-Range Session

Actual:

```text
9 / 9 / 8
```

Default:

```text
increase_weight
```

Reasons:

```text
REP_RANGE_EXCEEDED
```

---

# 91. Balanced Successful Same-Load Session

Target:

```text
3 × 6-8
185 lb
```

Actual:

```text
8 / 7 / 6
```

Default next target:

```text
8 / 7 / 7
```

Recommendation:

```text
increase_reps
```

Reason:

```text
WITHIN_TARGET_RANGE
```

and where applicable:

```text
TOTAL_REPS_IMPROVED
```

---

# 92. Balanced All-Minimum Session

Actual:

```text
6 / 6 / 6
```

This successfully meets the minimum target.

If stable:

Next may be:

```text
7 / 6 / 6
```

Recommendation:

```text
increase_reps
```

unless strong fatigue/RPE/history evidence suggests repeating.

---

# 93. Balanced Partial Underperformance

Actual:

```text
6 / 6 / 5
```

Default:

```text
repeat_target
```

at same load.

Reasons:

```text
BELOW_TARGET_RANGE
SINGLE_SESSION_UNDERPERFORMANCE
```

Do not automatically decrease weight.

---

# 94. Balanced Severe Single Underperformance

Actual:

```text
4 / 4 / 4
```

against:

```text
6-8
```

If recent history was otherwise good:

```text
repeat_target
```

at same load may still be appropriate.

Reasons:

```text
BELOW_TARGET_RANGE
UNUSUAL_PERFORMANCE_DROP
SINGLE_SESSION_UNDERPERFORMANCE
```

Confidence may be low.

---

# 95. Repeated Underperformance

If comparable recent sessions repeatedly miss minimum reps:

Example:

```text
Session 1: 6 / 5 / 5
Session 2: 5 / 5 / 4
Session 3: 5 / 4 / 4
```

Recommendation may become:

```text
decrease_weight
```

Reasons:

```text
REPEATED_UNDERPERFORMANCE
TOTAL_REPS_DECLINED
```

---

# 96. Repeated Failed New Weight

Example:

```text
185 × 8 / 8 / 8
↓
increase to 190

190 × 5 / 5 / 4
190 × 5 / 5 / 5
```

for target:

```text
6-8
```

Recommendation:

```text
decrease_weight
```

likely back toward:

```text
185
```

Reason:

```text
REPEATED_FAILED_PROGRESSION
```

---

# 97. Mixed Working Loads

Example:

```text
190 × 6
185 × 8
185 × 7
```

This session is not cleanly comparable to a single-load target.

Default recommendation type:

```text
maintain_weight
```

not:

```text
increase_reps
```

unless an explicit rule identifies one dominant load.

Reason:

```text
MIXED_WORKING_LOADS
```

Confidence usually:

```text
low
```

or:

```text
medium
```

depending on consistency.

---

# 98. Dominant Load Rule

Optional V1 refinement:

If most target working sets use the same load and only one set deviates minimally, the engine may treat the dominant load as the comparison load.

This rule must be explicitly implemented and tested.

Otherwise classify as mixed-load.

---

# 99. Mixed Load Does Not Mean Failure

A mixed-load session should not automatically produce:

```text
decrease_weight
```

It primarily reduces precision.

---

# 100. Exact Repeat Target

Use:

```text
repeat_target
```

when the next recommended target should materially match the existing one.

Example:

```text
Target:
185 × 8 / 7 / 7

Actual:
185 × 8 / 6 / 6
```

Next:

```text
185 × 8 / 7 / 7
```

---

# 101. Maintain Weight Example

Target:

```text
3 × 6-8 at 185
```

Actual:

```text
185 × 8
190 × 5
185 × 7
```

Because no clean explicit next progression is justified:

```text
recommendationType = maintain_weight
recommendedWeightKg = 185 lb equivalent
targetMinReps = 6
targetMaxReps = 8
targetSetReps = undefined
```

Reason:

```text
MIXED_WORKING_LOADS
```

---

# 102. Increase Reps Example

Current achieved:

```text
185 × 7 / 7 / 6
```

Next:

```text
185 × 7 / 7 / 7
```

Recommendation:

```text
increase_reps
```

---

# 103. Repeat Target Example

Target:

```text
185 × 8 / 8 / 8
```

Actual:

```text
185 × 8 / 7 / 7
```

If this was a failed attempt to max the range:

Next:

```text
185 × 8 / 8 / 8
```

Recommendation:

```text
repeat_target
```

---

# 104. Recommendation Confidence

Confidence reflects how strongly available evidence supports the recommendation.

Values:

```text
low
medium
high
```

---

# 105. High Confidence

Typical high-confidence conditions:

- multiple comparable sessions
- clean consistent load
- target structure completed
- clear progression pattern
- strong history agreement
- sufficient RPE where relevant

---

# 106. Medium Confidence

Typical:

- current session interpretable
- some relevant history
- minor irregularity
- partial RPE
- still enough evidence for a useful target

---

# 107. Low Confidence

Typical:

- first/early session
- mixed loads
- incomplete session
- unusual performance drop
- sparse history
- conflicting signals

---

# 108. Confidence Does Not Mean Probability

Do not interpret:

```text
high
```

as:

```text
90% chance recommendation succeeds
```

It simply communicates evidence quality.

---

# 109. Reason Codes

Every recommendation must include at least one meaningful reason code unless a truly exceptional case exists.

Reason codes should describe observed evidence.

---

# 110. Full V1 Reason-Code Set

```text
INITIAL_BASELINE_ESTABLISHED

TOP_OF_REP_RANGE_REACHED
REP_RANGE_EXCEEDED
REP_RANGE_MAXED

WITHIN_TARGET_RANGE
BELOW_TARGET_RANGE

TOTAL_REPS_IMPROVED
TOTAL_REPS_DECLINED

PERFORMANCE_REPEATED

RPE_ACCEPTABLE
RPE_HIGH
RPE_IMPROVED
RPE_WORSENED
RPE_UNAVAILABLE

INCOMPLETE_TARGET_SETS
EXTRA_SETS_PERFORMED

MIXED_WORKING_LOADS

SINGLE_SESSION_UNDERPERFORMANCE
REPEATED_UNDERPERFORMANCE
REPEATED_FAILED_PROGRESSION

UNUSUAL_PERFORMANCE_DROP

MULTI_SESSION_STALL
PLATEAU_DETECTED

ESTIMATED_1RM_IMPROVED
ESTIMATED_1RM_DECLINED

SMALLEST_INCREMENT_TOO_LARGE

INSUFFICIENT_HISTORY
```

---

# 111. Reason-Code Rule

Do not use reason codes as hidden control flow that differs from the visible recommendation.

Example bad combination:

```text
recommendation:
increase_weight

reason:
REPEATED_UNDERPERFORMANCE
```

unless another stronger explicitly documented rule justifies it.

---

# 112. Reason Codes Are Evidence

They should answer:

```text
Why did the engine do this?
```

They are also used by deterministic explanation UI.

---

# 113. Deterministic Explanation Mapping

Example:

```text
TOP_OF_REP_RANGE_REACHED
```

maps to:

```text
You reached the top of your target rep range across the planned sets.
```

---

# 114. AI Explanation Relationship

AI receives:

- canonical recommendation
- reason codes
- recent context

AI may explain.

AI must not silently mutate:

```text
increase_weight
```

into:

```text
decrease_weight
```

---

# 115. Conservative Style Rules

Compared with Balanced:

Conservative should be more likely to:

```text
repeat_target
```

when:

- top of range was reached at very high RPE
- RPE worsened significantly
- progression history is sparse
- available load jump is large

---

# 116. Conservative Perfect Session

Example:

```text
8 / 8 / 8
average RPE ≈ 9.7
```

Balanced may:

```text
increase_weight
```

Conservative may:

```text
repeat_target
```

or potentially hold one additional session before increasing.

This decision must be represented as a concrete threshold in config.

---

# 117. Conservative Must Still Progress

If user repeatedly performs:

```text
8 / 8 / 8
```

with acceptable effort:

Conservative must eventually increase load.

Do not create an endless repeat loop.

---

# 118. Aggressive Style Rules

Aggressive may progress load earlier when:

- performance is near top of range
- trend is clearly improving
- RPE acceptable
- no recent failure pattern

---

# 119. Aggressive Early Load Example

Target:

```text
3 × 6-8
```

Actual:

```text
8 / 8 / 7
```

with:

```text
strong improving trend
acceptable RPE
```

Aggressive mode may:

```text
increase_weight
```

while Balanced would:

```text
increase_reps
```

toward:

```text
8 / 8 / 8
```

This rule must be explicit and tested.

---

# 120. Aggressive Safety Guardrail

Aggressive does not mean:

```text
always add weight
```

Repeated failures still block increases.

---

# 121. Primary Goal Influence

V1 may use:

```text
strength
hypertrophy
hybrid
```

as secondary modifiers.

Do not build three completely separate progression systems.

---

# 122. Strength Goal

May slightly favor:

- lower-end rep completion
- load progression when performance is strong
- weight increases earlier than hypertrophy mode within allowed thresholds

---

# 123. Hypertrophy Goal

May slightly favor:

- completing the rep range
- same-load rep progression
- additional confidence before load increase

---

# 124. Hybrid Goal

Uses balanced defaults between strength and hypertrophy preferences.

---

# 125. Goal Influence Must Be Bounded

Primary goal may adjust thresholds.

It must not cause contradictory behavior such as:

```text
4 / 4 / 4
```

against a 6-8 target producing an increase merely because:

```text
primaryGoal = strength
```

---

# 126. Available Weight Increment

If known, supply actual equipment increment.

Examples:

```text
2.5 lb dumbbell step
5 lb barbell total step
10 lb machine stack
```

Convert to kg before entering engine.

---

# 127. Weight Increment Configuration

Keep increment logic centralized.

Suggested module:

```text
src/features/progression/config/weightIncrements.ts
```

Do not hardcode arbitrary increases inside policy branches.

---

# 128. Equipment-Specific Increment Support

V1 may support generic defaults for:

```text
barbell
dumbbell
machine
cable
smith_machine
plate_loaded
```

Custom exercise-specific increments may be future scope.

---

# 129. Bodyweight Progression

For:

```text
bodyweight_reps
```

do not use:

```text
increase_weight
```

unless the exercise is explicitly modeled with load support.

Progress primarily through reps.

---

# 130. Bodyweight Example

Target:

```text
3 × 8-12
```

Actual:

```text
10 / 9 / 8
```

Next:

```text
10 / 9 / 9
```

Recommendation:

```text
increase_reps
```

---

# 131. Bodyweight Maxed Example

Actual:

```text
12 / 12 / 12
```

Reason:

```text
REP_RANGE_MAXED
```

Recommendation:

```text
repeat_target
```

or:

```text
maintain_weight
```

depending on whether exact same reps should be repeated.

For standard V1 bodyweight behavior, prefer:

```text
repeat_target
```

with:

```text
12 / 12 / 12
```

and a deterministic explanation that the configured range has been maxed.

---

# 132. Reps-Only Progression

Same general logic as bodyweight:

```text
increase_reps
```

until max is reached.

Once maxed:

```text
REP_RANGE_MAXED
```

and:

```text
repeat_target
```

unless the user changes the exercise configuration.

---

# 133. First Session With No Target

If:

```text
no usable target
```

and:

```text
no useful history
```

return:

```text
insufficient_data
```

Reason:

```text
INSUFFICIENT_HISTORY
```

The engine should not invent an arbitrary starting load.

---

# 134. First Session With Template Target

If a template supplies:

```text
185 lb
3 × 6-8
```

and this is the first session:

Use the actual performance to establish a baseline.

Example:

```text
6 / 6 / 6
```

may produce:

```text
increase_reps
```

toward:

```text
7 / 6 / 6
```

with:

```text
INITIAL_BASELINE_ESTABLISHED
```

and:

```text
WITHIN_TARGET_RANGE
```

Confidence:

```text
low
```

or:

```text
medium
```

depending on data quality.

---

# 135. Insufficient History Is Not Always Insufficient Recommendation

No prior history does not automatically mean:

```text
insufficient_data
```

If the current session and template target provide enough information, a baseline next target may still be generated.

---

# 136. Historical Window Ordering

Recent sessions must be ordered by:

```text
completedAt descending
```

or normalized into chronological order internally as required.

Do not rely on arbitrary repository ordering.

---

# 137. Historical Session Filtering

Exclude:

- warm-up sets
- discarded workouts
- unrelated exercises
- invalid/deleted sets
- incomplete records that cannot be meaningfully compared

---

# 138. Historical Edits

If historical sets change:

Progression recommendation should be recalculated from updated raw history.

The engine itself remains stateless.

---

# 139. Deleted Historical Workout

If a relevant workout is deleted:

Recalculate future recommendation from remaining history.

Do not preserve stale progression conclusions.

---

# 140. Recommendation Consumption

The progression engine itself does not mark recommendations consumed.

Application logic handles:

```text
active recommendation
↓
workout starts
↓
recommendation consumed
```

---

# 141. Engine Statelessness

`calculateProgression()` should behave as a pure function.

Conceptually:

```ts
function calculateProgression(input: ProgressionInput): ProgressionResult;
```

No hidden mutable engine state.

---

# 142. Suggested Module Structure

```text
src/features/progression/
├── domain/
│   ├── calculateProgression.ts
│   ├── classifySession.ts
│   ├── generateRepTarget.ts
│   ├── selectWeightIncrement.ts
│   ├── calculateConfidence.ts
│   └── collectReasonCodes.ts
│
├── metrics/
│   ├── totalReps.ts
│   ├── averageReps.ts
│   ├── estimatedOneRepMax.ts
│   ├── rpeMetrics.ts
│   ├── trendAnalysis.ts
│   └── plateauDetection.ts
│
├── policies/
│   ├── balancedPolicy.ts
│   ├── conservativeModifier.ts
│   └── aggressiveModifier.ts
│
├── config/
│   ├── progressionConfig.ts
│   └── weightIncrements.ts
│
├── explanations/
│   └── reasonCodeMessages.ts
│
├── types/
└── __tests__/
```

Exact structure may vary slightly if responsibilities remain clear.

---

# 143. Do Not Put Progression in Screens

Bad:

```ts
if (reps >= 8) {
  weight += 5;
}
```

inside a React component.

All progression decisions belong in the engine.

---

# 144. Do Not Put Progression in AI Prompts

Bad architecture:

```text
Send last workouts to OpenAI
Ask it what weight comes next
Save answer
```

Canonical progression must remain deterministic.

---

# 145. Do Not Put Progression in Database Triggers

Database should store progression recommendations.

It should not contain hidden business rules that independently decide targets.

---

# 146. Precision Rules

Internal weight calculations may retain high precision.

Recommended load must ultimately be snapped to:

```text
available practical increment
```

before being returned.

Do not return:

```text
86.392721 kg
```

as a usable gym target.

---

# 147. Display Rounding

Display rounding happens after the engine.

Engine returns canonical kg corresponding to the selected practical load.

UI converts to selected display unit.

---

# 148. No Floating-Point Equality Dependence

When comparing weights, use appropriate tolerance or normalized increment representation.

Do not rely on naive exact floating-point equality for converted lb/kg values.

---

# 149. Total Rep Improvement

Reason:

```text
TOTAL_REPS_IMPROVED
```

may apply when comparable same-load performance increases.

Example:

```text
20 total reps
→
22 total reps
```

---

# 150. Total Rep Decline

Reason:

```text
TOTAL_REPS_DECLINED
```

may apply when comparable same-load performance declines meaningfully.

---

# 151. Performance Repeated

Use:

```text
PERFORMANCE_REPEATED
```

when comparable performance remains materially unchanged.

One repeated session is not automatically a plateau.

---

# 152. Estimated 1RM Improvement

Use:

```text
ESTIMATED_1RM_IMPROVED
```

when change exceeds configured noise threshold.

Do not treat tiny floating-point changes as meaningful improvement.

---

# 153. Estimated 1RM Decline

Same principle.

Use configured meaningful-change threshold.

---

# 154. RPE Change Threshold

Do not treat:

```text
8.5 → 8
```

or other small differences as universally meaningful without configured thresholds.

Centralize meaningful RPE-change criteria.

---

# 155. Config Centralization

Numeric progression thresholds should live in:

```text
progressionConfig.ts
```

Examples:

- minimum sessions for trend
- minimum sessions for plateau
- e1RM change threshold
- high-RPE threshold
- conservative delay threshold
- aggressive early-progression threshold
- max reasonable percentage load jump

Do not scatter magic numbers.

---

# 156. No User-Facing Magic Numbers

UI should display the recommendation.

It should not expose raw internal thresholds such as:

```text
progression score = 0.73
```

unless future product design explicitly adds it.

---

# 157. Recommendation Validation

Before returning result, validate semantic consistency.

Examples:

## increase_weight

Must generally contain:

```text
recommendedWeightKg > current target weight
```

---

## decrease_weight

Must generally contain:

```text
recommendedWeightKg < current target weight
```

---

## increase_reps

Must keep same load where load exists and provide a higher explicit rep target.

---

## repeat_target

Must not silently increase load.

---

# 158. Invalid Engine State

If internal logic produces contradictory output:

Fail safely.

Do not return an impossible recommendation.

During development, throw/log a typed engine invariant error.

Production fallback may use:

```text
insufficient_data
```

where appropriate.

---

# 159. Deterministic Output Ordering

Reason codes should be returned in a stable ordering.

This improves:

- tests
- snapshots
- explanation consistency
- debugging

---

# 160. Progression Test Categories

Required:

```text
first session
perfect session
successful session
partial underperformance
severe underperformance
repeated underperformance
failed load increase
mixed loads
missing sets
extra sets
RPE absent
RPE partial
RPE high
RPE improved
RPE worsened
trend improving
trend declining
plateau
large increment
bodyweight
reps only
```

---

# 161. Golden Sequence: Weighted Progression

Example target:

```text
185 lb
3 × 6-8
```

Sequence:

```text
Session 1
6 / 6 / 6
→ increase_reps
→ 7 / 6 / 6

Session 2
7 / 6 / 6
→ increase_reps
→ 7 / 7 / 6

Session 3
7 / 7 / 6
→ increase_reps
→ 7 / 7 / 7

Session 4
7 / 7 / 7
→ increase_reps
→ 8 / 7 / 7

Session 5
8 / 7 / 7
→ increase_reps
→ 8 / 8 / 7

Session 6
8 / 8 / 7
→ increase_reps
→ 8 / 8 / 8

Session 7
8 / 8 / 8
→ increase_weight
→ 190 lb
→ 6 / 6 / 6
```

This is a core regression fixture.

---

# 162. Golden Sequence: Failed Progression

```text
185
8 / 8 / 8
→ 190

190
5 / 5 / 4
→ repeat_target

190
5 / 5 / 5
→ decrease_weight
```

Exact first-failure behavior should follow configured thresholds, but repeated failure must eventually resolve downward.

---

# 163. Golden Sequence: Temporary Bad Day

```text
185
7 / 7 / 7

next session
185
5 / 5 / 5

recent history otherwise improving
```

Default should not immediately decrease weight.

Likely:

```text
repeat_target
```

Reason:

```text
UNUSUAL_PERFORMANCE_DROP
SINGLE_SESSION_UNDERPERFORMANCE
```

---

# 164. Golden Sequence: Mixed Loads

```text
190 × 6
185 × 8
185 × 7
```

Expected recommendation type:

```text
maintain_weight
```

Reason:

```text
MIXED_WORKING_LOADS
```

Do not emit:

```text
increase_reps
```

unless the dominant-load rule explicitly qualifies.

---

# 165. Golden Sequence: Bodyweight

Target:

```text
3 × 8-12
```

Performance:

```text
10 / 9 / 8
```

Next:

```text
10 / 9 / 9
```

Type:

```text
increase_reps
```

---

# 166. Golden Sequence: Bodyweight Max

Performance:

```text
12 / 12 / 12
```

Type:

```text
repeat_target
```

Reason:

```text
REP_RANGE_MAXED
```

V1 does not automatically invent added weight.

---

# 167. Testing Determinism

Run:

```ts
calculateProgression(input);
```

multiple times.

Output must be deeply equal.

---

# 168. Testing Invalid Inputs

Test:

```text
negative reps
invalid rep range
zero target sets
negative target weight
malformed targetSetReps
inconsistent set count
invalid available increment
```

Runtime/application validation should reject invalid inputs before policy evaluation where possible.

---

# 169. Testing Recommendation Semantics

Add direct tests ensuring:

```text
increase_weight
```

actually increases weight.

```text
decrease_weight
```

actually decreases weight.

```text
increase_reps
```

keeps load and raises explicit rep target.

```text
repeat_target
```

keeps substantially same target.

```text
maintain_weight
```

keeps load without pretending to provide precise rep progression.

---

# 170. Testing Reason Codes

Each golden case should assert:

```text
recommendation
reasonCodes
confidence
```

not just weight.

---

# 171. Testing Style Modifiers

Use identical session data and compare:

```text
conservative
balanced
aggressive
```

Expected differences must be deliberate and documented.

---

# 172. Testing Without RPE

All major weighted progression scenarios must have variants with:

```text
no RPE
```

The engine must still work.

---

# 173. Testing Partial RPE

Example:

```text
Set 1: RPE 8
Set 2: no RPE
Set 3: RPE 9
```

Engine should use partial evidence without pretending coverage is complete.

---

# 174. Offline Compatibility

The progression engine receives all input as function arguments.

It must be runnable with:

```text
SQLite/local cached history only
```

No remote dependencies.

---

# 175. Recommendation Persistence Boundary

The engine returns:

```text
ProgressionResult
```

Application layer creates:

```text
ProgressionRecommendation
```

by adding:

```text
id
userId
exerciseId
sourceWorkoutId
sourceWorkoutExerciseId
status
timestamps
```

The engine should not generate database IDs.

---

# 176. Recommendation Status Boundary

The engine does not choose:

```text
active
consumed
superseded
```

Application/repository logic manages recommendation lifecycle.

A newly persisted recommendation will normally begin:

```text
active
```

---

# 177. Historical Recommendation Traceability

Persist:

```text
engineVersion
reasonCodes
sourceWorkoutId
sourceWorkoutExerciseId
```

so the application can later understand why a recommendation existed.

---

# 178. PR Boundary

The progression engine may consume:

```text
e1RM trend
performance history
```

but it does not own persistent personal-record state.

PR detection and progression are related but separate modules.

---

# 179. No PR-Based Automatic Override

A new PR is evidence of improvement.

It does not automatically override rep-range logic.

Example:

```text
new e1RM PR
```

does not necessarily mean:

```text
increase_weight immediately
```

if the target session itself failed badly.

---

# 180. Exercise-Specific Future Rules

Future versions may support:

```text
exercise-specific increments
exercise-specific progression strategy
user-specific success rates
recommended rest time
fatigue adjustment
program-level periodization
```

Do not add these to V1 unless explicitly specified.

---

# 181. Future Personalization

Because recommendations persist with outcomes, future systems may learn:

```text
user succeeds on 5 lb increases
user struggles after 10 lb machine jumps
user progresses pulling movements faster than pressing
```

V1 architecture should collect the necessary raw/recommendation linkage without implementing adaptive ML.

---

# 182. Recommendation Outcome Analysis

Future analysis can compare:

```text
source recommendation
↓
next workout exercise
↓
actual performance
```

because:

```text
workout_exercise.source_recommendation_id
```

is preserved.

---

# 183. No Hidden ML

V1 progression is deterministic rules.

Do not add:

```text
machine learning model
LLM progression score
opaque ranking system
```

without a deliberate architecture change.

---

# 184. Performance Requirements

Progression should execute effectively instantly on normal mobile hardware.

Typical input:

```text
current session
+
3-5 recent sessions
```

This is tiny.

Do not introduce unnecessary asynchronous complexity.

---

# 185. Logging

Development logs may record:

```text
exercise ID
engine version
classification
recommendation type
reason codes
confidence
```

Avoid unnecessary sensitive user data.

---

# 186. Debug Output

Development-only debug tooling may display:

```text
current target
session classification
recent trend
RPE metrics
selected increment
reason codes
final result
```

This will be useful for verifying progression during real gym testing.

---

# 187. Progression Definition of Done

The V1 progression engine is complete when:

- it is pure TypeScript
- it uses canonical kg
- it accepts working-set performance without network access
- warm-ups are excluded
- first-session behavior is defined
- insufficient-data behavior is defined
- weighted exercise progression is defined
- bodyweight progression is defined
- reps-only progression is defined
- same-load rep progression is deterministic
- load progression is deterministic
- load decrease requires repeated evidence
- one bad session does not automatically trigger a decrease
- mixed-load behavior is deterministic
- `increase_reps` has a precise meaning
- `repeat_target` has a precise meaning
- `maintain_weight` has a precise meaning
- `REP_RANGE_MAXED` exists and is used consistently
- optional RPE affects but does not control progression
- conservative/balanced/aggressive behavior is explicit
- trend calculation has a minimum-history requirement
- plateau detection requires multiple sessions
- e1RM uses one canonical implementation
- weight increments are centralized
- unreasonable increments are guarded
- confidence is deterministic
- reason codes are deterministic
- every major branch has tests
- multi-session golden tests pass
- identical inputs always produce identical outputs
- no AI or database dependency exists

---

# 188. Final Progression Decision Model

For weighted exercises:

```text
                     CURRENT SESSION
                            │
                            ▼
                    VALID / COMPARABLE?
                     │             │
                    NO            YES
                     │             │
                     ▼             ▼
              MAINTAIN /      CLASSIFY SESSION
           INSUFFICIENT DATA         │
                                     ▼
                             TOP OF RANGE?
                              │           │
                             YES         NO
                              │           │
                              ▼           ▼
                     INCREASE WEIGHT   SAME-LOAD
                                      PROGRESSION?
                                       │       │
                                      YES     NO
                                       │       │
                                       ▼       ▼
                               INCREASE REPS  UNDERPERFORM?
                                                │      │
                                               NO     YES
                                                │      │
                                                ▼      ▼
                                          REPEAT /   SINGLE?
                                          MAINTAIN    │
                                                    YES
                                                     │
                                                     ▼
                                               REPEAT TARGET
                                                     │
                                              repeated failure?
                                                     │
                                                     ▼
                                               DECREASE WEIGHT
```

Style, RPE, trend, and increment guardrails modify the thresholds around these decisions.

They do not replace the overall hierarchy.

---

# 189. Final Progression Principle

The progression engine should answer one practical gym question:

> Based on what I actually did, what should I try next time?

It should avoid both extremes:

```text
add weight every workout no matter what
```

and:

```text
never progress until every signal is perfect
```

The V1 engine should instead favor:

```text
small progression
repeatable targets
multiple-session evidence
clear explanations
```

The user should always be free to ignore the recommendation and train differently.

havAI records what actually happened and uses that result as the next input.
