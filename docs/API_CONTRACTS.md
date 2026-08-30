# havAI V1 API Contracts Specification

## 1. Purpose

This document defines the communication and type contracts between havAI's major system boundaries.

It covers:

- mobile application domain models
- local SQLite repositories
- Supabase PostgreSQL repositories
- synchronization contracts
- progression-engine contracts
- AI Edge Function request/response contracts
- standard success/error envelopes
- validation requirements
- canonical units
- timestamp semantics
- versioning rules

The purpose is to ensure that every layer of havAI agrees on:

```text
what data means
who owns it
how it is validated
how it moves between layers
what happens when something fails
```

Cursor must not invent incompatible payloads inside individual screens or services.

---

# 2. Contract Categories

havAI V1 has five major contract categories:

```text
1. Domain contracts
2. Local persistence contracts
3. Cloud persistence contracts
4. Sync contracts
5. Edge Function / AI contracts
```

The application should map between these intentionally.

---

# 3. High-Level Architecture

```text
MOBILE UI
   ↓
APPLICATION USE CASES
   ↓
DOMAIN CONTRACTS
   ↓
LOCAL REPOSITORIES
   ↓
SQLITE
   ↓
SYNC CONTRACTS
   ↓
REMOTE REPOSITORIES / ADAPTERS
   ↓
SUPABASE POSTGRESQL
```

AI path:

```text
MOBILE
   ↓
AI API CONTRACT
   ↓
SUPABASE EDGE FUNCTION
   ↓
OPENAI
   ↓
VALIDATED STRUCTURED RESPONSE
   ↓
MOBILE
```

---

# 4. Contract Principles

All contracts should be:

- explicit
- typed
- semantically clear
- validated at trust boundaries
- backwards-compatible where practical
- independent of UI implementation details
- aligned with canonical domain terminology

Avoid:

```ts
Record<string, any>;
```

for meaningful application boundaries.

---

# 5. Naming Conventions

## TypeScript / Domain

Use:

```text
camelCase
```

Example:

```ts
recommendedWeightKg;
```

---

## PostgreSQL

Use:

```text
snake_case
```

Example:

```text
recommended_weight_kg
```

---

## SQLite

Use:

```text
snake_case
```

Mapping belongs in repository/data-mapper code.

---

# 6. Shared Contract Location

Recommended:

```text
src/shared/contracts/
```

Suggested modules:

```text
common.ts
auth.ts
exercises.ts
templates.ts
workouts.ts
progression.ts
personalRecords.ts
sync.ts
ai.ts
errors.ts
```

---

# 7. Shared Runtime Schemas

Recommended:

```text
src/shared/schemas/
```

Use runtime validation for untrusted external data.

A TypeScript type alone is not runtime validation.

---

# 8. UUID Contract

All synchronizable primary entity IDs use UUID strings.

```ts
type UUID = string;
```

The application should validate UUID format at external boundaries.

---

# 9. Date-Time Contract

Canonical external/domain timestamp representation:

```ts
type ISODateTime = string;
```

Example:

```text
2026-08-13T23:14:52.123Z
```

Cloud timestamps use UTC.

---

# 10. Domain Event vs Server Metadata Time

These are different concepts.

## Domain Event Timestamps

Examples:

```text
workout.startedAt
workout.completedAt
set.completedAt
```

These may originate on the device because the app must function offline.

---

## Server Metadata Timestamps

Examples:

```text
created_at
updated_at
```

in Supabase.

These are server-controlled persistence metadata.

The client must not overwrite them as authoritative values during normal cloud upserts.

---

# 11. Canonical Weight Contract

Canonical internal and stored load unit:

```text
kilograms
```

Type:

```ts
type WeightKg = number;
```

Never expose ambiguous infrastructure fields such as:

```ts
weight: 185;
```

when unit semantics are unknown.

Use:

```ts
weightKg: 83.9146;
```

internally.

---

# 12. Display Weight Contract

UI-level representation may use:

```ts
type DisplayWeight = {
  value: number;
  unit: "lb" | "kg";
};
```

This does not replace canonical kg storage.

---

# 13. Weight Conversion Contract

```ts
interface WeightConverter {
  lbToKg(lb: number): number;

  kgToLb(kg: number): number;

  formatWeight(kg: number, displayUnit: "lb" | "kg"): string;
}
```

Use one implementation throughout the app.

---

# 14. Percent Convention

Percentage fields use decimal representation.

Example:

```ts
estimated1RMChangePct: 0.05;
```

means:

```text
5%
```

Not:

```text
0.05%
```

---

# 15. Duration Convention

Canonical duration:

```text
seconds
```

Example:

```ts
durationSeconds: 3840;
```

UI may format:

```text
1h 04m
```

---

# 16. Position Convention

Ordered entities use:

```text
0-based positions
```

This applies to:

```text
template exercises
workout exercises
sets
```

UI may display 1-based numbering.

---

# 17. RPE Contract

```ts
type RPE = 6 | 6.5 | 7 | 7.5 | 8 | 8.5 | 9 | 9.5 | 10;
```

Runtime validation:

```text
6 <= RPE <= 10
increment = 0.5
```

RPE remains optional.

---

# 18. Weight Unit Contract

```ts
type WeightUnit = "lb" | "kg";
```

---

# 19. Primary Goal Contract

```ts
type PrimaryGoal = "strength" | "hypertrophy" | "hybrid";
```

---

# 20. RPE Preference Contract

```ts
type RpePreference = "hidden" | "optional" | "preferred";
```

---

# 21. Progression Style Contract

```ts
type ProgressionStyle = "conservative" | "balanced" | "aggressive";
```

---

# 21A. Authentication Contract

```ts
type AuthUser = {
  id: string;
  email?: string;
};

type AuthSession = {
  user: AuthUser;
};

type AuthResult = {
  user: AuthUser;
  session: AuthSession | null;
};

type AuthErrorCode =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "email_already_registered"
  | "invalid_email"
  | "weak_password"
  | "rate_limited"
  | "network_error"
  | "unknown";
```

The authentication service exposes `signUp`, `signIn`, `signOut`, `getSession`, and
`subscribeToSession`. Session subscriptions receive only `AuthSession | null` and return a
plain unsubscribe function. Provider events, tokens, raw users, raw sessions, provider errors,
and provider subscription objects do not cross the service boundary.

