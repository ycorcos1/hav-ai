import type { AppTextProps } from '@/components/AppText';
import { AppText } from '@/components/AppText';

export type SectionHeaderProps = Omit<
  AppTextProps,
  'children' | 'variant'
> & {
  title: string;
};

export function SectionHeader({ title, ...textProps }: SectionHeaderProps) {
  return (
    <AppText accessibilityRole="header" variant="sectionHeading" {...textProps}>
      {title}
    </AppText>
  );
}
