import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSpring, withSequence, withDelay,
  Easing, runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { RankBadge } from './RankBadge';
import { RankColors, Colors } from '../constants/theme';

const { width, height } = Dimensions.get('window');

const RANK_NAMES: Record<string, string> = {
  E: 'E-RANK',
  D: 'D-RANK',
  C: 'C-RANK',
  B: 'B-RANK',
  A: 'A-RANK',
  S: 'S-RANK',
};

interface Props {
  visible: boolean;
  newRank: string;
  newLevel: number;
  onClose: () => void;
}

function Shockwave({ delay, color }: { delay: number; color: string }) {
  const scale = useSharedValue(0.1);
  const opacity = useSharedValue(0.8);

  useEffect(() => {
    scale.value = withDelay(delay, withTiming(4, { duration: 1600, easing: Easing.out(Easing.cubic) }));
    opacity.value = withDelay(delay, withTiming(0, { duration: 1600 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.shockwave, { borderColor: color }, style]} />;
}

export function RankUpModal({ visible, newRank, newLevel, onClose }: Props) {
  const rankColor = RankColors[newRank] ?? Colors.accent;

  const flashOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const badgeScale = useSharedValue(0.3);
  const titleY = useSharedValue(30);
  const titleOpacity = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;

    flashOpacity.value = withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(0, { duration: 600 }),
    );

    contentOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));

    badgeScale.value = withDelay(500,
      withSpring(1, { damping: 8, stiffness: 120 })
    );

    titleY.value = withDelay(700, withSpring(0, { damping: 14 }));
    titleOpacity.value = withDelay(700, withTiming(1, { duration: 400 }));

    const t = setTimeout(() => { runOnJS(onClose)(); }, 3500);
    return () => clearTimeout(t);
  }, [visible]);

  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: badgeScale.value }] }));
  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: titleY.value }],
    opacity: titleOpacity.value,
  }));

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <TouchableOpacity style={styles.container} activeOpacity={1} onPress={onClose}>
        <LinearGradient
          colors={['#000000', rankColor + '33', '#000000']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        <Animated.View style={[styles.flash, { backgroundColor: rankColor }, flashStyle]} />

        <View style={styles.shockwaves}>
          <Shockwave delay={100} color={rankColor} />
          <Shockwave delay={450} color={rankColor} />
          <Shockwave delay={800} color={rankColor} />
        </View>

        <Animated.View style={[styles.content, contentStyle]}>
          <Text style={[styles.announced, { color: rankColor + 'aa' }]}>
            [ RANK UP ACHIEVED ]
          </Text>

          <Animated.View style={badgeStyle}>
            <RankBadge rank={newRank} size="lg" />
          </Animated.View>

          <Animated.View style={[styles.titleBlock, titleStyle]}>
            <Text style={styles.youAreNow}>YOU ARE NOW</Text>
            <Text style={[styles.rankName, { color: rankColor, shadowColor: rankColor }]}>
              {RANK_NAMES[newRank] ?? newRank}
            </Text>
            <Text style={[styles.hunter, { color: rankColor + 'cc' }]}>HUNTER</Text>
          </Animated.View>

          <Text style={styles.level}>Level {newLevel}</Text>
          <Text style={styles.tapClose}>Tocca per continuare</Text>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  flash: { position: 'absolute', top: 0, left: 0, width, height },
  shockwaves: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: 160, height: 160 },
  shockwave: {
    position: 'absolute',
    width: 160, height: 160, borderRadius: 80,
    borderWidth: 3,
  },
  content: { alignItems: 'center', paddingHorizontal: 40 },
  announced: { fontSize: 11, letterSpacing: 4, marginBottom: 32 },
  titleBlock: { alignItems: 'center', marginTop: 28 },
  youAreNow: { color: Colors.textSecondary, fontSize: 13, letterSpacing: 4, marginBottom: 8 },
  rankName: {
    fontSize: 64,
    fontWeight: '800',
    letterSpacing: 6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  hunter: { fontSize: 18, fontWeight: '700', letterSpacing: 8, marginTop: 4 },
  level: { color: Colors.textMuted, fontSize: 13, marginTop: 20 },
  tapClose: { color: Colors.textMuted, fontSize: 11, letterSpacing: 2, marginTop: 32 },
});