---

# 22. User Profile Contract

```ts
type UserProfile = {
  userId: UUID;

  displayName?: string;

  weightUnit: WeightUnit;

  primaryGoal: PrimaryGoal;

  rpePreference: RpePreference;

  progressionStyle: ProgressionStyle;

  defaultRestDurationSeconds: number;

  onboardingCompleted: boolean;

  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};
```

`createdAt` and `updatedAt` in the domain model reflect persisted metadata after mapping.

They are not necessarily client-written cloud fields.

First-run setup accepts only `weightUnit` and `primaryGoal`; the application sets `rpePreference: "optional"`, `progressionStyle: "balanced"`, and the default rest duration. No advanced preference is a required onboarding input.

---

# 23. Muscle Group Contract

```ts
type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core"
  | "forearms"
  | "full_body"
  | "other";
```

---

# 24. Equipment Type Contract

```ts
type EquipmentType =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "bodyweight"
  | "smith_machine"
  | "plate_loaded"
  | "kettlebell"
  | "band"
  | "other";
```

---

# 25. Measurement Type Contract

```ts
type MeasurementType = "weight_reps" | "bodyweight_reps" | "reps_only";
```

---

# 26. Exercise Contract

```ts
type Exercise = {
  id: UUID;

  ownerUserId?: UUID;

  name: string;

  primaryMuscleGroup: MuscleGroup;

  secondaryMuscleGroups: MuscleGroup[];

  equipmentType: EquipmentType;

  measurementType: MeasurementType;

  isSystem: boolean;
  isArchived: boolean;

  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};
```

---

# 27. Exercise Access Semantics

System exercise:

```text
isSystem = true
ownerUserId = undefined
```

Custom exercise:

```text
isSystem = false
ownerUserId = current user
```

---

# 27A. User Exercise Preference Contract

```ts
type UserExercisePreference = {
  id: UUID;
  userId: UUID;
  exerciseId: UUID;
  isFavorite: boolean;
  notes?: string;
  restDurationSeconds?: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};
```

`restDurationSeconds`, when present, is a positive per-exercise override. The preference belongs to the user and never mutates the `Exercise` contract.

---

# 28. Workout Template Contract

```ts
type WorkoutTemplate = {
  id: UUID;
  userId: UUID;

  name: string;
  notes?: string;

  isArchived: boolean;

  exercises: WorkoutTemplateExercise[];

  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};
```

---

# 29. Workout Template Exercise Contract

```ts
type WorkoutTemplateExercise = {
  id: UUID;

  userId: UUID;

  templateId: UUID;
  exerciseId: UUID;

  position: number;

  targetSets: number;

  targetMinReps: number;
  targetMaxReps: number;

  notes?: string;

  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};
```

---

# 30. Create Workout Template Input

Application-layer input:

```ts
type CreateWorkoutTemplateInput = {
  name: string;

  notes?: string;

  exercises: {
    exerciseId: UUID;

    position: number;

    targetSets: number;

    targetMinReps: number;
    targetMaxReps: number;

    notes?: string;
  }[];
};
```

The use case generates:

```text
template UUID
template-exercise UUIDs
timestamps
sync metadata
```

---

# 31. Template Validation

Must validate:

```text
name not empty
at least one exercise
targetSets > 0
targetMinReps > 0
targetMaxReps >= targetMinReps
positions valid
exercise accessible
```

---

# 32. Workout Status Contract

```ts
type WorkoutStatus = "active" | "completed" | "discarded";
```

---

# 33. Workout Contract

```ts
type Workout = {
  id: UUID;
  userId: UUID;

  sourceTemplateId?: UUID;

  name: string;

  status: WorkoutStatus;

  startedAt: ISODateTime;
  completedAt?: ISODateTime;

  notes?: string;

  exercises: WorkoutExercise[];

  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};
```

---

# 34. Workout Exercise Contract

```ts
type WorkoutExercise = {
  id: UUID;

  userId: UUID;

  workoutId: UUID;
  exerciseId: UUID;

  position: number;

  targetSets?: number;
  targetMinReps?: number;
  targetMaxReps?: number;

  targetWeightKg?: number;

  sourceRecommendationId?: UUID;

  notes?: string;

  sets: WorkoutSet[];

  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};
```

---

# 35. Workout Set Type

```ts
type WorkoutSetType = "working" | "warmup";
```

---

# 36. Workout Set Contract

```ts
type WorkoutSet = {
  id: UUID;

  userId: UUID;

  workoutId: UUID;
  workoutExerciseId: UUID;
  exerciseId: UUID;

  position: number;

  setType: WorkoutSetType;

  weightKg?: number;

  reps: number;

  rpe?: RPE;

  notes?: string;

  completedAt: ISODateTime;

  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};
```

---

# 37. Complete Set Input

```ts
type CompleteSetInput = {
  workoutId: UUID;

  workoutExerciseId: UUID;

  exerciseId: UUID;

  setType: "working" | "warmup";

  weightKg?: number;

  reps: number;

  rpe?: RPE;

  notes?: string;
};
```

The use case supplies:

```text
id
userId
position
completedAt
createdAt
updatedAt
sync state
```

---

# 38. Complete Set Result

```ts
type CompleteSetResult = {
  set: WorkoutSet;

  feedback?: {
    type: "rep_improvement" | "matched_previous" | "personal_record";

    message: string;
  };
};
```

Success means:

```text
durably committed to SQLite
```

It does not imply cloud sync success.

---

# 39. Edit Set Input

```ts
type EditSetInput = {
  setId: UUID;

  weightKg?: number;

  reps: number;

  rpe?: RPE;

  notes?: string;
};
```

Normal edit flow does not permit arbitrary mutation of:

```text
workout ID
exercise ID
user ID
```

---

# 39A. Undo Set Completion Contract

```ts
type UndoSetCompletionInput = {
  setId: UUID;
};

type UndoSetCompletionResult = {
  restoredDraft: {
    weightKg?: number;
    reps: number;
    rpe?: RPE;
    notes?: string;
  };
};
```

The use case is valid only during the brief UI undo window. It transactionally reverts the local completion and coalesces the queue when unsynced, or creates the safe remote delete/update mutation when cloud-known. It does not use the later destructive-delete confirmation.

