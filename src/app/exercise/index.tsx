import { ExerciseLibraryScreen } from '@/features/exercises/screens/ExerciseLibraryScreen';
import { loadExerciseLibrary } from '@/features/exercises/services/loadExerciseLibrary';
import { loadExercisePreferences, updateCurrentUserExercisePreference } from '@/features/exercises/services/loadExercisePreferences';

export default function ExerciseLibraryRoute() {
  return <ExerciseLibraryScreen loadExercises={loadExerciseLibrary} loadPreferences={loadExercisePreferences} updateFavorite={async (exercise, isFavorite) => { await updateCurrentUserExercisePreference(exercise.id, { isFavorite }); }} />;
}
