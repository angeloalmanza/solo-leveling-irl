import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

const STAT_COLORS: Record<string, string> = {
  STR: '#ff6666',
  AGI: '#66ff99',
  INT: '#6699ff',
  VIT: '#ff99cc',
  END: '#ffcc44',
};

interface Props {
  stat: string;
  value: number;
}

export function StatCard({ stat, value }: Props) {
  const color = STAT_COLORS[stat] ?? Colors.accent;
  return (
    <View style={styles.card}>
      <Text style={[styles.stat, { color }]}>{stat}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 4,
  },
  stat: { fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  value: { color: Colors.text, fontSize: 26, fontWeight: '800' },
});