---

# 39B. Workout Note Input

```ts
type UpdateWorkoutNoteInput = {
  workoutId: UUID;
  notes?: string;
};
```

This is a normal local-first workout update and uses the workout sync contract.

---

# 40. Finish Workout Input

```ts
type FinishWorkoutInput = {
  workoutId: UUID;

  completedAt: ISODateTime;
};
```

The UI must not submit authoritative:

```text
PRs
summary totals
recommendations
```

Those are derived by application/domain logic.

---

# 41. Workout Summary Contract

```ts
type WorkoutSummary = {
  workoutId: UUID;

  durationSeconds: number;

  exerciseCount: number;

  workingSetCount: number;

  exerciseSummaries: ExerciseWorkoutSummary[];
};
```

---

# 42. Exercise Workout Summary

```ts
type ExerciseWorkoutSummary = {
  exerciseId: UUID;

  totalWorkingSets: number;

  totalReps: number;

  previousTotalReps?: number;

  repDelta?: number;

  bestSet?: {
    weightKg?: number;
    reps: number;
    rpe?: RPE;
  };

  detectedPRs: DetectedPersonalRecordType[];

  nextRecommendation?: ProgressionRecommendation;
};
```

---

# 43. Finish Workout Result

```ts
type FinishWorkoutResult = {
  workout: Workout;

  summary: WorkoutSummary;

  recommendations: ProgressionRecommendation[];

  personalRecords: DetectedPersonalRecord[];
};
```

---

# 44. Detected PR Type

Detected PR events:

```ts
type DetectedPersonalRecordType = "max_weight" | "estimated_1rm" | "rep_pr";
```

These represent events/achievements discovered from a workout.

---

# 45. Persisted PR Type

Persistent current PR state:

```ts
type PersistedPersonalRecordType = "max_weight" | "estimated_1rm";
```

`rep_pr` is deliberately excluded.

---

# 46. Detected Personal Record Contract

```ts
type DetectedPersonalRecord = {
  type: DetectedPersonalRecordType;

  exerciseId: UUID;

  workoutId: UUID;

  setId: UUID;

  weightKg?: number;

  reps?: number;

  estimated1RMKg?: number;

  achievedAt: ISODateTime;
};
```

---

# 47. Persisted Personal Record Contract

```ts
type PersonalRecord = {
  id: UUID;

  userId: UUID;

  exerciseId: UUID;

  recordType: PersistedPersonalRecordType;

  setId: UUID;

  workoutId: UUID;

  weightKg?: number;

  reps?: number;

  estimated1RMKg?: number;

  achievedAt: ISODateTime;

  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};
```

---

# 48. PR Persistence Principle

Do not create a permanent row for every:

```text
rep PR at every load
```

Only current:

```text
max_weight
estimated_1rm
```

state is persisted.

Rep PR remains derived/detected.

---

# 49. Progression Recommendation Type

```ts
type ProgressionRecommendationType =
  | "increase_weight"
  | "maintain_weight"
  | "increase_reps"
  | "repeat_target"
  | "decrease_weight"
  | "insufficient_data";
```

---

# 50. Recommendation Type Semantics

These meanings are locked.

## `increase_weight`

Recommended load increases.

---

## `increase_reps`

Load stays the same and the engine gives a higher explicit rep objective.

Example:

```text
185 × 8/7/6
→
185 × 8/7/7
```

---

## `repeat_target`

Repeat essentially the same intended load and rep target.

Used when the engine wants another attempt rather than advancement.

---

## `maintain_weight`

Load remains the same, but no precise higher set-by-set rep target is justified.

Typical use cases:

```text
mixed working loads
ambiguous successful session
non-precise same-load recommendation
```

---

## `decrease_weight`

Recommended load decreases.

---

## `insufficient_data`

The engine does not have enough information to generate a meaningful progression target.

---

# 51. Progression Confidence

```ts
type ProgressionConfidence = "low" | "medium" | "high";
```

This is deterministic engine confidence.

---

# 52. Progression Reason Codes

```ts
type ProgressionReasonCode =
  | "INITIAL_BASELINE_ESTABLISHED"
  | "TOP_OF_REP_RANGE_REACHED"
  | "REP_RANGE_EXCEEDED"
  | "REP_RANGE_MAXED"
  | "WITHIN_TARGET_RANGE"
  | "BELOW_TARGET_RANGE"
  | "TOTAL_REPS_IMPROVED"
  | "TOTAL_REPS_DECLINED"
  | "PERFORMANCE_REPEATED"
  | "RPE_ACCEPTABLE"
  | "RPE_HIGH"
  | "RPE_IMPROVED"
  | "RPE_WORSENED"
  | "RPE_UNAVAILABLE"
  | "INCOMPLETE_TARGET_SETS"
  | "EXTRA_SETS_PERFORMED"
  | "MIXED_WORKING_LOADS"
  | "SINGLE_SESSION_UNDERPERFORMANCE"
  | "REPEATED_UNDERPERFORMANCE"
  | "REPEATED_FAILED_PROGRESSION"
  | "UNUSUAL_PERFORMANCE_DROP"
  | "MULTI_SESSION_STALL"
  | "PLATEAU_DETECTED"
  | "ESTIMATED_1RM_IMPROVED"
  | "ESTIMATED_1RM_DECLINED"
  | "SMALLEST_INCREMENT_TOO_LARGE"
  | "INSUFFICIENT_HISTORY";
```

This list must stay synchronized with `PROGRESSION_ENGINE.md`.

---

# 53. Progression Recommendation Contract

```ts
type ProgressionRecommendation = {
  id: UUID;

  userId: UUID;
  exerciseId: UUID;

  sourceWorkoutId?: UUID;
  sourceWorkoutExerciseId?: UUID;

  recommendationType: ProgressionRecommendationType;

  recommendedWeightKg?: number;

  targetSets?: number;
  targetMinReps?: number;
  targetMaxReps?: number;

  targetSetReps?: number[];

  confidence: ProgressionConfidence;

  reasonCodes: ProgressionReasonCode[];

  status: "active" | "consumed" | "superseded";

  engineVersion: string;

  createdAt: ISODateTime;
  updatedAt: ISODateTime;

  consumedAt?: ISODateTime;
};
```

