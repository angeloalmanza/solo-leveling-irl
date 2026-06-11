import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Calendar, type DateData } from 'react-native-calendars';
import Svg, { Polyline, Line as SvgLine, Text as SvgText } from 'react-native-svg';
import { api } from '../lib/api';
import { Colors } from '../constants/theme';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - 48;
const CHART_H = 160;
const CHART_PAD = { top: 10, bottom: 24, left: 28, right: 8 };

interface CalendarDay { date: string; total: number; completed: number }
interface Snapshot { date: string; str: number; agi: number; int: number; end: number; vit: number; level: number }
interface StatsData {
  current: { str: number; agi: number; int: number; end: number; vit: number; level: number };
  snapshots: Snapshot[];
}

const STAT_COLORS: Record<string, string> = {
  str: '#ff4444',
  agi: '#44ff88',
  int: '#4488ff',
  end: '#ff8800',
  vit: '#ff44cc',
};
const STATS = ['str', 'agi', 'int', 'end', 'vit'] as const;

function LineChart({ snapshots, current }: { snapshots: Snapshot[]; current: StatsData['current'] }) {
  const data = snapshots.length > 0 ? snapshots : [{ date: '', ...current }];
  if (data.length < 2) return (
    <View style={chart.empty}>
      <Text style={chart.emptyText}>Accumula più giorni per vedere il grafico</Text>
    </View>
  );

  const w = CHART_W - CHART_PAD.left - CHART_PAD.right;
  const h = CHART_H - CHART_PAD.top - CHART_PAD.bottom;

  const allVals = data.flatMap((d) => STATS.map((s) => d[s]));
  const minV = Math.max(0, Math.min(...allVals) - 2);
  const maxV = Math.max(...allVals) + 2;

  function toX(i: number) { return CHART_PAD.left + (i / (data.length - 1)) * w; }
  function toY(v: number) { return CHART_PAD.top + h - ((v - minV) / (maxV - minV)) * h; }

  return (
    <Svg width={CHART_W} height={CHART_H}>
      {/* Grid lines */}
      {[0, 0.5, 1].map((t) => {
        const y = CHART_PAD.top + t * h;
        const val = Math.round(minV + (1 - t) * (maxV - minV));
        return (
          <SvgLine key={t} x1={CHART_PAD.left} y1={y} x2={CHART_PAD.left + w} y2={y}
            stroke="#1a2a40" strokeWidth="1" />
        );
      })}
      {/* Y labels */}
      {[0, 0.5, 1].map((t) => {
        const y = CHART_PAD.top + t * h;
        const val = Math.round(minV + (1 - t) * (maxV - minV));
        return (
          <SvgText key={`l${t}`} x={CHART_PAD.left - 4} y={y + 4}
            fontSize="9" fill={Colors.textMuted} textAnchor="end">{val}</SvgText>
        );
      })}
      {/* Stat lines */}
      {STATS.map((stat) => {
        const pts = data.map((d, i) => `${toX(i)},${toY(d[stat])}`).join(' ');
        return <Polyline key={stat} points={pts} fill="none" stroke={STAT_COLORS[stat]} strokeWidth="2" />;
      })}
    </Svg>
  );
}

