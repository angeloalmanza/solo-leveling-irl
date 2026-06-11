import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import Svg, { Polyline, Line as SvgLine, Text as SvgText, Circle } from 'react-native-svg';
import { api } from '../lib/api';
import { Colors } from '../constants/theme';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - 48;
const CHART_H = 140;
const PAD = { top: 10, bottom: 24, left: 36, right: 8 };

interface BodyLog { date: string; weight: number | null; waist: number | null; chest: number | null }

function WeightChart({ logs }: { logs: BodyLog[] }) {
  const withWeight = [...logs].reverse().filter((l) => l.weight !== null) as (BodyLog & { weight: number })[];
  if (withWeight.length < 2) return (
    <View style={chart.empty}>
      <Text style={chart.emptyText}>Registra almeno 2 misurazioni per vedere il grafico</Text>
    </View>
  );

  const w = CHART_W - PAD.left - PAD.right;
  const h = CHART_H - PAD.top - PAD.bottom;
  const weights = withWeight.map((l) => l.weight);
  const minW = Math.min(...weights) - 1;
  const maxW = Math.max(...weights) + 1;

  function toX(i: number) { return PAD.left + (i / (withWeight.length - 1)) * w; }
  function toY(v: number) { return PAD.top + h - ((v - minW) / (maxW - minW)) * h; }

  const pts = withWeight.map((l, i) => `${toX(i)},${toY(l.weight)}`).join(' ');

  return (
    <Svg width={CHART_W} height={CHART_H}>
      {[0, 0.5, 1].map((t) => {
        const y = PAD.top + t * h;
        const val = (minW + (1 - t) * (maxW - minW)).toFixed(1);
        return (
          <SvgLine key={t} x1={PAD.left} y1={y} x2={PAD.left + w} y2={y} stroke="#1a2a40" strokeWidth="1" />
        );
      })}
      {[0, 0.5, 1].map((t) => {
        const y = PAD.top + t * h;
        const val = (minW + (1 - t) * (maxW - minW)).toFixed(1);
        return (
          <SvgText key={`l${t}`} x={PAD.left - 4} y={y + 4} fontSize="9" fill={Colors.textMuted} textAnchor="end">{val}</SvgText>
        );
      })}
      <Polyline points={pts} fill="none" stroke={Colors.accent} strokeWidth="2" />
      {withWeight.map((l, i) => (
        <Circle key={i} cx={toX(i)} cy={toY(l.weight)} r="3" fill={Colors.accent} />
      ))}
    </Svg>
  );
}

export default function BodyScreen() {
  const [logs, setLogs] = useState<BodyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [chest, setChest] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<BodyLog[]>('/body/logs');
      setLogs(data);
      const today = data[0];
      if (today?.weight) setWeight(String(today.weight));
      if (today?.waist) setWaist(String(today.waist));
      if (today?.chest) setChest(String(today.chest));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  async function handleSave() {
    const body: Record<string, number> = {};
    const w = parseFloat(weight.replace(',', '.'));
    const wa = parseFloat(waist.replace(',', '.'));
    const ch = parseFloat(chest.replace(',', '.'));
    if (!isNaN(w) && w > 0) body.weight = w;
    if (!isNaN(wa) && wa > 0) body.waist = wa;
    if (!isNaN(ch) && ch > 0) body.chest = ch;

    if (Object.keys(body).length === 0) {
      Alert.alert('Errore', 'Inserisci almeno un valore');
      return;
    }

    setSaving(true);
    try {
      await api.post('/body/logs', body);
      await load();
      Alert.alert('SALVATO', 'Misure registrate per oggi');
    } catch {
      Alert.alert('Errore', 'Impossibile salvare le misure');
    } finally {
      setSaving(false);
    }
  }

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>← INDIETRO</Text>
        </TouchableOpacity>

        <Text style={styles.pageLabel}>[ MISURE CORPOREE ]</Text>
        <Text style={styles.dateLabel}>{todayStr}</Text>

        {/* Form */}
        <View style={styles.card}>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>PESO (kg)</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholder="es. 75.5"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>VITA (cm)</Text>
            <TextInput
              style={styles.input}
              value={waist}
              onChangeText={setWaist}
              keyboardType="decimal-pad"
              placeholder="es. 82"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>PETTO (cm)</Text>
            <TextInput
              style={styles.input}
              value={chest}
              onChangeText={setChest}
              keyboardType="decimal-pad"
              placeholder="es. 95"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color={Colors.background} /> : <Text style={styles.saveBtnText}>SALVA MISURE</Text>}
        </TouchableOpacity>

        {/* Grafico peso */}
        {!loading && logs.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>[ PESO NEL TEMPO ]</Text>
            <View style={styles.chartContainer}>
              <WeightChart logs={logs} />
            </View>
          </>
        )}

        {/* Storico */}
        {!loading && logs.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>[ STORICO ]</Text>
            <View style={styles.historyList}>
              {logs.slice(0, 10).map((log) => (
                <View key={log.date} style={styles.historyRow}>
                  <Text style={styles.historyDate}>{log.date}</Text>
                  <View style={styles.historyVals}>
                    {log.weight !== null && <Text style={styles.historyVal}>{log.weight} kg</Text>}
                    {log.waist !== null && <Text style={styles.historyVal}>V: {log.waist} cm</Text>}
                    {log.chest !== null && <Text style={styles.historyVal}>P: {log.chest} cm</Text>}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {loading && <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const chart = StyleSheet.create({
  empty: { height: CHART_H, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: 12 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingTop: 56, paddingBottom: 60 },

  back: { paddingHorizontal: 24, marginBottom: 8 },
  backText: { color: Colors.accent, fontSize: 11, letterSpacing: 2 },
  pageLabel: { color: Colors.textMuted, fontSize: 10, letterSpacing: 4, paddingHorizontal: 24, marginBottom: 4 },
  dateLabel: { color: Colors.textSecondary, fontSize: 12, paddingHorizontal: 24, marginBottom: 20 },
  sectionLabel: { color: Colors.textMuted, fontSize: 10, letterSpacing: 4, paddingHorizontal: 24, marginTop: 28, marginBottom: 12 },

  card: { marginHorizontal: 24, backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  inputLabel: { color: Colors.textSecondary, fontSize: 11, letterSpacing: 2, width: 90 },
  input: { flex: 1, color: Colors.text, fontSize: 18, fontWeight: '700', textAlign: 'right' },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 16 },

  saveBtn: { marginHorizontal: 24, marginTop: 16, backgroundColor: Colors.accent, borderRadius: 6, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: Colors.background, fontSize: 13, fontWeight: '800', letterSpacing: 3 },

  chartContainer: { paddingHorizontal: 24 },

  historyList: { marginHorizontal: 24, gap: 8 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, backgroundColor: Colors.surface, borderRadius: 6, borderWidth: 1, borderColor: Colors.border },
  historyDate: { color: Colors.textSecondary, fontSize: 12 },
  historyVals: { flexDirection: 'row', gap: 12 },
  historyVal: { color: Colors.text, fontSize: 13, fontWeight: '700' },
});
