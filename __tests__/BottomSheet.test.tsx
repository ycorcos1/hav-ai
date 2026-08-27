import { fireEvent, render, screen } from '@testing-library/react-native';

import { AppText } from '@/components/AppText';
import { BottomSheet } from '@/components/BottomSheet';
import { colors, radius, spacing } from '@/theme';

describe('BottomSheet', () => {
  it('renders configurable content only while externally visible', async () => {
    const onDismiss = jest.fn();
    const { rerender } = await render(
      <BottomSheet
        onDismiss={onDismiss}
        testID="sheet"
        title="Edit values"
        visible={false}
      >
        <AppText>Configurable content</AppText>
      </BottomSheet>,
    );

    expect(screen.queryByText('Configurable content')).not.toBeOnTheScreen();

    await rerender(
      <BottomSheet
        onDismiss={onDismiss}
        testID="sheet"
        title="Edit values"
        visible
      >
        <AppText>Configurable content</AppText>
      </BottomSheet>,
    );

    expect(screen.getByText('Configurable content')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Edit values' })).toBeOnTheScreen();
  });

  it('dismisses through the integrated close action', async () => {
    const onDismiss = jest.fn();
    await render(
      <BottomSheet onDismiss={onDismiss} title="Options" visible>
        <AppText>Sheet body</AppText>
      </BottomSheet>,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('dismisses when the backdrop is pressed', async () => {
    const onDismiss = jest.fn();
    await render(
      <BottomSheet onDismiss={onDismiss} showCloseAction={false} visible>
        <AppText>Sheet body</AppText>
      </BottomSheet>,
    );

    await fireEvent.press(
      screen.getByRole('button', { name: 'Dismiss bottom sheet' }),
    );

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('can require an explicit close action by disabling backdrop dismissal', async () => {
    const onDismiss = jest.fn();
    await render(
      <BottomSheet
        dismissOnBackdropPress={false}
        onDismiss={onDismiss}
        visible
      >
        <AppText>Protected content</AppText>
      </BottomSheet>,
    );

    expect(
      screen.queryByRole('button', { name: 'Dismiss bottom sheet' }),
    ).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('supports custom dismissal labels', async () => {
    const onDismiss = jest.fn();
    await render(
      <BottomSheet
        closeLabel="Done"
        dismissAccessibilityLabel="Close options"
        onDismiss={onDismiss}
        visible
      >
        <AppText>Sheet body</AppText>
      </BottomSheet>,
    );

    expect(screen.getByRole('button', { name: 'Done' })).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Close options' }),
    ).toBeOnTheScreen();
  });

  it('uses modal accessibility, bottom safe-area edges, and theme tokens', async () => {
    await render(
      <BottomSheet
        accessibilityLabel="Exercise settings"
        onDismiss={jest.fn()}
        testID="sheet"
        visible
      >
        <AppText>Settings</AppText>
      </BottomSheet>,
    );
    const sheet = screen.getByTestId('sheet');

    expect(sheet).toHaveProp('accessibilityLabel', 'Exercise settings');
    expect(sheet).toHaveProp('accessibilityViewIsModal', true);
    expect(sheet).toHaveProp('edges', {
      bottom: 'additive',
      left: 'off',
      right: 'off',
      top: 'off',
    });
    expect(sheet).toHaveStyle({
      backgroundColor: colors.surface.elevated,
      borderTopLeftRadius: radius.bottomSheet,
      borderTopRightRadius: radius.bottomSheet,
      paddingBottom: spacing.lg,
      paddingHorizontal: spacing.screenHorizontal,
    });
  });
});
