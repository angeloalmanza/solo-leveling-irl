import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';

export default function QuestsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>DAILY QUESTS</Text>
      <Text style={styles.sub}>Coming in FASE 3</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.accent, fontSize: 24, fontWeight: 'bold', letterSpacing: 3 },
  sub: { color: Colors.textSecondary, marginTop: 8 },
});