---

# 54. Progression Engine Input

```ts
type ProgressionInput = {
  exercise: {
    exerciseId: UUID;

    measurementType: MeasurementType;

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
    primaryGoal: PrimaryGoal;

    progressionStyle: ProgressionStyle;
  };

  availableWeightIncrementKg?: number;
};
```

---

# 55. Exercise Session Performance

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

Only relevant working sets should be supplied to normal progression logic.

---

# 56. Progression Result

```ts
type ProgressionResult = {
  recommendationType: ProgressionRecommendationType;

  recommendedWeightKg?: number;

  targetSets?: number;
  targetMinReps?: number;
  targetMaxReps?: number;

  targetSetReps?: number[];

  confidence: ProgressionConfidence;

  reasonCodes: ProgressionReasonCode[];

  engineVersion: string;
};
```

No AI prose belongs here.

---

# 57. Exercise Trend Contract

```ts
type ExerciseTrend = {
  direction: "improving" | "flat" | "declining" | "insufficient_data";

  sessionsAnalyzed: number;

  totalRepChange?: number;

  estimated1RMChangePct?: number;

  averageRpeChange?: number;

  plateau: "none" | "possible" | "likely";
};
```

---

# 58. Estimated 1RM Contract

```ts
type EstimatedOneRepMaxResult = {
  estimated1RMKg: number;

  sourceWeightKg: number;

  reps: number;

  formulaVersion: string;
};
```

---

# 59. Deterministic Explanation Contract

```ts
type BasicRecommendationExplanation = {
  title: string;

  reasons: string[];
};
```

Example:

```json
{
  "title": "Increase to 190 lb",
  "reasons": [
    "You reached the top of your target rep range.",
    "Your recorded effort was within the progression threshold."
  ]
}
```

This must work offline.

---

# 60. Repository Philosophy

UI components do not directly access:

```text
SQLite
Supabase tables
```

through raw queries.

They interact through:

```text
use cases
repositories
services
```

---

# 61. Local Workout Repository

```ts
interface LocalWorkoutRepository {
  getById(userId: UUID, id: UUID): Promise<Workout | null>;

  getActiveForUser(userId: UUID): Promise<Workout | null>;

  create(workout: Workout): Promise<void>;

  update(workout: Workout): Promise<void>;

  delete(userId: UUID, id: UUID): Promise<void>;
}
```

---

# 62. Local Set Repository

```ts
interface LocalSetRepository {
  getById(userId: UUID, id: UUID): Promise<WorkoutSet | null>;

  getForWorkoutExercise(userId: UUID, workoutExerciseId: UUID): Promise<WorkoutSet[]>;

  create(set: WorkoutSet): Promise<void>;

  update(set: WorkoutSet): Promise<void>;

  deleteOrTombstone(userId: UUID, id: UUID): Promise<void>;
}
```

---

# 63. Local Template Repository

```ts
interface LocalTemplateRepository {
  getById(userId: UUID, id: UUID): Promise<WorkoutTemplate | null>;

  listForUser(userId: UUID): Promise<WorkoutTemplate[]>;

  create(template: WorkoutTemplate): Promise<void>;

  update(template: WorkoutTemplate): Promise<void>;

  archive(userId: UUID, id: UUID): Promise<void>;
}
```

---

# 64. Local Exercise Repository

```ts
interface LocalExerciseRepository {
  getById(userId: UUID, id: UUID): Promise<Exercise | null>;

  listAccessible(userId: UUID): Promise<Exercise[]>;

  search(userId: UUID, query: string): Promise<Exercise[]>;

  upsert(exercise: Exercise): Promise<void>;

  archiveCustomExercise(userId: UUID, id: UUID): Promise<void>;
}
```

The picker service built on this repository exposes Popular, Favorites, Muscle Groups, and Search. Popular ordering is curated/deterministic; no social analytics contract exists.

```ts
interface LocalUserExercisePreferenceRepository {
  get(userId: UUID, exerciseId: UUID): Promise<UserExercisePreference | null>;
  listFavorites(userId: UUID): Promise<UserExercisePreference[]>;
  upsert(preference: UserExercisePreference): Promise<void>;
  deleteOrTombstone(userId: UUID, id: UUID): Promise<void>;
}
```

---

# 65. Local Recommendation Repository

```ts
interface LocalRecommendationRepository {
  getById(userId: UUID, id: UUID): Promise<ProgressionRecommendation | null>;

  getActiveForExercise(
    userId: UUID,
    exerciseId: UUID,
  ): Promise<ProgressionRecommendation | null>;

  upsert(recommendation: ProgressionRecommendation): Promise<void>;

  markConsumed(userId: UUID, id: UUID, consumedAt: ISODateTime): Promise<void>;

  supersede(userId: UUID, id: UUID): Promise<void>;
}
```

---

# 66. Exercise History Repository

```ts
interface ExerciseHistoryRepository {
  getRecentSessions(params: {
    userId: UUID;

    exerciseId: UUID;

    limit: number;
  }): Promise<ExerciseSessionPerformance[]>;

  getBestSet(params: {
    userId: UUID;

    exerciseId: UUID;
  }): Promise<WorkoutSet | null>;
}
```

The implementation may combine local cached history and cloud history depending on connectivity/state.

---

# 67. Workout History Repository

```ts
interface WorkoutHistoryRepository {
  getHistory(params: {
    userId: UUID;

    limit: number;

    cursor?: string;
  }): Promise<PaginatedResult<Workout>>;
}
```

---

# 68. Paginated Result

```ts
type PaginatedResult<T> = {
  items: T[];

  nextCursor?: string;
};
```

Do not expose Supabase-specific pagination internals to screens.

---

# 69. Local Mutation Result

```ts
type LocalMutationResult<T> = {
  data: T;

  syncState: "pending" | "synced";
};
```

A mutation is successful if local persistence succeeded.

---

# 70. Sync Entity Type

V1:

```ts
type SyncEntityType =
  | "workout_template"
  | "workout_template_exercise"
  | "custom_exercise"
  | "workout"
  | "workout_exercise"
  | "set"
  | "user_exercise_preference"
  | "progression_recommendation";
```

Do not include:

```text
personal_record
```

in V1 offline sync.

---

# 71. Sync Operation

