import type {
  LocalExerciseHydrationRepository,
  LocalTemplateHydrationRepository,
} from "@/db/repositories";
import type {
  ExerciseRepository,
  TemplateRepository,
} from "@/lib/supabase/repositories";
import type { UUID } from "@/shared/contracts";

import type { SyncProcessor } from "./syncTypes";

export type ExerciseTemplatePullResult = {
  exercisesHydrated: number;
  exercisesPreservedDirty: number;
  templatesHydrated: number;
  templatesPreservedDirty: number;
};

export class ExerciseTemplatePullService {
  constructor(
    private readonly userId: UUID,
    private readonly pushProcessor: SyncProcessor,
    private readonly remoteExercises: ExerciseRepository,
    private readonly remoteTemplates: TemplateRepository,
    private readonly localExercises: LocalExerciseHydrationRepository,
    private readonly localTemplates: LocalTemplateHydrationRepository,
  ) {}

  async pullUpdates(): Promise<ExerciseTemplatePullResult> {
    await this.pushProcessor.synchronize();
    const [exercises, templates] = await Promise.all([
      this.remoteExercises.fetchAccessible(),
      this.remoteTemplates.fetchOwnTemplates(),
    ]);
    const result: ExerciseTemplatePullResult = {
      exercisesHydrated: 0,
      exercisesPreservedDirty: 0,
      templatesHydrated: 0,
      templatesPreservedDirty: 0,
    };

    for (const exercise of exercises) {
      const outcome = await this.localExercises.hydrateFromCloud(this.userId, exercise);
      if (outcome === "hydrated") result.exercisesHydrated += 1;
      else result.exercisesPreservedDirty += 1;
    }
    for (const template of templates) {
      const outcome = await this.localTemplates.hydrateFromCloud(this.userId, template);
      if (outcome === "hydrated") result.templatesHydrated += 1;
      else result.templatesPreservedDirty += 1;
    }
    return result;
  }
}
