export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      exercise_secondary_muscles: {
        Row: {
          exercise_id: string
          muscle_group: string
        }
        Insert: {
          exercise_id: string
          muscle_group: string
        }
        Update: {
          exercise_id?: string
          muscle_group?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_secondary_muscles_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          equipment_type: string
          id: string
          is_archived: boolean
          is_system: boolean
          measurement_type: string
          name: string
          owner_user_id: string | null
          primary_muscle_group: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          equipment_type: string
          id: string
          is_archived?: boolean
          is_system?: boolean
          measurement_type: string
          name: string
          owner_user_id?: string | null
          primary_muscle_group: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          equipment_type?: string
          id?: string
          is_archived?: boolean
          is_system?: boolean
          measurement_type?: string
          name?: string
          owner_user_id?: string | null
          primary_muscle_group?: string
          updated_at?: string
        }
        Relationships: []
      }
      personal_records: {
        Row: {
          achieved_at: string
          created_at: string
          estimated_1rm_kg: number | null
          exercise_id: string
          id: string
          record_type: string
          reps: number | null
          set_id: string
          updated_at: string
          user_id: string
          weight_kg: number | null
          workout_id: string
        }
        Insert: {
          achieved_at: string
          created_at?: string
          estimated_1rm_kg?: number | null
          exercise_id: string
          id: string
          record_type: string
          reps?: number | null
          set_id: string
          updated_at?: string
          user_id: string
          weight_kg?: number | null
          workout_id: string
        }
        Update: {
          achieved_at?: string
          created_at?: string
          estimated_1rm_kg?: number | null
          exercise_id?: string
          id?: string
          record_type?: string
          reps?: number | null
          set_id?: string
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_owned_workout_fkey"
            columns: ["workout_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "personal_records_source_set_fkey"
            columns: ["set_id", "user_id", "workout_id", "exercise_id"]
            isOneToOne: false
            referencedRelation: "sets"
            referencedColumns: ["id", "user_id", "workout_id", "exercise_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          default_rest_duration_seconds: number
          display_name: string | null
          onboarding_completed: boolean
          primary_goal: string
          progression_style: string
          rpe_preference: string
          updated_at: string
          user_id: string
          weight_unit: string
        }
        Insert: {
          created_at?: string
          default_rest_duration_seconds?: number
          display_name?: string | null
          onboarding_completed?: boolean
          primary_goal: string
          progression_style?: string
          rpe_preference?: string
          updated_at?: string
          user_id: string
          weight_unit: string
        }
        Update: {
          created_at?: string
          default_rest_duration_seconds?: number
          display_name?: string | null
          onboarding_completed?: boolean
          primary_goal?: string
          progression_style?: string
          rpe_preference?: string
          updated_at?: string
          user_id?: string
          weight_unit?: string
        }
        Relationships: []
      }
      progression_recommendations: {
        Row: {
          confidence: string
          consumed_at: string | null
          created_at: string
          engine_version: string
          exercise_id: string
          id: string
          reason_codes: Json
          recommendation_type: string
          recommended_weight_kg: number | null
          source_workout_exercise_id: string | null
          source_workout_id: string | null
          status: string
          target_max_reps: number | null
          target_min_reps: number | null
          target_set_reps: Json | null
          target_sets: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence: string
          consumed_at?: string | null
          created_at?: string
          engine_version: string
          exercise_id: string
          id: string
          reason_codes: Json
          recommendation_type: string
          recommended_weight_kg?: number | null
          source_workout_exercise_id?: string | null
          source_workout_id?: string | null
          status: string
          target_max_reps?: number | null
          target_min_reps?: number | null
          target_set_reps?: Json | null
          target_sets?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: string
          consumed_at?: string | null
          created_at?: string
          engine_version?: string
          exercise_id?: string
          id?: string
          reason_codes?: Json
          recommendation_type?: string
          recommended_weight_kg?: number | null
          source_workout_exercise_id?: string | null
          source_workout_id?: string | null
          status?: string
          target_max_reps?: number | null
          target_min_reps?: number | null
          target_set_reps?: Json | null
          target_sets?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progression_recommendations_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progression_recommendations_source_ancestry_fkey"
            columns: [
              "source_workout_exercise_id",
              "user_id",
              "source_workout_id",
              "exercise_id",
            ]
            isOneToOne: false
            referencedRelation: "workout_exercises"
            referencedColumns: ["id", "user_id", "workout_id", "exercise_id"]
          },
          {
            foreignKeyName: "progression_recommendations_source_exercise_fkey"
            columns: ["source_workout_exercise_id", "user_id", "exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_exercises"
            referencedColumns: ["id", "user_id", "exercise_id"]
          },
          {
            foreignKeyName: "progression_recommendations_source_workout_fkey"
            columns: ["source_workout_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      sets: {
        Row: {
          completed_at: string
          created_at: string
          exercise_id: string
          id: string
          position: number
          reps: number
          rpe: number | null
          set_type: string
          updated_at: string
          user_id: string
          weight_kg: number | null
          workout_exercise_id: string
          workout_id: string
        }
        Insert: {
          completed_at: string
          created_at?: string
          exercise_id: string
          id: string
          position: number
          reps: number
          rpe?: number | null
          set_type: string
          updated_at?: string
          user_id: string
          weight_kg?: number | null
          workout_exercise_id: string
          workout_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          exercise_id?: string
          id?: string
          position?: number
          reps?: number
          rpe?: number | null
          set_type?: string
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
          workout_exercise_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sets_owned_workout_fkey"
            columns: ["workout_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "sets_workout_exercise_identity_fkey"
            columns: [
              "workout_exercise_id",
              "user_id",
              "workout_id",
              "exercise_id",
            ]
            isOneToOne: false
            referencedRelation: "workout_exercises"
            referencedColumns: ["id", "user_id", "workout_id", "exercise_id"]
          },
        ]
      }
      workout_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          notes: string | null
          position: number
          source_recommendation_id: string | null
          target_max_reps: number | null
          target_min_reps: number | null
          target_sets: number | null
          target_weight_kg: number | null
          updated_at: string
          user_id: string
          workout_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id: string
          notes?: string | null
          position: number
          source_recommendation_id?: string | null
          target_max_reps?: number | null
          target_min_reps?: number | null
          target_sets?: number | null
          target_weight_kg?: number | null
          updated_at?: string
          user_id: string
          workout_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          notes?: string | null
          position?: number
          source_recommendation_id?: string | null
          target_max_reps?: number | null
          target_min_reps?: number | null
          target_sets?: number | null
          target_weight_kg?: number | null
          updated_at?: string
          user_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_owned_source_recommendation_fkey"
            columns: ["source_recommendation_id", "user_id"]
            isOneToOne: false
            referencedRelation: "progression_recommendations"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "workout_exercises_owned_workout_fkey"
            columns: ["workout_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      workout_template_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          notes: string | null
          position: number
          target_max_reps: number
          target_min_reps: number
          target_sets: number
          template_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id: string
          notes?: string | null
          position: number
          target_max_reps: number
          target_min_reps: number
          target_sets: number
          template_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          notes?: string | null
          position?: number
          target_max_reps?: number
          target_min_reps?: number
          target_sets?: number
          template_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_template_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_template_exercises_owned_template_fkey"
            columns: ["template_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          created_at: string
          id: string
          is_archived: boolean
          name: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          is_archived?: boolean
          name: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_archived?: boolean
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          source_template_id: string | null
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id: string
          name: string
          notes?: string | null
          source_template_id?: string | null
          started_at: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          source_template_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workouts_owned_source_template_fkey"
            columns: ["source_template_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
