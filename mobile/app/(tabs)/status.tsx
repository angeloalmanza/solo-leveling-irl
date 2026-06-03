import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';

export default function StatusScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>STATUS WINDOW</Text>
      <Text style={styles.sub}>Coming in FASE 2</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.accent, fontSize: 24, fontWeight: 'bold', letterSpacing: 3 },
  sub: { color: Colors.textSecondary, marginTop: 8 },
});