```ts
type SyncOperation = "upsert" | "delete";
```

---

# 72. Sync Queue Item

```ts
type SyncQueueItem = {
  id: UUID;

  entityType: SyncEntityType;

  entityId: UUID;

  operation: SyncOperation;

  attemptCount: number;

  createdAt: ISODateTime;

  lastAttemptAt?: ISODateTime;

  lastError?: string;
};
```

---

# 73. Sync Result

```ts
type SyncResult = {
  success: boolean;

  processed: number;

  succeeded: number;

  failed: number;

  remainingQueueSize: number;

  errors: {
    queueItemId: UUID;

    entityType: SyncEntityType;

    entityId: UUID;

    code: string;
  }[];
};
```

---

# 74. Sync Queue Repository

```ts
interface SyncQueueRepository {
  enqueueOrCoalesce(item: SyncQueueItem): Promise<void>;

  getPending(): Promise<SyncQueueItem[]>;

  markAttempt(id: UUID, error?: string): Promise<void>;

  remove(id: UUID): Promise<void>;
}
```

---

# 75. Remote Sync Adapter

Conceptual:

```ts
interface RemoteSyncAdapter {
  upsertTemplate(template: WorkoutTemplate): Promise<RemoteMutationResult>;

  upsertTemplateExercise(
    exercise: WorkoutTemplateExercise,
  ): Promise<RemoteMutationResult>;

  upsertCustomExercise(exercise: Exercise): Promise<RemoteMutationResult>;

  upsertUserExercisePreference(
    preference: UserExercisePreference,
  ): Promise<RemoteMutationResult>;

  upsertWorkout(workout: Workout): Promise<RemoteMutationResult>;

  upsertWorkoutExercise(
    exercise: WorkoutExercise,
  ): Promise<RemoteMutationResult>;

  upsertSet(set: WorkoutSet): Promise<RemoteMutationResult>;

  deleteSet(id: UUID): Promise<void>;

  deleteUserExercisePreference(id: UUID): Promise<void>;

  upsertProgressionRecommendation(
    recommendation: ProgressionRecommendation,
  ): Promise<RemoteMutationResult>;
}
```

Actual implementation may split this by domain.

---

# 76. Remote Mutation Result

```ts
type RemoteMutationResult = {
  serverUpdatedAt?: ISODateTime;
};
```

This allows local persistence to update its last-known cloud metadata.

---

# 77. Remote Mapper Timestamp Rule

When mapping domain objects to cloud write payloads:

Do not send:

```text
createdAt
updatedAt
serverUpdatedAt
```

as authoritative PostgreSQL metadata during normal upserts.

Allow server:

```text
created_at
updated_at
```

to control persistence metadata.

---

# 78. Domain Event Timestamp Rule

Remote payloads may include real domain timestamps such as:

```text
startedAt
completedAt
set.completedAt
recommendation.consumedAt
```

because those represent user/application events.

---

# 79. Local Sync Metadata Is Not Domain Data

Fields such as:

```text
sync_status
server_updated_at
deleted_at
```

belong to local persistence/infrastructure contracts.

They should not be added to normal domain types unless a specific feature needs them.

---

# 80. Local Persistence Row Example

Conceptually:

```ts
type LocalSetRow = {
  id: string;

  user_id: string;

  workout_id: string;

  workout_exercise_id: string;

  exercise_id: string;

  position: number;

  set_type: string;

  weight_kg: number | null;

  reps: number;

  rpe: number | null;

  notes: string | null;

  completed_at: string;

  sync_status: string;

  deleted_at: string | null;

  created_at: string;

  updated_at: string;

  server_updated_at: string | null;
};
```

This is a persistence shape, not a domain model.

---

# 81. Supabase Set Row Example

```ts
type SetRow = {
  id: string;

  user_id: string;

  workout_id: string;

  workout_exercise_id: string;

  exercise_id: string;

  position: number;

  set_type: "working" | "warmup";

  weight_kg: number | null;

  reps: number;

  rpe: number | null;

  notes: string | null;

  completed_at: string;

  created_at: string;

  updated_at: string;
};
```

---

# 82. Row-to-Domain Mapper

Example:

```ts
function mapSetRowToDomain(row: SetRow): WorkoutSet {
  return {
    id: row.id,
    userId: row.user_id,
    workoutId: row.workout_id,
    workoutExerciseId: row.workout_exercise_id,
    exerciseId: row.exercise_id,
    position: row.position,
    setType: row.set_type,
    weightKg: row.weight_kg ?? undefined,
    reps: row.reps,
    rpe: row.rpe as RPE | undefined,
    notes: row.notes ?? undefined,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

Mapping must be centralized.

---

# 83. Local Recommendation Persistence Requirement

The local recommendation representation must preserve all fields required by:

```ts
ProgressionRecommendation;
```

including:

```text
sourceWorkoutId
sourceWorkoutExerciseId
status
reasonCodes
engineVersion
consumedAt
createdAt
updatedAt
```

A reduced cache-only recommendation object is not sufficient.

---

# 84. Personal Record Sync Rule

There is no:

```ts
SyncEntityType = "personal_record";
```

in V1.

Persistent PR state is recalculated from raw history after synchronization.

---

# 85. API Success Envelope

For Edge Functions:

```ts
type ApiSuccess<T> = {
  ok: true;

  data: T;

  meta?: {
    requestId?: string;
  };
};
```

---

# 86. API Error Envelope

```ts
type ApiErrorResponse = {
  ok: false;

  error: {
    code: ApiErrorCode;

    message: string;

    retryable: boolean;
  };

  meta?: {
    requestId?: string;
  };
};
```

---

# 87. API Error Codes

```ts
type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INVALID_REQUEST"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "AI_TIMEOUT"
  | "AI_PROVIDER_ERROR"
  | "AI_INVALID_RESPONSE"
  | "AI_CONTEXT_ERROR"
  | "INTERNAL_ERROR";
```

Local-only errors may use application-specific codes separately.

---

# 88. Local Application Errors

Recommended classes/categories:

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

Screens should not parse raw provider/database messages.

---

# 89. HTTP Status Mapping

Recommended:

```text
200 success

400 invalid request

401 unauthenticated

403 forbidden

404 not found

429 rate limited

500 internal error

