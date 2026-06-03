import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { Colors } from '../constants/theme';

const MACRO_COLORS: Record<string, string> = {
  calories: '#ffd700',
  protein: '#6699ff',
  carbs: '#ff9944',
  fat: '#ff6699',
};

interface Props {
  label: string;
  unit: string;
  current: number;
  goal: number;
  color?: string;
}

export function MacroBar({ label, unit, current, goal, color }: Props) {
  const ratio = goal > 0 ? Math.min(current / goal, 1) : 0;
  const barColor = color ?? MACRO_COLORS[label.toLowerCase()] ?? Colors.accent;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(ratio, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [current, goal]);

  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  const pct = Math.round(ratio * 100);
  const over = current > goal;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, over && styles.over]}>
          {Math.round(current)}<Text style={styles.unit}>{unit}</Text>
          <Text style={styles.separator}> / </Text>
          {Math.round(goal)}{unit}
        </Text>
        <Text style={[styles.pct, over && styles.over]}>{pct}%</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { backgroundColor: barColor }, barStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 10 },
  header: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 5, gap: 4 },
  label: { color: Colors.textSecondary, fontSize: 11, letterSpacing: 2, width: 72 },
  value: { color: Colors.text, fontSize: 13, flex: 1 },
  unit: { color: Colors.textSecondary, fontSize: 11 },
  separator: { color: Colors.textMuted },
  pct: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700', minWidth: 36, textAlign: 'right' },
  over: { color: '#ff6644' },
  track: {
    height: 6, backgroundColor: Colors.surfaceElevated, borderRadius: 3,
    overflow: 'hidden', borderWidth: 1, borderColor: Colors.border,
  },
  fill: { height: '100%', borderRadius: 3 },
});
