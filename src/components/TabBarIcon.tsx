import { StyleSheet, View, type ColorValue } from 'react-native';

export type TabBarIconName = 'coach' | 'home' | 'profile' | 'progress' | 'workouts';

export function TabBarIcon({ color, name }: { color: ColorValue; name: TabBarIconName }) {
  if (name === 'home') {
    return (
      <View accessibilityElementsHidden style={styles.icon}>
        <View style={[styles.homeRoof, { borderColor: color }]} />
        <View style={[styles.homeBody, { borderColor: color }]} />
      </View>
    );
  }
  if (name === 'workouts') {
    return (
      <View accessibilityElementsHidden style={styles.icon}>
        <View style={[styles.dumbbellBar, { backgroundColor: color }]} />
        <View style={[styles.dumbbellPlate, styles.plateLeft, { backgroundColor: color }]} />
        <View style={[styles.dumbbellPlate, styles.plateRight, { backgroundColor: color }]} />
      </View>
    );
  }
  if (name === 'progress') {
    return (
      <View accessibilityElementsHidden style={[styles.icon, styles.bars]}>
        <View style={[styles.bar, styles.barShort, { backgroundColor: color }]} />
        <View style={[styles.bar, styles.barMedium, { backgroundColor: color }]} />
        <View style={[styles.bar, styles.barTall, { backgroundColor: color }]} />
      </View>
    );
  }
  if (name === 'coach') {
    return (
      <View accessibilityElementsHidden style={styles.icon}>
        <View style={[styles.bubble, { borderColor: color }]} />
        <View style={[styles.bubbleTail, { borderColor: color }]} />
      </View>
    );
  }
  return (
    <View accessibilityElementsHidden style={styles.icon}>
      <View style={[styles.profileHead, { borderColor: color }]} />
      <View style={[styles.profileBody, { borderColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    height: 22,
    position: 'relative',
    width: 24,
  },
  homeRoof: {
    borderLeftWidth: 2,
    borderTopWidth: 2,
    height: 13,
    left: 6,
    position: 'absolute',
    top: 1,
    transform: [{ rotate: '45deg' }],
    width: 13,
  },
  homeBody: {
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    bottom: 1,
    height: 12,
    left: 5,
    position: 'absolute',
    width: 14,
  },
  dumbbellBar: {
    height: 2,
    left: 3,
    position: 'absolute',
    top: 10,
    width: 18,
  },
  dumbbellPlate: {
    borderRadius: 2,
    height: 14,
    position: 'absolute',
    top: 4,
    width: 4,
  },
  plateLeft: { left: 2 },
  plateRight: { right: 2 },
  bars: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 3,
    justifyContent: 'center',
  },
  bar: {
    borderRadius: 1,
    width: 4,
  },
  barShort: { height: 7 },
  barMedium: { height: 13 },
  barTall: { height: 19 },
  bubble: {
    borderRadius: 6,
    borderWidth: 2,
    height: 16,
    left: 2,
    position: 'absolute',
    top: 1,
    width: 20,
  },
  bubbleTail: {
    borderBottomWidth: 2,
    borderRightWidth: 2,
    bottom: 2,
    height: 6,
    left: 6,
    position: 'absolute',
    transform: [{ rotate: '45deg' }],
    width: 6,
  },
  profileHead: {
    borderRadius: 5,
    borderWidth: 2,
    height: 9,
    left: 8,
    position: 'absolute',
    top: 1,
    width: 9,
  },
  profileBody: {
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    bottom: 1,
    height: 9,
    left: 4,
    position: 'absolute',
    width: 17,
  },
});
