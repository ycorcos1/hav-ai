import { fireEvent, render, screen } from '@testing-library/react-native';

import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { TextButton } from '@/components/TextButton';
import { colors, sizing } from '@/theme';

describe('button components', () => {
  it('renders all four button types with accessible button roles', async () => {
    await render(
      <>
        <PrimaryButton label="Primary" />
        <SecondaryButton label="Secondary" />
        <TextButton label="Text" />
        <IconButton
          accessibilityLabel="Icon"
          icon={<AppText>+</AppText>}
        />
      </>,
    );

    expect(screen.getByRole('button', { name: 'Primary' })).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Secondary' }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Text' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Icon' })).toBeOnTheScreen();
  });

  it('uses the approved primary and pressed accent treatments', async () => {
    const onPressIn = jest.fn();
    await render(<PrimaryButton label="Start" onPressIn={onPressIn} />);
    const button = screen.getByRole('button', { name: 'Start' });

    expect(button).toHaveStyle({
      backgroundColor: colors.accent.primary,
      minHeight: sizing.workoutControlMaximumHeight,
    });

    fireEvent(button, 'pressIn');

    expect(onPressIn).toHaveBeenCalledTimes(1);
  });

  it('runs normal presses', async () => {
    const onPress = jest.fn();
    await render(<SecondaryButton label="Add set" onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Add set' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('prevents disabled presses and exposes disabled state', async () => {
    const onPress = jest.fn();
    await render(
      <PrimaryButton disabled label="Unavailable" onPress={onPress} />,
    );
    const button = screen.getByRole('button', { name: 'Unavailable' });

    fireEvent.press(button);

    expect(onPress).not.toHaveBeenCalled();
    expect(button).toHaveProp('accessibilityState', {
      disabled: true,
      busy: false,
    });
    expect(button).toHaveStyle({
      backgroundColor: colors.surface.elevated,
      borderColor: colors.border.default,
    });
  });

  it('prevents presses while loading and exposes busy state', async () => {
    const onPress = jest.fn();
    await render(
      <TextButton label="Saving" loading onPress={onPress} />,
    );
    const button = screen.getByRole('button', { name: 'Saving' });

    fireEvent.press(button);

    expect(onPress).not.toHaveBeenCalled();
    expect(button).toHaveProp('accessibilityState', {
      disabled: true,
      busy: true,
    });
    expect(screen.queryByText('Saving')).not.toBeOnTheScreen();
  });

  it('applies predictable minimum touch targets', async () => {
    await render(
      <>
        <TextButton label="Dismiss" />
        <IconButton
          accessibilityLabel="Close"
          icon={<AppText>×</AppText>}
        />
      </>,
    );

    expect(screen.getByRole('button', { name: 'Dismiss' })).toHaveStyle({
      minHeight: sizing.minimumTouchTarget,
    });
    expect(screen.getByRole('button', { name: 'Close' })).toHaveStyle({
      height: sizing.minimumTouchTarget,
      minHeight: sizing.minimumTouchTarget,
      width: sizing.minimumTouchTarget,
    });
  });

  it('supports explicit accessibility labels and state passthrough', async () => {
    await render(
      <SecondaryButton
        accessibilityLabel="Open workout history"
        accessibilityState={{ selected: true }}
        label="History"
      />,
    );
    const button = screen.getByRole('button', {
      name: 'Open workout history',
    });

    expect(button).toHaveProp('accessibilityState', {
      busy: false,
      disabled: false,
      selected: true,
    });
  });
});
