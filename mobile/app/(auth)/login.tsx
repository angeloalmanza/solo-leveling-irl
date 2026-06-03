import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { Colors } from '../../constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);

  async function handleLogin() {
    if (!email || !password) {
      setError('Inserisci email e password');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)/status');
    } catch {
      setError('Credenziali non valide');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.system}>[ SYSTEM ]</Text>
        <Text style={styles.title}>THE SYSTEM{'\n'}AWAITS</Text>
        <Text style={styles.subtitle}>Accedi al tuo profilo Hunter</Text>

        <View style={styles.form}>
          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="hunter@example.com"
            placeholderTextColor={Colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>PASSWORD</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={Colors.background} />
            ) : (
              <Text style={styles.buttonText}>ENTER THE SYSTEM</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.link} onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.linkText}>Non hai un account? <Text style={styles.linkAccent}>Registrati</Text></Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  system: { color: Colors.accent, fontSize: 10, letterSpacing: 5, textAlign: 'center', marginBottom: 16, fontFamily: 'Orbitron_400Regular' },
  title: { color: Colors.text, fontSize: 30, fontFamily: 'Orbitron_800ExtraBold', letterSpacing: 3, textAlign: 'center', lineHeight: 40 },
  subtitle: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 8, marginBottom: 40 },
  form: { gap: 8 },
  label: { color: Colors.textSecondary, fontSize: 11, letterSpacing: 3, marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.text,
    fontSize: 15,
  },
  error: { color: Colors.error, fontSize: 13, textAlign: 'center', marginTop: 8 },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 6,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: { color: Colors.background, fontSize: 12, fontFamily: 'Orbitron_700Bold', letterSpacing: 3 },
  link: { alignItems: 'center', marginTop: 20 },
  linkText: { color: Colors.textSecondary, fontSize: 14 },
  linkAccent: { color: Colors.accent, fontWeight: '700' },
});
