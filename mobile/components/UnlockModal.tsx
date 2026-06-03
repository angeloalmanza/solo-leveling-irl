import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSpring, withSequence, withDelay,
  Easing, runOnJS,
} from 'react-native-reanimated';
import { RankColors, Colors } from '../constants/theme';

const { width } = Dimensions.get('window');

export interface UnlockItem {
  type: 'shadow' | 'achievement';
  name: string;
  rank?: string;
  titleReward?: string;
  description: string;
}

interface Props {
  visible: boolean;
  item: UnlockItem | null;
  onClose: () => void;
}

export function UnlockModal({ visible, item, onClose }: Props) {
  const isShadow = item?.type === 'shadow';
  const accentColor = isShadow
    ? (item?.rank ? RankColors[item.rank] ?? Colors.accent : Colors.accent)
    : Colors.accent;

  const overlayOpacity = useSharedValue(0);
  const ariseY = useSharedValue(60);
  const ariseOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.6);
  const cardOpacity = useSharedValue(0);
  const nameY = useSharedValue(20);
  const nameOpacity = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;

    overlayOpacity.value = withTiming(1, { duration: 300 });

    ariseY.value = withDelay(200, withSpring(0, { damping: 12 }));
    ariseOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));

    cardScale.value = withDelay(500, withSpring(1, { damping: 14, stiffness: 160 }));
    cardOpacity.value = withDelay(500, withTiming(1, { duration: 300 }));

    nameY.value = withDelay(700, withSpring(0, { damping: 14 }));
    nameOpacity.value = withDelay(700, withTiming(1, { duration: 400 }));

    const t = setTimeout(() => { runOnJS(onClose)(); }, 3200);
    return () => clearTimeout(t);
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const ariseStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ariseY.value }],
    opacity: ariseOpacity.value,
  }));
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));
  const nameStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: nameY.value }],
    opacity: nameOpacity.value,
  }));

  if (!item) return null;

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.container}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]} />

        <Animated.Text style={[styles.arise, { color: accentColor, shadowColor: accentColor }, ariseStyle]}>
          {isShadow ? 'ARISE' : 'UNLOCKED'}
        </Animated.Text>

        <Animated.View style={[styles.card, { borderColor: accentColor }, cardStyle]}>
          <View style={[styles.iconBox, { backgroundColor: accentColor + '22', borderColor: accentColor }]}>
            <Text style={[styles.iconText, { color: accentColor }]}>
              {isShadow ? '👥' : '🏆'}
            </Text>
          </View>

          <Animated.View style={nameStyle}>
            <Text style={styles.typeLabel}>
              {isShadow ? 'NEW SHADOW' : 'NEW TITLE'}
            </Text>
            <Text style={[styles.itemName, { color: accentColor }]}>{item.name}</Text>
            <Text style={styles.itemDesc}>{item.description}</Text>
            {!isShadow && item.titleReward && (
              <View style={[styles.titleBadge, { borderColor: accentColor }]}>
                <Text style={[styles.titleBadgeText, { color: accentColor }]}>
                  「{item.titleReward}」
                </Text>
              </View>
            )}
          </Animated.View>
        </Animated.View>

        <Text style={styles.tapClose}>Tocca per continuare</Text>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  overlay: { backgroundColor: 'rgba(0,0,0,0.92)' },
  arise: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 8,
    marginBottom: 32,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 16,
  },
  card: {
    width: width * 0.82,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 16,
  },
  iconBox: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  iconText: { fontSize: 32 },
  typeLabel: { color: Colors.textMuted, fontSize: 10, letterSpacing: 4, textAlign: 'center', marginBottom: 8 },
  itemName: { fontSize: 24, fontWeight: '800', textAlign: 'center', letterSpacing: 2, marginBottom: 8 },
  itemDesc: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  titleBadge: {
    marginTop: 12, paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderRadius: 8,
  },
  titleBadgeText: { fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  tapClose: { color: Colors.textMuted, fontSize: 11, letterSpacing: 2, marginTop: 24 },
});