export default function ProgressScreen() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [calData, setCalData] = useState<CalendarDay[]>([]);
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (y: number, m: number) => {
    setLoading(true);
    try {
      const [cal, stats] = await Promise.all([
        api.get<CalendarDay[]>(`/progress/calendar?year=${y}&month=${m}`),
        api.get<StatsData>('/progress/stats'),
      ]);
      setCalData(cal.data);
      setStatsData(stats.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(year, month); }, [year, month]);

  const markedDates = calData.reduce<Record<string, object>>((acc, d) => {
    let dotColor: string = Colors.textMuted;
    if (d.completed > 0 && d.completed < d.total) dotColor = Colors.warning;
    else if (d.completed === d.total && d.total > 0) dotColor = Colors.success;
    acc[d.date] = { marked: true, dotColor };
    return acc;
  }, {});

  function onMonthChange(date: DateData) {
    setYear(date.year);
    setMonth(date.month);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← INDIETRO</Text>
      </TouchableOpacity>

      <Text style={styles.pageLabel}>[ PROGRESSI ]</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : (
        <>
          {/* Calendario */}
          <Text style={styles.sectionLabel}>[ CALENDARIO QUEST ]</Text>
          <View style={styles.legend}>
            <View style={[styles.dot, { backgroundColor: Colors.success }]} /><Text style={styles.legendText}>Tutte completate</Text>
            <View style={[styles.dot, { backgroundColor: Colors.warning }]} /><Text style={styles.legendText}>Parziali</Text>
            <View style={[styles.dot, { backgroundColor: Colors.textMuted }]} /><Text style={styles.legendText}>Nessuna</Text>
          </View>
          <Calendar
            markedDates={markedDates}
            onMonthChange={onMonthChange}
            theme={{
              backgroundColor: Colors.surface,
              calendarBackground: Colors.surface,
              textSectionTitleColor: Colors.textSecondary,
              dayTextColor: Colors.text,
              todayTextColor: Colors.accent,
              selectedDayBackgroundColor: Colors.accent,
              monthTextColor: Colors.text,
              arrowColor: Colors.accent,
              textDisabledColor: Colors.textMuted,
              dotColor: Colors.accent,
            }}
            style={styles.calendar}
          />

          {/* Grafici stat */}
          <Text style={[styles.sectionLabel, { marginTop: 28 }]}>[ STATISTICHE NEL TEMPO ]</Text>
          <View style={styles.statLegend}>
            {STATS.map((s) => (
              <View key={s} style={styles.statLegendItem}>
                <View style={[styles.dot, { backgroundColor: STAT_COLORS[s] }]} />
                <Text style={styles.legendText}>{s.toUpperCase()}</Text>
              </View>
            ))}
          </View>
          {statsData && (
            <View style={styles.chartContainer}>
              <LineChart snapshots={statsData.snapshots} current={statsData.current} />
            </View>
          )}

          {/* Stats correnti */}
          {statsData && (
            <View style={styles.currentStats}>
              {STATS.map((s) => (
                <View key={s} style={styles.statRow}>
                  <View style={[styles.statDot, { backgroundColor: STAT_COLORS[s] }]} />
                  <Text style={styles.statName}>{s.toUpperCase()}</Text>
                  <Text style={[styles.statVal, { color: STAT_COLORS[s] }]}>{statsData.current[s]}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const chart = StyleSheet.create({
  empty: { height: CHART_H, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: 12 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingTop: 56, paddingBottom: 40 },
  center: { paddingVertical: 40, alignItems: 'center' },

  back: { paddingHorizontal: 24, marginBottom: 8 },
  backText: { color: Colors.accent, fontSize: 11, letterSpacing: 2 },
  pageLabel: { color: Colors.textMuted, fontSize: 10, letterSpacing: 4, paddingHorizontal: 24, marginBottom: 20 },
  sectionLabel: { color: Colors.textMuted, fontSize: 10, letterSpacing: 4, paddingHorizontal: 24, marginBottom: 12 },

  legend: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, marginBottom: 10, flexWrap: 'wrap' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: Colors.textSecondary, fontSize: 11, marginRight: 12 },

  calendar: { marginHorizontal: 16, borderRadius: 8, overflow: 'hidden' },

  statLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 24, marginBottom: 12 },
  statLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  chartContainer: { paddingHorizontal: 24, marginBottom: 20 },

  currentStats: { marginHorizontal: 24, backgroundColor: Colors.surface, borderRadius: 8, padding: 16, borderWidth: 1, borderColor: Colors.border },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  statDot: { width: 10, height: 10, borderRadius: 5 },
  statName: { color: Colors.textSecondary, fontSize: 12, width: 40, letterSpacing: 1 },
  statVal: { fontSize: 18, fontWeight: '800' },
});
