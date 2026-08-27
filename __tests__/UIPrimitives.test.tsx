import { fireEvent, render, screen } from '@testing-library/react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { FilterChip } from '@/components/FilterChip';
import { Screen } from '@/components/Screen';
import { SearchInput } from '@/components/SearchInput';
import { SectionHeader } from '@/components/SectionHeader';
import { TextButton } from '@/components/TextButton';
import { TextInput } from '@/components/TextInput';
import { colors, radius, sizing, spacing, typography } from '@/theme';

describe('shared UI primitives', () => {
  it('renders Screen, Card, and SectionHeader with token-driven styles', async () => {
    await render(
      <Screen testID="screen">
        <Card testID="card">
          <SectionHeader title="Overview" />
        </Card>
      </Screen>,
    );

    expect(screen.getByTestId('screen')).toHaveStyle({
      paddingHorizontal: spacing.screenHorizontal,
    });
    expect(screen.getByTestId('card')).toHaveStyle({
      backgroundColor: colors.surface.primary,
      borderRadius: radius.card,
      padding: spacing.lg,
    });
    expect(screen.getByRole('header', { name: 'Overview' })).toHaveStyle(
      typography.sectionHeading,
    );
  });

  it('renders Screen in optional scroll mode', async () => {
    await render(
      <Screen scroll testID="scroll-screen">
        <AppText>Scrollable content</AppText>
      </Screen>,
    );

    expect(screen.getByTestId('scroll-screen')).toBeOnTheScreen();
    expect(screen.getByText('Scrollable content')).toBeOnTheScreen();
  });

  it('renders Chip, EmptyState, and ErrorState content and actions', async () => {
    await render(
      <>
        <Chip label="Strength" />
        <EmptyState
          action={<TextButton label="Create" />}
          message="Create an item to continue."
          title="Nothing here"
        />
        <ErrorState
          action={<TextButton label="Retry" />}
          message="Your data remains safe."
          title="Couldn't load"
        />
      </>,
    );

    expect(screen.getByText('Strength')).toBeOnTheScreen();
    expect(screen.getByText('Nothing here')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Create' })).toBeOnTheScreen();
    expect(screen.getByRole('alert')).toBeOnTheScreen();
    expect(screen.getByText("Couldn't load")).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeOnTheScreen();
  });

  it('supports TextInput focus, inline error, and native callbacks', async () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    await render(
      <TextInput
        error="A value is required."
        label="Name"
        onBlur={onBlur}
        onFocus={onFocus}
        value=""
      />,
    );
    const input = screen.getByLabelText('Name');

    await fireEvent(input, 'focus');

    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(input).toHaveStyle({ borderColor: colors.semantic.error });
    expect(input).toHaveProp('aria-invalid', true);
    expect(screen.getByRole('alert')).toHaveTextContent('A value is required.');

    await fireEvent(input, 'blur');
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('uses the accent border for a focused valid TextInput', async () => {
    await render(<TextInput accessibilityLabel="Notes" value="" />);
    const input = screen.getByLabelText('Notes');

    await fireEvent(input, 'focus');

    expect(input).toHaveStyle({ borderColor: colors.accent.primary });
  });

  it('exposes disabled TextInput semantics and prevents editing', async () => {
    await render(<TextInput disabled label="Email" value="test@example.com" />);
    const input = screen.getByLabelText('Email');

    expect(input).toHaveProp('editable', false);
    expect(input).toHaveProp('accessibilityState', { disabled: true });
    expect(input).toHaveStyle({ color: colors.text.muted });
  });

  it('composes SearchInput with accessible search defaults', async () => {
    await render(<SearchInput value="" />);
    const input = screen.getByLabelText('Search');

    expect(input).toHaveProp('placeholder', 'Search');
    expect(input).toHaveProp('returnKeyType', 'search');
  });

  it('renders selected and unselected FilterChip states', async () => {
    await render(
      <>
        <FilterChip label="All" selected />
        <FilterChip label="Chest" selected={false} />
      </>,
    );
    const selected = screen.getByRole('button', { name: 'All' });
    const unselected = screen.getByRole('button', { name: 'Chest' });

    expect(selected).toHaveProp('accessibilityState', {
      disabled: false,
      selected: true,
    });
    expect(selected).toHaveStyle({
      backgroundColor: colors.accent.soft,
      borderColor: colors.accent.primary,
      minHeight: sizing.minimumTouchTarget,
    });
    expect(unselected).toHaveProp('accessibilityState', {
      disabled: false,
      selected: false,
    });
    expect(unselected).toHaveStyle({
      backgroundColor: colors.surface.primary,
      borderColor: colors.border.default,
    });
  });

  it('handles FilterChip presses and blocks them while disabled', async () => {
    const onPress = jest.fn();
    await render(
      <>
        <FilterChip label="Back" onPress={onPress} selected={false} />
        <FilterChip disabled label="Legs" onPress={onPress} selected={false} />
      </>,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Legs' }));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Legs' })).toHaveProp(
      'accessibilityState',
      { disabled: true, selected: false },
    );
  });
});
