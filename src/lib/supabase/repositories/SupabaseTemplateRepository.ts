import type { SupabaseClient, User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import {
  remoteMutationResultFromRow,
  workoutTemplateExerciseToCloudUpsert,
  workoutTemplateFromCloudRows,
  workoutTemplateToCloudUpsert,
} from "@/lib/supabase/mappers/templateMapper";
import type { UUID, WorkoutTemplate, WorkoutTemplateExercise } from "@/shared/contracts";

import {
  TemplateRepositoryError,
  type TemplateRepository,
  type TemplateRepositoryOperation,
} from "./TemplateRepository";

export class SupabaseTemplateRepository implements TemplateRepository {
  constructor(private readonly client: SupabaseClient<Database> = supabase) {}

  async fetchOwnTemplates() {
    const user = await this.requireUser("fetchOwnTemplates");
    const [templateResult, childResult] = await Promise.all([
      this.client.from("workout_templates").select("*").eq("user_id", user.id)
        .order("updated_at", { ascending: false }),
      this.client.from("workout_template_exercises").select("*").eq("user_id", user.id)
        .order("position"),
    ]);
    if (templateResult.error || childResult.error) throw repositoryError("fetchOwnTemplates");

    try {
      return templateResult.data.map((row) => workoutTemplateFromCloudRows(
        row,
        childResult.data,
      ));
    } catch {
      throw repositoryError("fetchOwnTemplates");
    }
  }

  async upsertOwnTemplate(template: WorkoutTemplate) {
    const user = await this.requireUser("upsertOwnTemplate");
    if (template.userId !== user.id) throw repositoryError("upsertOwnTemplate");
    const { data, error } = await this.client.from("workout_templates")
      .upsert(workoutTemplateToCloudUpsert(template), { onConflict: "id" })
      .select("updated_at")
      .single();
    if (error || !data) throw repositoryError("upsertOwnTemplate");
    return remoteMutationResultFromRow(data);
  }

  async upsertOwnTemplateExercise(exercise: WorkoutTemplateExercise) {
    const user = await this.requireUser("upsertOwnTemplateExercise");
    if (exercise.userId !== user.id) throw repositoryError("upsertOwnTemplateExercise");
    const { data, error } = await this.client.from("workout_template_exercises")
      .upsert(workoutTemplateExerciseToCloudUpsert(exercise), { onConflict: "id" })
      .select("updated_at")
      .single();
    if (error || !data) throw repositoryError("upsertOwnTemplateExercise");
    return remoteMutationResultFromRow(data);
  }

  async archiveOwnTemplate(id: UUID) {
    const user = await this.requireUser("archiveOwnTemplate");
    const { data, error } = await this.client.from("workout_templates")
      .update({ is_archived: true })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("updated_at")
      .single();
    if (error || !data) throw repositoryError("archiveOwnTemplate");
    return remoteMutationResultFromRow(data);
  }

  private async requireUser(operation: TemplateRepositoryOperation): Promise<User> {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user) throw repositoryError(operation);
    return data.user;
  }
}

function repositoryError(operation: TemplateRepositoryOperation): TemplateRepositoryError {
  return new TemplateRepositoryError(operation);
}
