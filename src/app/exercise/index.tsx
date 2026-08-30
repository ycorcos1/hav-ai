import { ExerciseLibraryScreen } from '@/features/exercises/screens/ExerciseLibraryScreen';
import { loadExerciseLibrary } from '@/features/exercises/services/loadExerciseLibrary';

export default function ExerciseLibraryRoute() {
  return <ExerciseLibraryScreen loadExercises={loadExerciseLibrary} />;
}
