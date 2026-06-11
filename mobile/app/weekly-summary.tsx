import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { api } from '../lib/api';
import { Colors } from '../constants/theme';

interface SummaryResponse {
  summary: string;
  generatedAt: string;
}

export default function WeeklySummaryScreen() {
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get<SummaryResponse>('/progress/weekly-summary')
      .then((res) => setData(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← INDIETRO</Text>
      </TouchableOpacity>

      <Text style={styles.title}>RAPPORTO DI SISTEMA</Text>
      <Text style={styles.subtitle}>RIEPILOGO SETTIMANALE</Text>
      <View style={styles.divider} />

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} size="large" />
          <Text style={styles.loadingText}>Il sistema sta analizzando la settimana...</Text>
        </View>
      )}

      {error && !loading && (
        <View style={styles.center}>
          <Text style={styles.errorText}>Errore nella generazione del rapporto</Text>
        </View>
      )}

      {data && !loading && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.body}>{data.summary}</Text>
          <Text style={styles.timestamp}>
            — Generato il {new Date(data.generatedAt).toLocaleString('it-IT')}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingTop: 56 },
  back: { paddingHorizontal: 24, marginBottom: 16 },
  backText: { color: Colors.accent, fontSize: 11, letterSpacing: 2 },

  title: { color: Colors.accent, fontSize: 14, fontWeight: '800', letterSpacing: 4, textAlign: 'center' },
  subtitle: { color: Colors.textSecondary, fontSize: 10, letterSpacing: 4, textAlign: 'center', marginTop: 4 },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 24, marginTop: 16, marginBottom: 20 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  loadingText: { color: Colors.textMuted, fontSize: 12, letterSpacing: 1, textAlign: 'center' },
  errorText: { color: Colors.error, fontSize: 13 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  body: { color: Colors.text, fontSize: 14, lineHeight: 24, letterSpacing: 0.3 },
  timestamp: { color: Colors.textMuted, fontSize: 10, marginTop: 24, textAlign: 'right', letterSpacing: 1 },
});
