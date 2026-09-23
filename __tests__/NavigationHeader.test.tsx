import { fireEvent, render } from '@testing-library/react-native';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';

describe('shared screen navigation header', () => {
  it('keeps root destinations free of an unnecessary back button', async () => {
    const screen = await render(
      <Screen><AppText>Home</AppText></Screen>,
    );

    expect(screen.queryByRole('button', { name: 'Go back' })).toBeNull();
  });

  it('provides an accessible themed back control for deeper screens', async () => {
    const onBack = jest.fn();
    const screen = await render(
      <Screen navigationAction={{ onBack }}><AppText>Detail</AppText></Screen>,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Go back' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
