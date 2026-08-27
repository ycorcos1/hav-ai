import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ModalProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { TextButton } from '@/components/TextButton';
import { colors, radius, spacing } from '@/theme';

export type BottomSheetProps = Omit<
  ModalProps,
  'children' | 'onDismiss' | 'onRequestClose' | 'transparent' | 'visible'
> & {
  accessibilityLabel?: string;
  children: ReactNode;
  closeLabel?: string;
  dismissOnBackdropPress?: boolean;
  dismissAccessibilityLabel?: string;
  onDismiss: () => void;
  sheetStyle?: StyleProp<ViewStyle>;
  showCloseAction?: boolean;
  title?: string;
  visible: boolean;
};

export function BottomSheet({
  accessibilityLabel,
  animationType = 'slide',
  children,
  closeLabel = 'Close',
  dismissAccessibilityLabel = 'Dismiss bottom sheet',
  dismissOnBackdropPress = true,
  onDismiss,
  sheetStyle,
  showCloseAction = true,
  testID,
  title,
  visible,
  ...modalProps
}: BottomSheetProps) {
  return (
    <Modal
      {...modalProps}
      animationType={animationType}
      onRequestClose={onDismiss}
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        {dismissOnBackdropPress ? (
          <Pressable
            accessibilityLabel={dismissAccessibilityLabel}
            accessibilityRole="button"
            onPress={onDismiss}
            style={styles.backdrop}
          />
        ) : (
          <View style={styles.backdrop} />
        )}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          pointerEvents="box-none"
          style={styles.keyboardAvoidingView}
        >
          <SafeAreaView
            accessibilityLabel={accessibilityLabel}
            accessibilityViewIsModal
            edges={['bottom']}
            style={[styles.sheet, sheetStyle]}
            testID={testID}
          >
            {title || showCloseAction ? (
              <View style={styles.header}>
                {title ? (
                  <AppText accessibilityRole="header" variant="exerciseName">
                    {title}
                  </AppText>
                ) : (
                  <View />
                )}
                {showCloseAction ? (
                  <TextButton label={closeLabel} onPress={onDismiss} />
                ) : null}
              </View>
            ) : null}
            <View style={styles.content}>{children}</View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background.backdrop,
  },
  keyboardAvoidingView: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface.elevated,
    borderTopLeftRadius: radius.bottomSheet,
    borderTopRightRadius: radius.bottomSheet,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.sm,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: spacing.xxxl,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
  },
});
