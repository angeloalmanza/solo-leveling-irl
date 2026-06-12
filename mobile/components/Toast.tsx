import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useUiStore, ToastType } from '../stores/uiStore';
import { Colors } from '../constants/theme';

const TYPE_COLOR: Record<ToastType, string> = {
  error: Colors.error,
  info: Colors.accent,
  success: Colors.success,
};

export function Toast() {
  const { toastMessage, toastType, hideToast } = useUiStore();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toastMessage) return;
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -120, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start(() => hideToast());
    }, 3500);

    return () => clearTimeout(timer);
  }, [toastMessage]);

  if (!toastMessage) return null;

  return (
    <Animated.View
      style={[styles.container, { borderColor: TYPE_COLOR[toastType], transform: [{ translateY }], opacity }]}
      pointerEvents="box-none"
    >
      <TouchableOpacity activeOpacity={0.9} onPress={hideToast} style={styles.inner}>
        <Text style={[styles.text, { color: TYPE_COLOR[toastType] }]}>{toastMessage}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 1000,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderRadius: 8,
  },
  inner: { paddingVertical: 12, paddingHorizontal: 16 },
  text: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
});