502 / 503 upstream provider failure where appropriate
```

Structured error code remains the primary semantic contract.

---

# 90. Error Message Rule

Do not expose:

```text
SQL
stack traces
service-role details
raw OpenAI errors
database connection details
```

to the client.

---

# 91. Retryable Semantics

Examples:

```text
AI_TIMEOUT
→ retryable = true
```

```text
AI_PROVIDER_ERROR
→ potentially true
```

```text
INVALID_REQUEST
→ false
```

```text
FORBIDDEN
→ false
```

---

# 92. Edge Function Rules

Every havAI AI Edge Function must:

1. require authenticated user
2. validate request
3. verify referenced resource ownership
4. build server-trusted context
5. call provider server-side
6. validate provider output
7. return standard envelope
8. avoid raw error leakage

---

# 93. Coach Endpoint

Conceptual route:

```text
POST /functions/v1/coach
```

Authentication required.

---

# 94. Coach Request V1

```ts
type CoachRequestV1 = {
  message: string;

  context?: {
    activeWorkoutId?: UUID;

    activeExerciseId?: UUID;

    localCurrentSession?: {
      workoutId: UUID;

      exerciseId: UUID;

      currentTarget?: {
        weightKg?: number;

        minReps: number;

        maxReps: number;

        targetSets: number;
      };

      completedSets: {
        weightKg?: number;

        reps: number;

        rpe?: RPE;

        notes?: string;
      }[];

      workoutNotes?: string;

      exercisePreferenceNotes?: string;
    };
  };

  conversation?: {
    messages: {
      role: "user" | "assistant";

      content: string;
    }[];
  };
};
```

---

# 95. Coach Request Constraints

Validate:

```text
message non-empty
message bounded length
conversation bounded
completedSets bounded
notes bounded individually and in aggregate
UUIDs valid
RPE valid
weights valid
```

The client may not send unlimited workout history.

---

# 96. Coach Server Flow

```text
authenticate
↓
validate request
↓
verify referenced ownership
↓
load profile
↓
load recent history
↓
load current recommendation
↓
merge validated local session context
↓
build minimal AI context
↓
call OpenAI
↓
validate structured response
↓
return
```

---

# 97. Coach Response V1

```ts
type CoachResponseV1 = {
  answer: string;

  recommendation?: {
    action: string;

    rationale: string;
  };

  warnings: string[];

  contextUsed: {
    activeWorkout: boolean;

    exerciseId?: UUID;

    recentSessionsUsed: number;

    subjectiveNotesUsed: {
      exercisePreference: boolean;
      workout: boolean;
      setCount: number;
    };
  };

  meta: {
    promptVersion: string;
  };
};
```

---

# 98. Coach Success Example

```json
{
  "ok": true,
  "data": {
    "answer": "Keep 190 lb for the next set. Your first set reached 6 reps at RPE 10, so increasing the load would not make sense.",
    "recommendation": {
      "action": "Keep 190 lb",
      "rationale": "Your first set already reached maximal effort."
    },
    "warnings": [],
    "contextUsed": {
      "activeWorkout": true,
      "exerciseId": "uuid",
      "recentSessionsUsed": 3
    },
    "meta": {
      "promptVersion": "coach-v1"
    }
  }
}
```

---

# 99. Coach Offline Behavior

If clearly offline:

```text
do not invoke Edge Function
```

Return local application state such as:

```text
AI_OFFLINE
```

Core workout remains usable.

---

# 100. Explain Recommendation Endpoint

Conceptual route:

```text
POST /functions/v1/explain-recommendation
```

Authentication required.

---

# 101. Explain Recommendation Request

```ts
type ExplainRecommendationRequestV1 = {
  recommendationId: UUID;
};
```

The client does not send recommendation fields as authoritative context.

---

# 102. Explain Recommendation Server Flow

```text
authenticate
↓
validate recommendation ID
↓
load recommendation
↓
verify user ownership
↓
load source workout/exercise
↓
load relevant history
↓
build context
↓
call AI
↓
validate response
```

---

# 103. Recommendation Explanation Response

```ts
type RecommendationExplanationV1 = {
  headline: string;

  summary: string;

  evidence: string[];

  caution?: string;

  meta: {
    promptVersion: string;
  };
};
```

---

# 104. Explanation Contract Rule

The AI explanation may clarify:

```text
why the engine produced the recommendation
```

It must not silently replace:

```text
the canonical progression recommendation
```

If data appears inconsistent, it may flag that inconsistency.

---

# 105. Parse Workout Endpoint

Conceptual route:

```text
POST /functions/v1/parse-workout
```

Authentication required.

---

# 106. Parse Workout Request

```ts
type ParseWorkoutRequestV1 = {
  text: string;

  exerciseId: UUID;

  displayUnit: WeightUnit;
};
```

Exercise identity should normally already be known from current exercise context.

---

# 107. Parse Workout Response

```ts
type ParseWorkoutResponseV1 = {
  sets: {
    weight?: number;

    unit?: WeightUnit;

    reps: number;

    rpe?: RPE;
  }[];

  confidence: "low" | "medium" | "high";

  ambiguities: string[];

  meta: {
    promptVersion: string;
  };
};
```

---

# 108. Parser Rule

Parser output is:

```text
candidate input
```

not canonical stored workout data.

---

# 109. Parser Confirmation Contract

After user confirmation, convert display values into canonical data:

```ts
type ParsedSetConfirmation = {
  sets: {
    weightKg?: number;

    reps: number;

    rpe?: RPE;
  }[];
};
```

Then pass through normal:

```text
completeSet()
```

logic.

---

# 110. Parser No-Mutation Rule

The parser must never directly:

```text
INSERT sets
UPDATE workout
```

It only returns interpreted structure.

---

# 111. Parser Ambiguity Rule

Input:

```text
185 for 8 7 maybe 9
```

should not blindly invent whether:

```text
9 = reps
```

or:

```text
9 = RPE
```

It should surface ambiguity.

---

# 112. AI Structured Output Validation

Machine-consumed AI output must be runtime validated.

Flow:

```text
provider response
↓
schema validation
↓
valid?
```

If no:

```text
controlled retry/repair at most once
or
AI_INVALID_RESPONSE
```

---

# 113. AI Model Names

Model configuration remains server-side.

Do not include model names in mobile contracts unless required for diagnostics.

---

# 114. Prompt Versions

Responses may expose:

```text
coach-v1
explanation-v1
parser-v1
```

for debugging/evaluation.

---

# 115. Request ID

Edge Functions should generate or propagate request identifiers.

Example:

```json
{
  "meta": {
    "requestId": "req_..."
  }
}
```

Useful for debugging without leaking internal errors.

---

# 116. AI Conversation Message Contract

Client-session model:

```ts
type CoachMessage = {
  id: UUID;

  role: "user" | "assistant";

  content: string;

  createdAt: ISODateTime;
};
```

V1 does not require cloud persistence.

---

# 117. AI Warning Contract

V1:

```ts
warnings: string[];
```

Structured warning categories may be added later if needed.

---

# 118. API Request Versioning

Initial contract generation:

```text
v1
```

Breaking changes require deliberate version handling.

---

# 119. Breaking Changes

Examples:

```text
rename required response field
change field semantics
change weight unit meaning
remove required field
change recommendation-type meaning
```

These require explicit migration/version consideration.

---

# 120. Non-Breaking Changes

Typically:

```text
add optional response field
add optional metadata
```

Enum changes require caution because exhaustive client switches may fail.

---

# 121. Enum Handling Rule

At external boundaries, unexpected future enum values should fail validation or use a safe explicit fallback.

Do not silently map unknown semantic values to arbitrary existing values.

---

# 122. Supabase Generated Types

Use Supabase-generated DB types for persistence shapes.

Example:

```ts
Database["public"]["Tables"]["sets"]["Row"];
```

These are not domain models.

---

# 123. Database vs Domain Contract

Example:

Cloud:

```text
weight_kg: null
```

Domain:

```text
weightKg?: number
```

Mapper owns this distinction.

---

# 124. SQLite vs Domain Contract

Example:

SQLite:

```text
is_system = 1
```

Domain:

```ts
isSystem: true;
```

Mapper owns conversion.

---

# 125. Sync Status Is Persistence State

Fields such as:

```text
pending_create
pending_update
pending_delete
failed
```

belong to local persistence/sync layers.

They should not define normal workout-domain semantics.

---

# 126. Template Remote Write Rule

A remote template upsert payload should contain meaningful cloud-writable fields such as:

```text
id
user_id
name
notes
is_archived
```

but omit:

```text
created_at
updated_at
server_updated_at
sync_status
```

---

# 127. Workout Remote Write Rule

Cloud-writable fields include:

```text
id
user_id
source_template_id
name
status
started_at
completed_at
notes
```

Server metadata omitted.

---

# 128. Set Remote Write Rule

Cloud-writable fields:

```text
id
user_id
workout_id
workout_exercise_id
exercise_id
position
set_type
weight_kg
reps
rpe
notes
completed_at
```

Do not upload local sync metadata.

User exercise preference cloud-writable fields are exactly:

```text
id
user_id
exercise_id
is_favorite
notes
rest_duration_seconds
```

The referenced exercise must be remotely available first.

---

# 129. Recommendation Remote Write Rule

Cloud-writable fields include:

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
```

