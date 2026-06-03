import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>THE SYSTEM</Text>
      <Text style={styles.subtitle}>Login — coming in FASE 1</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.accent, fontSize: 32, fontWeight: 'bold', letterSpacing: 4 },
  subtitle: { color: Colors.textSecondary, marginTop: 12 },
});
