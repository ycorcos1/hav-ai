import { fireEvent, render } from '@testing-library/react-native';

import type { Exercise } from '@/shared/contracts';
import { ExerciseLibraryScreen } from '@/features/exercises/screens/ExerciseLibraryScreen';

const exercises: Exercise[] = [
  {
    id: '20000000-0000-4000-8000-000000000001',
    name: 'Barbell Bench Press',
    primaryMuscleGroup: 'chest',
    secondaryMuscleGroups: ['triceps'],
    equipmentType: 'barbell',
    measurementType: 'weight_reps',
    isSystem: true,
    isArchived: false,
    createdAt: '2026-08-30T00:00:00.000Z',
    updatedAt: '2026-08-30T00:00:00.000Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000002',
    ownerUserId: '30000000-0000-4000-8000-000000000001',
    name: 'Home Cable Row',
    primaryMuscleGroup: 'back',
    secondaryMuscleGroups: ['biceps'],
    equipmentType: 'cable',
    measurementType: 'weight_reps',
    isSystem: false,
    isArchived: false,
    createdAt: '2026-08-30T00:00:00.000Z',
    updatedAt: '2026-08-30T00:00:00.000Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000003',
    name: 'Dumbbell Row',
    primaryMuscleGroup: 'back',
    secondaryMuscleGroups: ['biceps'],
    equipmentType: 'dumbbell',
    measurementType: 'weight_reps',
    isSystem: true,
    isArchived: false,
    createdAt: '2026-08-30T00:00:00.000Z',
    updatedAt: '2026-08-30T00:00:00.000Z',
  },
];

describe('ExerciseLibraryScreen', () => {
  it('renders system and custom exercises from the local loader', async () => {
    const loadExercises = jest.fn().mockResolvedValue(exercises);
    const screen = await render(<ExerciseLibraryScreen loadExercises={loadExercises} />);

    expect(await screen.findByText('Barbell Bench Press')).toBeTruthy();
    expect(screen.getByText('Home Cable Row')).toBeTruthy();
    expect(screen.getByText('Chest · Barbell')).toBeTruthy();
    expect(screen.getByText('Back · Cable')).toBeTruthy();
    expect(loadExercises).toHaveBeenCalledTimes(1);
  });

  it('shows loading, empty, and recoverable error states', async () => {
    let resolveLoad!: (value: Exercise[]) => void;
    const pendingLoad = new Promise<Exercise[]>((resolve) => {
      resolveLoad = resolve;
    });
    const loadingScreen = await render(
      <ExerciseLibraryScreen loadExercises={() => pendingLoad} />,
    );
    expect(loadingScreen.getByLabelText('Loading exercises')).toBeTruthy();
    resolveLoad([]);

    const emptyScreen = await render(
      <ExerciseLibraryScreen loadExercises={async () => []} />,
    );
    expect(await emptyScreen.findByText('No exercises found')).toBeTruthy();

    const errorScreen = await render(
      <ExerciseLibraryScreen loadExercises={async () => {
        throw new Error('network should not be shown');
      }} />,
    );
    expect(await errorScreen.findByText('Unable to load exercises')).toBeTruthy();
    expect(errorScreen.queryByText('network should not be shown')).toBeNull();
  });

  it('searches locally, is case-insensitive, and restores results when cleared', async () => {
    const screen = await render(
      <ExerciseLibraryScreen loadExercises={async () => exercises} />,
    );
    expect(await screen.findByText('Barbell Bench Press')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Search'), 'DUMBBELL');
    expect(screen.getByText('Dumbbell Row')).toBeTruthy();
    expect(screen.queryByText('Barbell Bench Press')).toBeNull();

    await fireEvent.changeText(screen.getByLabelText('Search'), '');
    expect(screen.getByText('Barbell Bench Press')).toBeTruthy();
    expect(screen.getByText('Home Cable Row')).toBeTruthy();
  });

  it('composes muscle filtering with search and restores the all-muscle set', async () => {
    const screen = await render(
      <ExerciseLibraryScreen loadExercises={async () => exercises} />,
    );
    await screen.findByText('Barbell Bench Press');

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(screen.queryByText('Barbell Bench Press')).toBeNull();
    expect(screen.getByText('Home Cable Row')).toBeTruthy();
    expect(screen.getByText('Dumbbell Row')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Search'), 'home');
    expect(screen.getByText('Home Cable Row')).toBeTruthy();
    expect(screen.queryByText('Dumbbell Row')).toBeNull();

    await fireEvent.changeText(screen.getByLabelText('Search'), '');
    await fireEvent.press(screen.getByRole('button', { name: 'All' }));
    expect(screen.getByText('Barbell Bench Press')).toBeTruthy();
    expect(screen.getByText('Home Cable Row')).toBeTruthy();
    expect(screen.getByText('Dumbbell Row')).toBeTruthy();
  });
});
