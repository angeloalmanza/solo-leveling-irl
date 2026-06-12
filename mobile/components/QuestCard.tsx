import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence,
  withTiming, withSpring,
} from 'react-native-reanimated';
import { Colors } from '../constants/theme';

const STAT_LABELS: Record<string, string> = {
  str: 'STR', agi: 'AGI', int: 'INT', vit: 'VIT', end: 'END',
};
const STAT_COLORS: Record<string, string> = {
  str: '#ff6666', agi: '#66ff99', int: '#6699ff', vit: '#ff99cc', end: '#ffcc44',
};

interface Props {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  statRewards: Record<string, number>;
  difficulty: number;
  completed: boolean;
  completing: boolean;
  onComplete: () => void;
  onReroll: () => Promise<void>;
}

export function QuestCard({
  title, description, xpReward, statRewards,
  difficulty, completed, completing, onComplete, onReroll,
}: Props) {
  const [rerolling, setRerolling] = useState(false);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(completed ? 0.45 : 1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  // L'opacità segue lo stato reale (aggiornato dallo store dopo la risposta)
  useEffect(() => {
    opacity.value = withTiming(completed ? 0.45 : 1, { duration: 300 });
  }, [completed]);

  function handlePress() {
    if (completing) return;

    if (completed) {
      Alert.alert(
        'ANNULLA COMPLETAMENTO',
        'Vuoi annullare il completamento di questa quest?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Sì, annulla',
            style: 'destructive',
            onPress: () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              onComplete();
            },
          },
        ],
      );
      return;
    }

    Alert.alert(
      'MISSIONE',
      'Hai completato questa quest?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sì',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            scale.value = withSequence(
              withTiming(0.97, { duration: 80 }),
              withSpring(1, { damping: 12 }),
            );
            onComplete();
          },
        },
      ],
    );
  }

  function handleReroll() {
    Alert.alert(
      'CAMBIA MISSIONE',
      'Vuoi sostituire questa quest con una nuova generata dall\'AI?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Cambia',
          onPress: async () => {
            setRerolling(true);
            try { await onReroll(); } finally { setRerolling(false); }
          },
        },
      ],
    );
  }

  const dots = Array.from({ length: 3 }, (_, i) => (
    <View key={i} style={[styles.dot, i < difficulty && styles.dotActive]} />
  ));

  const statBadges = Object.entries(statRewards)
    .filter(([, v]) => v > 0)
    .map(([stat, val]) => (
      <View key={stat} style={[styles.statBadge, { borderColor: STAT_COLORS[stat] ?? Colors.border }]}>
        <Text style={[styles.statText, { color: STAT_COLORS[stat] ?? Colors.text }]}>
          +{val} {STAT_LABELS[stat] ?? stat.toUpperCase()}
        </Text>
      </View>
    ));

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        style={[styles.card, completed && styles.cardDone]}
        onPress={handlePress}
        activeOpacity={0.85}
        disabled={completing}
      >
        <View style={styles.left}>
          <View style={[styles.checkbox, completed && styles.checkboxDone]}>
            {completing ? (
              <ActivityIndicator size={14} color={Colors.accent} />
            ) : completed ? (
              <Text style={styles.checkmark}>✓</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, completed && styles.titleDone]} numberOfLines={1}>
              {title}
            </Text>
            {!completed && (
              <TouchableOpacity
                style={styles.rerollBtn}
                onPress={handleReroll}
                disabled={rerolling || completing}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {rerolling
                  ? <ActivityIndicator size={12} color={Colors.textMuted} />
                  : <Text style={styles.rerollIcon}>↻</Text>}
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.description} numberOfLines={2}>{description}</Text>
          <View style={styles.footer}>
            <Text style={styles.xp}>+{xpReward} XP</Text>
            <View style={styles.stats}>{statBadges}</View>
            <View style={styles.difficulty}>{dots}</View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    gap: 12,
    marginBottom: 10,
  },
  cardDone: { borderColor: Colors.border },
  left: { paddingTop: 2 },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: Colors.accent,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  checkmark: { color: Colors.background, fontSize: 13, fontWeight: '800' },
  body: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: Colors.text, fontSize: 15, fontWeight: '700', flex: 1 },
  titleDone: { color: Colors.textMuted, textDecorationLine: 'line-through' },
  rerollBtn: { paddingLeft: 8 },
  rerollIcon: { color: Colors.textMuted, fontSize: 18 },
  description: { color: Colors.textSecondary, fontSize: 12, lineHeight: 16 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  xp: { color: Colors.accent, fontSize: 12, fontWeight: '700' },
  stats: { flexDirection: 'row', gap: 4, flex: 1, flexWrap: 'wrap' },
  statBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  statText: { fontSize: 10, fontWeight: '700' },
  difficulty: { flexDirection: 'row', gap: 3 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.accent },
});
