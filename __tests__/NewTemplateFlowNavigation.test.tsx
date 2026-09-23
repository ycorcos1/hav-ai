import { fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { NewTemplateFlowScreen } from '@/features/templates/screens/NewTemplateFlowScreen';

describe('template editor back navigation', () => {
  it('leaves immediately when the draft is unchanged', async () => {
    const onBack = jest.fn();
    const screen = await render(
      <NewTemplateFlowScreen
        loadExercises={async () => []}
        loadPreferences={async () => []}
        onBack={onBack}
        onSave={jest.fn()}
        onSaved={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Go back' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('requires confirmation before discarding an unsaved template draft', async () => {
    const onBack = jest.fn();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    const screen = await render(
      <NewTemplateFlowScreen
        loadExercises={async () => []}
        loadPreferences={async () => []}
        onBack={onBack}
        onSave={jest.fn()}
        onSaved={jest.fn()}
      />,
    );

    await fireEvent.changeText(screen.getByLabelText('Workout Name'), 'Push');
    await fireEvent.press(screen.getByRole('button', { name: 'Go back' }));

    expect(onBack).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith(
      'Discard Changes?',
      'Your unsaved workout changes will be lost.',
      expect.any(Array),
    );
    const discard = alert.mock.calls[0][2]?.find(({ text }) => text === 'Discard');
    discard?.onPress?.();
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
