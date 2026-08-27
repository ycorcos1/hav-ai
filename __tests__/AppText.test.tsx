import { render, screen } from '@testing-library/react-native';

import {
  AppText,
  type AppTextColor,
  type AppTextVariant,
} from '@/components/AppText';
import { colors, typography } from '@/theme';

const variants: Array<[AppTextVariant, object]> = [
  ['display', typography.displayNumber],
  ['screenTitle', typography.screenTitle],
  ['sectionHeading', typography.sectionHeading],
  ['exerciseName', typography.exerciseName],
  ['body', typography.body],
  ['metadata', typography.metadata],
  ['button', typography.button],
];

const textColors: Record<AppTextColor, string> = {
  primary: colors.text.primary,
  secondary: colors.text.secondary,
  muted: colors.text.muted,
};

describe('AppText', () => {
  it.each(variants)(
    'applies the %s typography variant',
    async (variant, style) => {
      await render(<AppText variant={variant}>{variant}</AppText>);

      expect(screen.getByText(variant)).toHaveStyle(style);
    },
  );

  it.each(Object.entries(textColors) as Array<[AppTextColor, string]>) (
    'applies the %s text color',
    async (color, value) => {
      await render(<AppText color={color}>{color}</AppText>);

      expect(screen.getByText(color)).toHaveStyle({ color: value });
    },
  );

  it('forwards Text props, preserves scaling defaults, and accepts style overrides', async () => {
    await render(
      <AppText
        accessibilityRole="header"
        numberOfLines={1}
        style={{ textAlign: 'center' }}
      >
        Accessible title
      </AppText>,
    );

    const text = screen.getByText('Accessible title');

    expect(text).toHaveProp('accessibilityRole', 'header');
    expect(text).toHaveProp('numberOfLines', 1);
    expect(text).not.toHaveProp('allowFontScaling');
    expect(text).toHaveStyle({ textAlign: 'center' });
  });
});
