import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView, Platform, KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore, RegisterData } from '../../stores/authStore';
import { Colors } from '../../constants/theme';

const ACTIVITY_OPTIONS: { label: string; value: RegisterData['activityLevel'] }[] = [
  { label: 'Sedentario', value: 'sedentary' },
  { label: 'Leggero', value: 'light' },
  { label: 'Moderato', value: 'moderate' },
  { label: 'Attivo', value: 'active' },
  { label: 'Molto attivo', value: 'very_active' },
];

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [activityLevel, setActivityLevel] = useState<RegisterData['activityLevel']>('moderate');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);

  async function handleRegister() {
    if (!email || !password || !characterName || !weight || !height || !age) {
      setError('Compila tutti i campi');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register({
        email: email.trim(),
        password,
        characterName: characterName.trim(),
        weight: parseFloat(weight),
        height: parseFloat(height),
        age: parseInt(age, 10),
        sex,
        activityLevel,
      });
      router.replace('/(tabs)/status');
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Errore durante la registrazione');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.system}>[ SYSTEM ]</Text>
        <Text style={styles.title}>CREA IL TUO{'\n'}PERSONAGGIO</Text>
        <Text style={styles.subtitle}>Il Sistema ha rilevato un nuovo Hunter</Text>

        <Field label="NOME PERSONAGGIO">
          <TextInput style={styles.input} value={characterName} onChangeText={setCharacterName}
            placeholder="Sung Jinwoo" placeholderTextColor={Colors.textMuted} />
        </Field>

        <Field label="EMAIL">
          <TextInput style={styles.input} value={email} onChangeText={setEmail}
            placeholder="hunter@example.com" placeholderTextColor={Colors.textMuted}
            keyboardType="email-address" autoCapitalize="none" />
        </Field>

        <Field label="PASSWORD">
          <TextInput style={styles.input} value={password} onChangeText={setPassword}
            placeholder="min. 6 caratteri" placeholderTextColor={Colors.textMuted} secureTextEntry />
        </Field>

        <View style={styles.row}>
          <Field label="PESO (kg)" style={styles.half}>
            <TextInput style={styles.input} value={weight} onChangeText={setWeight}
              placeholder="75" placeholderTextColor={Colors.textMuted} keyboardType="numeric" />
          </Field>
          <Field label="ALTEZZA (cm)" style={styles.half}>
            <TextInput style={styles.input} value={height} onChangeText={setHeight}
              placeholder="175" placeholderTextColor={Colors.textMuted} keyboardType="numeric" />
          </Field>
        </View>

        <View style={styles.row}>
          <Field label="ETÀ" style={styles.half}>
            <TextInput style={styles.input} value={age} onChangeText={setAge}
              placeholder="25" placeholderTextColor={Colors.textMuted} keyboardType="numeric" />
          </Field>
          <Field label="SESSO" style={styles.half}>
            <View style={styles.toggle}>
              {(['male', 'female'] as const).map((s) => (
                <TouchableOpacity key={s} style={[styles.toggleBtn, sex === s && styles.toggleActive]} onPress={() => setSex(s)}>
                  <Text style={[styles.toggleText, sex === s && styles.toggleTextActive]}>
                    {s === 'male' ? 'M' : 'F'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>
        </View>

        <Field label="LIVELLO DI ATTIVITÀ">
          <View style={styles.activityRow}>
            {ACTIVITY_OPTIONS.map((opt) => (
              <TouchableOpacity key={opt.value}
                style={[styles.activityBtn, activityLevel === opt.value && styles.activityActive]}
                onPress={() => setActivityLevel(opt.value)}>
                <Text style={[styles.activityText, activityLevel === opt.value && styles.activityTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={Colors.background} />
          ) : (
            <Text style={styles.buttonText}>ARISE</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.link} onPress={() => router.back()}>
          <Text style={styles.linkText}>Hai già un account? <Text style={styles.linkAccent}>Accedi</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: object }) {
  return (
    <View style={[{ marginBottom: 12 }, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: 32, paddingVertical: 48 },
  system: { color: Colors.accent, fontSize: 11, letterSpacing: 6, textAlign: 'center', marginBottom: 16 },
  title: { color: Colors.text, fontSize: 32, fontWeight: '800', letterSpacing: 4, textAlign: 'center', lineHeight: 40 },
  subtitle: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 8, marginBottom: 32 },
  label: { color: Colors.textSecondary, fontSize: 11, letterSpacing: 3, marginBottom: 6 },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: Colors.text,
    fontSize: 15,
  },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  toggle: { flexDirection: 'row', gap: 8 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
  },
  toggleActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  toggleText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 15 },
  toggleTextActive: { color: Colors.background },
  activityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  activityBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
  },
  activityActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  activityText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  activityTextActive: { color: Colors.background },
  error: { color: Colors.error, fontSize: 13, textAlign: 'center', marginVertical: 8 },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 6,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: { color: Colors.background, fontSize: 14, fontWeight: '800', letterSpacing: 4 },
  link: { alignItems: 'center', marginTop: 20 },
  linkText: { color: Colors.textSecondary, fontSize: 14 },
  linkAccent: { color: Colors.accent, fontWeight: '700' },
});
