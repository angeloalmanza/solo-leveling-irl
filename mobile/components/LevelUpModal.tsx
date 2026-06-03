import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSpring, withSequence, withRepeat, withDelay,
  Easing, runOnJS,
} from 'react-native-reanimated';
import { Colors } from '../constants/theme';

const { width } = Dimensions.get('window');

interface Props {
  visible: boolean;
  newLevel: number;
  oldLevel: number;
  onClose: () => void;
}

function Ring({ delay }: { delay: number }) {
  const scale = useSharedValue(0.2);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withDelay(delay, withTiming(3, { duration: 1400, easing: Easing.out(Easing.cubic) }));
    opacity.value = withDelay(delay, withTiming(0, { duration: 1400, easing: Easing.out(Easing.quad) }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.ring, style]} />;
}

export function LevelUpModal({ visible, newLevel, oldLevel, onClose }: Props) {
  const cardScale = useSharedValue(0.7);
  const cardOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(1);
  const levelScale = useSharedValue(0.5);

  useEffect(() => {
    if (!visible) return;
    cardScale.value = withSpring(1, { damping: 14, stiffness: 180 });
    cardOpacity.value = withTiming(1, { duration: 250 });
    levelScale.value = withDelay(200, withSpring(1, { damping: 10, stiffness: 150 }));
    glowOpacity.value = withDelay(300,
      withRepeat(
        withSequence(
          withTiming(0.4, { duration: 700 }),
          withTiming(1, { duration: 700 }),
        ),
        -1,
        true
      )
    );

    const t = setTimeout(() => { runOnJS(onClose)(); }, 2800);
    return () => clearTimeout(t);
  }, [visible]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));
  const lvlStyle = useAnimatedStyle(() => ({ transform: [{ scale: levelScale.value }] }));

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.ringsContainer}>
          <Ring delay={0} />
          <Ring delay={300} />
          <Ring delay={600} />
        </View>

        <Animated.View style={[styles.card, cardStyle]}>
          <Animated.Text style={[styles.levelUpLabel, glowStyle]}>LEVEL UP!</Animated.Text>

          <View style={styles.levelRow}>
            <Text style={styles.oldLevel}>{oldLevel}</Text>
            <Text style={styles.arrow}> → </Text>
            <Animated.Text style={[styles.newLevel, lvlStyle]}>{newLevel}</Animated.Text>
          </View>

          <Text style={styles.sub}>Hai raggiunto il livello {newLevel}</Text>
          <Text style={styles.tapClose}>Tocca per continuare</Text>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringsContainer: {
    position: 'absolute',
    width: 120, height: 120,
    alignItems: 'center', justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 2, borderColor: Colors.accent,
  },
  card: {
    width: width * 0.82,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 32,
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  levelUpLabel: {
    color: Colors.accent,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 6,
    marginBottom: 24,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  levelRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 16 },
  oldLevel: { color: Colors.textMuted, fontSize: 36, fontWeight: '700' },
  arrow: { color: Colors.textSecondary, fontSize: 24 },
  newLevel: {
    color: Colors.accent,
    fontSize: 72,
    fontWeight: '800',
    lineHeight: 80,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  sub: { color: Colors.textSecondary, fontSize: 14, marginBottom: 24 },
  tapClose: { color: Colors.textMuted, fontSize: 11, letterSpacing: 2 },
});
