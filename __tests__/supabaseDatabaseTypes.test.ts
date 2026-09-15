import type { Database } from "@/lib/supabase/database.types";

type PublicTables = Database["public"]["Tables"];
type PublicTableName = keyof PublicTables;
type HasGeneratedShapes<Name extends PublicTableName> =
  PublicTables[Name] extends {
    Row: object;
    Insert: object;
    Update: object;
    Relationships: readonly unknown[];
  }
    ? true
    : false;

const tableNames = [
  "exercise_secondary_muscles",
  "exercises",
  "personal_records",
  "profiles",
  "progression_recommendations",
  "sets",
  "user_exercise_preferences",
  "workout_exercises",
  "workout_template_exercises",
  "workout_templates",
  "workouts",
] satisfies PublicTableName[];

const generatedShapes = {
  exercise_secondary_muscles: true,
  exercises: true,
  personal_records: true,
  profiles: true,
  progression_recommendations: true,
  sets: true,
  user_exercise_preferences: true,
  workout_exercises: true,
  workout_template_exercises: true,
  workout_templates: true,
  workouts: true,
} satisfies {
  [Name in PublicTableName]: HasGeneratedShapes<Name>;
};

const exerciseInsertWithoutServerMetadata: PublicTables["exercises"]["Insert"] = {
  equipment_type: "barbell",
  id: "exercise-id",
  measurement_type: "weight_reps",
  name: "Bench Press",
  primary_muscle_group: "chest",
};

const nullableColumns = {
  exerciseOwner: null as PublicTables["exercises"]["Row"]["owner_user_id"],
  recordWeight: null as PublicTables["personal_records"]["Row"]["weight_kg"],
  recommendationSource: null as PublicTables["progression_recommendations"]["Row"]["source_workout_id"],
  setNote: null as PublicTables["sets"]["Row"]["notes"],
  preferenceNote: null as PublicTables["user_exercise_preferences"]["Row"]["notes"],
  preferenceRestDuration: null as PublicTables["user_exercise_preferences"]["Row"]["rest_duration_seconds"],
  workoutCompletion: null as PublicTables["workouts"]["Row"]["completed_at"],
  workoutSourceTemplate: null as PublicTables["workouts"]["Row"]["source_template_id"],
};

const relationshipNames = [
  "exercise_secondary_muscles_exercise_id_fkey",
  "personal_records_exercise_id_fkey",
  "personal_records_owned_workout_fkey",
  "personal_records_source_set_fkey",
  "progression_recommendations_exercise_id_fkey",
  "progression_recommendations_source_ancestry_fkey",
  "progression_recommendations_source_exercise_fkey",
  "progression_recommendations_source_workout_fkey",
  "sets_exercise_id_fkey",
  "sets_owned_workout_fkey",
  "sets_workout_exercise_identity_fkey",
  "user_exercise_preferences_exercise_id_fkey",
  "workout_exercises_exercise_id_fkey",
  "workout_exercises_owned_source_recommendation_fkey",
  "workout_exercises_owned_workout_fkey",
  "workout_template_exercises_exercise_id_fkey",
  "workout_template_exercises_owned_template_fkey",
  "workouts_owned_source_template_fkey",
] satisfies Array<
  | PublicTables["exercise_secondary_muscles"]["Relationships"][number]["foreignKeyName"]
  | PublicTables["personal_records"]["Relationships"][number]["foreignKeyName"]
  | PublicTables["progression_recommendations"]["Relationships"][number]["foreignKeyName"]
  | PublicTables["sets"]["Relationships"][number]["foreignKeyName"]
  | PublicTables["user_exercise_preferences"]["Relationships"][number]["foreignKeyName"]
  | PublicTables["workout_exercises"]["Relationships"][number]["foreignKeyName"]
  | PublicTables["workout_template_exercises"]["Relationships"][number]["foreignKeyName"]
  | PublicTables["workouts"]["Relationships"][number]["foreignKeyName"]
>;

describe("generated Supabase database types", () => {
  it("exposes every cloud table implemented through Task 13.11", () => {
    expect(tableNames).toEqual([
      "exercise_secondary_muscles",
      "exercises",
      "personal_records",
      "profiles",
      "progression_recommendations",
      "sets",
      "user_exercise_preferences",
      "workout_exercises",
      "workout_template_exercises",
      "workout_templates",
      "workouts",
    ]);
  });

  it("provides generated Row, Insert, Update, and Relationships shapes", () => {
    expect(Object.values(generatedShapes)).toEqual(Array(11).fill(true));
  });

  it("preserves nullable columns and optional server metadata", () => {
    expect(nullableColumns).toEqual({
      exerciseOwner: null,
      recordWeight: null,
      recommendationSource: null,
      setNote: null,
      preferenceNote: null,
      preferenceRestDuration: null,
      workoutCompletion: null,
      workoutSourceTemplate: null,
    });
    expect(exerciseInsertWithoutServerMetadata).not.toHaveProperty("created_at");
    expect(exerciseInsertWithoutServerMetadata).not.toHaveProperty("updated_at");
  });

  it("includes the relationships emitted for the current schema", () => {
    expect(relationshipNames).toHaveLength(18);
  });
});
