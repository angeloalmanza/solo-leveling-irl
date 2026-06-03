import { View, Text, StyleSheet } from 'react-native';
import { RankColors, Colors } from '../constants/theme';

interface Props {
  rank: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE = { sm: 28, md: 40, lg: 56 };
const FONT = { sm: 12, md: 16, lg: 22 };

export function RankBadge({ rank, size = 'md' }: Props) {
  const color = RankColors[rank] ?? Colors.textSecondary;
  const dim = SIZE[size];
  const font = FONT[size];
  return (
    <View style={[styles.badge, { width: dim, height: dim, borderColor: color }]}>
      <Text style={[styles.text, { color, fontSize: font }]}>{rank}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  text: { fontWeight: '800', letterSpacing: 1 },
});
