import {
  TextInput,
  type TextInputProps,
} from '@/components/TextInput';

export type SearchInputProps = Omit<
  TextInputProps,
  'accessibilityLabel' | 'label' | 'returnKeyType'
> & {
  accessibilityLabel?: string;
};

export function SearchInput({
  accessibilityLabel = 'Search',
  placeholder = 'Search',
  ...inputProps
}: SearchInputProps) {
  return (
    <TextInput
      {...inputProps}
      accessibilityLabel={accessibilityLabel}
      placeholder={placeholder}
      returnKeyType="search"
    />
  );
}
