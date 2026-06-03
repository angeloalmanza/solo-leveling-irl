import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { Colors } from '../constants/theme';

interface Props {
  xp: number;
  level: number;
}

export function XPBar({ xp, level }: Props) {
  const required = level * 100;
  const ratio = Math.min(xp / required, 1);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(ratio, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [xp, level]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.labels}>
        <Text style={styles.label}>EXP</Text>
        <Text style={styles.value}>{xp} / {required}</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, barStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 4 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { color: Colors.textSecondary, fontSize: 11, letterSpacing: 3 },
  value: { color: Colors.accent, fontSize: 11, fontWeight: '700' },
  track: {
    height: 6,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 3,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
});
