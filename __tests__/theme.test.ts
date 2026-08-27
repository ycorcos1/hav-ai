import {
  colors,
  fontSizes,
  fontWeights,
  radius,
  sizing,
  spacing,
  typography,
} from '@/theme';

describe('theme tokens', () => {
  it('exports the approved color palette', () => {
    expect(colors).toEqual({
      background: {
        primary: '#111315',
        backdrop: 'rgba(17, 19, 21, 0.72)',
      },
      surface: { primary: '#191C1F', elevated: '#22262A' },
      border: { default: '#30353A' },
      accent: {
        primary: '#FF4F1F',
        pressed: '#E74316',
        soft: 'rgba(255, 79, 31, 0.14)',
      },
      text: {
        primary: '#F5F6F7',
        secondary: '#A4ABB2',
        muted: '#70777F',
      },
      semantic: {
        success: '#36C786',
        warning: '#F6B94A',
        error: '#F05A62',
      },
    });
  });

  it('exports spacing, radius, typography, and sizing scales', () => {
    expect(spacing).toMatchObject({ xs: 4, lg: 16, xxxl: 40 });
    expect(radius).toMatchObject({ control: 8, bottomSheetLarge: 24 });
    expect(sizing).toEqual({
      minimumTouchTarget: 44,
      workoutControlMinimumHeight: 48,
      workoutControlMaximumHeight: 56,
    });
    expect(typography.screenTitle).toEqual({
      fontSize: fontSizes.screenTitle,
      fontWeight: fontWeights.bold,
    });
  });
});