Cloud controls persistence metadata.

---

# 130. Personal Record Cloud Write Rule

Persistent PR state contains only:

```text
max_weight
estimated_1rm
```

No sync-queue contract exists.

When recalculated, cloud PR write uses normal repository logic.

---

# 131. Cloud Pull Contract

Conceptually:

```ts
type PullUpdatesResult = {
  templates: WorkoutTemplate[];

  exercises: Exercise[];

  userExercisePreferences: UserExercisePreference[];

  recommendations: ProgressionRecommendation[];

  recentExerciseSessions: ExerciseSessionPerformance[];

  serverTime: ISODateTime;
};
```

Actual implementation may use multiple Supabase queries.

This is a conceptual domain result, not necessarily one endpoint.

---

# 132. Pull Conflict Rule

A cloud pull must not overwrite:

```text
dirty local authored entity
active workout snapshot
```

without explicit conflict handling.

---

# 133. Active Workout Contract Rule

An active workout is never sourced from remote query cache alone.

It must be persisted and restored through SQLite.

---

# 134. Query Cache Rule

If using TanStack Query:

Use it for:

```text
remote/server state
```

Do not use it as the canonical active workout store.

---

# 135. Query Key Factory

If TanStack Query is used, centralize keys.

Example:

```ts
const workoutKeys = {
  all: ["workouts"] as const,

  history: (userId: UUID) => ["workouts", "history", userId] as const,

  detail: (id: UUID) => ["workouts", "detail", id] as const,
};
```

---

# 136. Cache Invalidation Example

After remote workout sync:

Potential invalidation:

```text
workout history
exercise history
progress analytics
recommendations
```

Local SQLite remains independent.

---

# 137. Error Typing Philosophy

Choose one consistent internal failure pattern.

Recommended:

```text
throw typed application errors
```

from repositories/services.

Do not mix:

```text
throw
null
false
{ error }
```

for comparable failure modes.

---

# 138. App Error Base

Conceptually:

```ts
class AppError extends Error {
  code: string;

  cause?: unknown;
}
```

Specific subclasses add meaning.

---

# 139. UI Error Mapping

Example:

```text
StorageError
→ "Couldn't safely save this set."

NetworkError
→ "You're offline. Your workout is saved locally."

AIServiceError
→ "Coach is unavailable right now."
```

---

# 140. Storage Failure Semantics

A SQLite write failure is materially different from a cloud failure.

Local save failure:

```text
mutation unsuccessful
```

Cloud sync failure:

```text
mutation successful locally
sync pending
```

Contracts and UI must preserve this distinction.

---

# 141. Authorization Rule

A valid authentication token is not enough.

If request contains:

```text
workoutId
exerciseId
recommendationId
```

the server must verify user ownership/access.

---

# 142. RLS Rule

Direct Supabase CRUD must be protected by RLS.

Child-table policies must also validate parent ownership.

Client filters alone are not security.

---

# 143. Cross-User Reference Protection

A client must not be able to create:

```text
User A set
→ User B workout
```

even if:

```text
sets.user_id = User A
```

Database/RLS rules must reject this.

---

# 144. Input Size Limits

Set reasonable limits on:

```text
Coach message
conversation history
parser text
current-session set arrays
```

