import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withDelay, withSequence, withRepeat,
  Easing,
} from 'react-native-reanimated';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/theme';

const { height } = Dimensions.get('window');

const LINES = [
  '[ SISTEMA DI RILEVAMENTO ATTIVO ]',
  'UN NUOVO GIOCATORE',
  'È STATO RILEVATO',
  'INIZIALIZZAZIONE IN CORSO...',
];

export default function OnboardingScreen() {
  const [lineIndex, setLineIndex] = useState(-1);
  const [showButton, setShowButton] = useState(false);

  const systemOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(20);
  const buttonOpacity = useSharedValue(0);
  const cursorOpacity = useSharedValue(1);

  useEffect(() => {
    cursorOpacity.value = withRepeat(
      withSequence(withTiming(0, { duration: 500 }), withTiming(1, { duration: 500 })),
      -1, false
    );

    systemOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    titleOpacity.value = withDelay(1000, withTiming(1, { duration: 800 }));
    titleY.value = withDelay(1000, withTiming(0, { duration: 800, easing: Easing.out(Easing.cubic) }));

    const timers: ReturnType<typeof setTimeout>[] = [];
    LINES.forEach((_, i) => {
      timers.push(setTimeout(() => setLineIndex(i), 1800 + i * 700));
    });
    timers.push(setTimeout(() => {
      setShowButton(true);
      buttonOpacity.value = withTiming(1, { duration: 600 });
    }, 1800 + LINES.length * 700 + 400));

    return () => timers.forEach(clearTimeout);
  }, []);

  async function handleBegin() {
    await SecureStore.setItemAsync('hasOnboarded', 'true');
    router.replace('/(auth)/login');
  }

  const sysStyle = useAnimatedStyle(() => ({ opacity: systemOpacity.value }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));
  const btnStyle = useAnimatedStyle(() => ({ opacity: buttonOpacity.value }));
  const cursorStyle = useAnimatedStyle(() => ({ opacity: cursorOpacity.value }));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000010', '#0a0a1a', '#001020']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <Animated.Text style={[styles.systemTag, sysStyle]}>
          SOLO LEVELING: IRL
        </Animated.Text>

        <Animated.View style={[styles.titleBlock, titleStyle]}>
          <Text style={styles.title}>THE SYSTEM</Text>
          <Text style={styles.titleSub}>REAL WORLD PROTOCOL</Text>
        </Animated.View>

        <View style={styles.terminal}>
          {LINES.map((line, i) => (
            <TerminalLine key={i} text={line} visible={lineIndex >= i} />
          ))}
          {lineIndex < LINES.length - 1 && lineIndex >= 0 && (
            <Animated.Text style={[styles.cursor, cursorStyle]}>▌</Animated.Text>
          )}
        </View>

        {showButton && (
          <Animated.View style={btnStyle}>
            <TouchableOpacity style={styles.button} onPress={handleBegin}>
              <Text style={styles.buttonText}>INIZIALIZZA HUNTER</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

function TerminalLine({ text, visible }: { text: string; visible: boolean }) {
  const opacity = useSharedValue(0);
  const y = useSharedValue(8);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 300 });
      y.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) });
    }
  }, [visible]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));

  return (
    <Animated.Text style={[styles.termLine, style]}>{text}</Animated.Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000010' },
  content: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32, gap: 32,
  },
  systemTag: {
    color: Colors.accent,
    fontSize: 10,
    letterSpacing: 5,
    fontFamily: 'Orbitron_400Regular',
  },
  titleBlock: { alignItems: 'center', gap: 8 },
  title: {
    color: Colors.text,
    fontSize: 42,
    fontFamily: 'Orbitron_800ExtraBold',
    letterSpacing: 4,
    textAlign: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  titleSub: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: 'Orbitron_400Regular',
    letterSpacing: 4,
  },
  terminal: {
    width: '100%',
    backgroundColor: 'rgba(0,212,255,0.04)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 16,
    gap: 8,
    minHeight: 120,
  },
  termLine: {
    color: Colors.accent,
    fontSize: 12,
    fontFamily: 'Orbitron_400Regular',
    letterSpacing: 1,
  },
  cursor: { color: Colors.accent, fontSize: 18 },
  button: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 6,
  },
  buttonText: {
    color: Colors.background,
    fontSize: 13,
    fontFamily: 'Orbitron_700Bold',
    letterSpacing: 3,
  },
});
