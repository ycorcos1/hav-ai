export const fontSizes = {
  displayNumber: 32,
  screenTitle: 28,
  sectionHeading: 13,
  exerciseName: 17,
  body: 15,
  metadata: 13,
  button: 16,
} as const;

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const typography = {
  displayNumber: {
    fontSize: fontSizes.displayNumber,
    fontWeight: fontWeights.semibold,
  },
  screenTitle: {
    fontSize: fontSizes.screenTitle,
    fontWeight: fontWeights.bold,
  },
  sectionHeading: {
    fontSize: fontSizes.sectionHeading,
    fontWeight: fontWeights.semibold,
  },
  exerciseName: {
    fontSize: fontSizes.exerciseName,
    fontWeight: fontWeights.semibold,
  },
  body: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.regular,
  },
  metadata: {
    fontSize: fontSizes.metadata,
    fontWeight: fontWeights.regular,
  },
  button: {
    fontSize: fontSizes.button,
    fontWeight: fontWeights.semibold,
  },
} as const;