Exact numeric limits should live in code/config once implemented.

---

# 145. Empty Value Convention

Prefer:

```text
undefined / omitted
```

in domain objects for optional values.

Persistence mappers convert:

```text
null ↔ undefined
```

consistently.

Avoid random mixing of:

```text
null
undefined
""
```

for the same semantic state.

---

# 146. Boolean Convention

Domain/API:

```text
true / false
```

SQLite mapper may represent:

```text
1 / 0
```

internally.

---

# 147. API Contract Test Requirements

Every Edge Function should test:

```text
valid request
missing auth
invalid auth
invalid UUID
resource owned by another user
malformed body
provider failure
malformed AI response
successful response
```

---

# 148. Shared Schema Tests

Ensure runtime schemas and TypeScript contracts stay aligned.

Avoid copying competing definitions manually across folders.

---

# 149. Contract Fixtures

Recommended:

```text
tests/fixtures/contracts/
```

Examples:

```text
workout.json
progression-result.json
coach-request.json
coach-response.json
explanation-response.json
parse-workout-response.json
sync-queue-item.json
```

---

# 150. Contract Fixture Principle

Fixtures should use realistic data.

Example:

```text
Incline Barbell Bench Press
185 lb × 8/7/6
```

not meaningless placeholder values when semantics matter.

---

# 151. Contract Ownership

This document defines intended semantics.

After implementation, runtime schemas and TypeScript contracts become executable sources of truth.

If code intentionally changes a contract:

```text
update code
+
update this document
```

Do not allow silent drift.

---

# 152. Recommended Shared Structure

```text
src/shared/
├── contracts/
│   ├── common.ts
│   ├── auth.ts
│   ├── exercises.ts
│   ├── templates.ts
│   ├── workouts.ts
│   ├── progression.ts
│   ├── personalRecords.ts
│   ├── sync.ts
│   ├── ai.ts
│   └── errors.ts
│
└── schemas/
```

---

# 153. Shared Client/Edge Function Contracts

If Edge Functions cannot import mobile source cleanly:

Create a true shared module/package.

Do not manually maintain two independent versions of:

```text
CoachRequestV1
CoachResponseV1
ParseWorkoutResponseV1
```

unless tooling constraints absolutely require it.

---

# 154. Generated Type Rule

Do not manually edit Supabase-generated database type files.

Regenerate them after schema migrations.

---

# 155. Contract Evolution Example

Safe future addition:

```ts
suggestedRestSeconds?: number;
```

to Coach response.

Old clients can ignore it.

---

# 156. Dangerous Evolution Example

Changing:

```text
recommendedWeightKg
```

to mean pounds would be catastrophic.

Unit meaning is part of the contract.

Never change it invisibly.

---

# 157. Measurement Naming Rule

Prefer explicit names:

```text
weightKg
durationSeconds
estimated1RMKg
estimated1RMChangePct
```

Avoid ambiguous infrastructure names:

```text
weight
duration
change
```

---

# 158. Cursor Contract Rule

Cursor must not invent a new cross-layer request/response shape inside a screen.

Before adding:

```text
new API call
new repository method
new sync entity
new AI field
```

it must identify or update the relevant contract.

---

# 159. Contract Review Checklist

For any new boundary-crossing feature, answer:

```text
What is the request?

What is the response?

Who owns the data?

Who validates it?

What is authoritative?

What happens offline?

What happens on failure?

Is the change backwards-compatible?
```

---

# 160. API Contract Definition of Done

The V1 contract layer is complete when:

- all core domain entities are typed
- canonical weight is kilograms
- all ordered positions are 0-based
- domain event timestamps and server metadata timestamps are distinct
- raw cloud rows map through dedicated mappers
- SQLite rows map through dedicated mappers
- local sync metadata does not leak into domain types
- user exercise preferences, workout notes, and set notes agree with database and sync contracts
- set-completion Undo has an explicit local-first contract
- template contracts support authoritative offline storage
- custom exercises can exist before cloud sync
- workout mutations have defined inputs/results
- progression input/output is deterministic and typed
- `REP_RANGE_MAXED` is represented if used
- recommendation-type meanings are explicit
- detected PR types are separated from persisted PR types
- `rep_pr` is not a persistent PR-state type
- `personal_record` is not a sync queue entity
- local recommendations preserve full syncable data
- sync entity types match the offline specification
- remote mappers omit client-controlled cloud metadata timestamps
- Edge Functions use standard success/error envelopes
- AI responses are runtime validated
- AI endpoints require authentication
- AI endpoints verify resource ownership
- AI cannot directly mutate workout history
- client-generated UUIDs support idempotent retries
- RLS protects against cross-user parent-reference attacks
- breaking semantic changes require deliberate versioning

---

# 161. Final Contract Architecture

```text
                        MOBILE UI
                            │
                            ▼
                    APPLICATION USE CASES
                            │
                            ▼
                      DOMAIN CONTRACTS
                            │
            ┌───────────────┴────────────────┐
            │                                │
            ▼                                ▼
       LOCAL REPOS                     CLOUD REPOS
            │                                │
            ▼                                ▼
         SQLITE                          SUPABASE
            │
            ▼
        SYNC QUEUE
            │
            ▼
       SYNC CONTRACTS
            │
            ▼
       REMOTE ADAPTERS


                        MOBILE APP
                            │
                            ▼
                      AI CONTRACTS
                            │
                            ▼
                    SUPABASE FUNCTION
                            │
                      AUTH + VALIDATION
                            │
                            ▼
                         OPENAI
                            │
                            ▼
                  STRUCTURED AI RESPONSE
```

---

# 162. Final API Principle

The purpose of a contract is to make incorrect behavior difficult.

A screen should not be able to accidentally:

```text
send pounds where kilograms are expected

treat a cloud failure as a local-save failure

upload local sync metadata into PostgreSQL

persist rep PRs as permanent PR state

queue personal records for offline synchronization

save raw AI output as workout history

attach User A's set to User B's workout

create duplicate rows because a sync retry occurred
```

without violating an explicit type, validation rule, repository boundary, or database security rule.

havAI's contract layer exists to ensure that the architecture defined by the PRD, Database, Offline/Sync, Progression, AI, and Testing specifications remains consistent during implementation.
