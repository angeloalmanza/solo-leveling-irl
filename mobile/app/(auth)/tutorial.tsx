import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, NativeScrollEvent, NativeSyntheticEvent,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, RankColors } from '../../constants/theme';

const { width } = Dimensions.get('window');

// StyleSheet defined BEFORE SLIDES so JSX inside SLIDES can reference it
const s = StyleSheet.create({
  textBlock: { gap: 16 },
  body: { color: Colors.textSecondary, fontSize: 15, lineHeight: 24 },
  hl: { color: Colors.accent, fontWeight: '700' },

  statsBlock: { gap: 12 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  statBadge: {
    width: 44, height: 44, borderRadius: 6, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  statLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  statText: { flex: 1 },
  statName: { color: Colors.text, fontSize: 14, fontWeight: '700' },
  statDesc: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },

  missionBox: {
    backgroundColor: 'rgba(0,212,255,0.04)',
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 14, gap: 4,
  },
  missionTag: { fontSize: 11, fontFamily: 'Orbitron_700Bold', letterSpacing: 1, marginBottom: 4 },
  missionLine: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20 },

  rankRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, marginVertical: 20,
  },
  rankBadge: {
    width: 36, height: 36, borderRadius: 4, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  rankLetter: { fontSize: 14, fontWeight: '800' },
  arrow: { color: Colors.textMuted, fontSize: 20, marginHorizontal: 2 },

  container: { flex: 1, backgroundColor: '#000010' },
  dots: {
    flexDirection: 'row', justifyContent: 'center', gap: 8,
    paddingTop: 60, paddingBottom: 8,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  dotActive: { width: 20, backgroundColor: Colors.accent },
  slide: {
    paddingHorizontal: 32, paddingTop: 24, paddingBottom: 16,
    justifyContent: 'center',
  },
  tag: {
    color: Colors.textMuted, fontSize: 10, letterSpacing: 4,
    fontFamily: 'Orbitron_400Regular', marginBottom: 12,
  },
  title: {
    fontSize: 28, fontFamily: 'Orbitron_800ExtraBold',
    letterSpacing: 2, marginBottom: 16,
  },
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: 24 },
  nav: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingBottom: 48, paddingTop: 16,
  },
  navBtn: { paddingVertical: 12, paddingHorizontal: 16, minWidth: 100 },
  navBtnText: { color: Colors.textMuted, fontSize: 12, fontFamily: 'Orbitron_400Regular', letterSpacing: 2 },
  startBtn: {
    backgroundColor: Colors.accent, paddingVertical: 14, paddingHorizontal: 24,
    borderRadius: 6,
  },
  startBtnText: {
    color: Colors.background, fontSize: 12, fontFamily: 'Orbitron_700Bold', letterSpacing: 3,
  },
});

const STATS = [
  { stat: 'STR', label: 'Forza', desc: 'Missioni di allenamento fisico', color: '#ef4444' },
  { stat: 'AGI', label: 'Agilità', desc: 'Missioni di allenamento fisico', color: '#22c55e' },
  { stat: 'INT', label: 'Intelligenza', desc: 'Missioni mentali e studio', color: '#3b82f6' },
  { stat: 'END', label: 'Resistenza', desc: 'Missioni mentali e studio', color: '#eab308' },
  { stat: 'VIT', label: 'Vitalità', desc: 'Obiettivi alimentari giornalieri', color: '#ec4899' },
];

const RANKS = ['E', 'D', 'C', 'B', 'A', 'S'] as const;

const SLIDES = [
  {
    tag: '[ BRIEFING ]',
    title: 'IL SISTEMA',
    accent: Colors.accent,
    content: (
      <View style={s.textBlock}>
        <Text style={s.body}>
          Sei un <Text style={s.hl}>Hunter</Text> nel mondo reale.
        </Text>
        <Text style={s.body}>
          Completa missioni quotidiane, allenati e mantieni una dieta equilibrata
          per guadagnare <Text style={s.hl}>XP</Text>, aumentare il tuo livello e salire di rango.
        </Text>
        <Text style={s.body}>
          Il sistema monitora ogni tua azione. Ogni giorno è una nuova opportunità
          per diventare più forte.
        </Text>
      </View>
    ),
  },
  {
    tag: '[ STATISTICHE ]',
    title: 'I TUOI ATTRIBUTI',
    accent: Colors.accent,
    content: (
      <View style={s.statsBlock}>
        {STATS.map(({ stat, label, desc, color }) => (
          <View key={stat} style={s.statRow}>
            <View style={[s.statBadge, { borderColor: color }]}>
              <Text style={[s.statLabel, { color }]}>{stat}</Text>
            </View>
            <View style={s.statText}>
              <Text style={s.statName}>{label}</Text>
              <Text style={s.statDesc}>{desc}</Text>
            </View>
          </View>
        ))}
      </View>
    ),
  },
  {
    tag: '[ MISSIONI ]',
    title: 'QUEST GIORNALIERE',
    accent: Colors.accent,
    content: (
      <View style={s.textBlock}>
        <View style={s.missionBox}>
          <Text style={[s.missionTag, { color: '#ef4444' }]}>PHYSICAL TRAINING</Text>
          <Text style={s.missionLine}>2 missioni di allenamento fisico al giorno</Text>
          <Text style={s.missionLine}>Aumenta STR e AGI</Text>
        </View>
        <View style={s.missionBox}>
          <Text style={[s.missionTag, { color: '#3b82f6' }]}>MENTAL FORTITUDE</Text>
          <Text style={s.missionLine}>2 missioni mentali al giorno</Text>
          <Text style={s.missionLine}>Aumenta INT e END</Text>
        </View>
        <View style={s.missionBox}>
          <Text style={[s.missionTag, { color: '#ec4899' }]}>NUTRIZIONE</Text>
          <Text style={s.missionLine}>Raggiungi il 80% degli obiettivi calorici</Text>
          <Text style={s.missionLine}>Aumenta VIT e guadagni XP bonus</Text>
        </View>
      </View>
    ),
  },
  {
    tag: '[ PROGRESSIONE ]',
    title: 'RANGO E LIVELLO',
    accent: '#ffd700',
    content: (
      <View style={s.textBlock}>
        <Text style={s.body}>
          Accumula <Text style={s.hl}>XP</Text> per salire di livello.
          Ogni 100 livello XP guadagni un nuovo livello.
        </Text>
        <View style={s.rankRow}>
          {RANKS.map((r, i) => (
            <View key={r} style={{ alignItems: 'center', flexDirection: 'row' }}>
              <View style={[s.rankBadge, { borderColor: RankColors[r] }]}>
                <Text style={[s.rankLetter, { color: RankColors[r] }]}>{r}</Text>
              </View>
              {i < RANKS.length - 1 && (
                <Text style={s.arrow}>›</Text>
              )}
            </View>
          ))}
        </View>
        <Text style={s.body}>
          Salendo di rango sblocchi <Text style={s.hl}>Shadow Army</Text>,{' '}
          <Text style={s.hl}>titoli</Text> esclusivi e nuove abilità.
        </Text>
        <Text style={[s.body, { color: '#ffd700', fontSize: 11 }]}>
          Il rango S è riservato ai più forti.
        </Text>
      </View>
    ),
  },
];

export default function TutorialScreen() {
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  function goTo(index: number) {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
    setPage(index);
  }

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    if (idx !== page) setPage(idx);
  }

  async function handleFinish() {
    await SecureStore.setItemAsync('hasOnboarded', 'true');
    router.replace('/(auth)/login');
  }

  const isLast = page === SLIDES.length - 1;
  const slide = SLIDES[page];

  return (
    <View style={s.container}>
      <LinearGradient colors={['#000010', '#0a0a1a', '#001020']} style={StyleSheet.absoluteFill} />

      <View style={s.dots}>
        {SLIDES.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goTo(i)}>
            <View style={[s.dot, i === page && s.dotActive]} />
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {SLIDES.map((sl, i) => (
          <View key={i} style={[s.slide, { width }]}>
            <Text style={s.tag}>{sl.tag}</Text>
            <Text style={[s.title, { color: sl.accent }]}>{sl.title}</Text>
            <View style={s.divider} />
            {sl.content}
          </View>
        ))}
      </ScrollView>

      <View style={s.nav}>
        {page > 0 ? (
          <TouchableOpacity style={s.navBtn} onPress={() => goTo(page - 1)}>
            <Text style={s.navBtnText}>← INDIETRO</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.navBtn} />
        )}

        {isLast ? (
          <TouchableOpacity style={s.startBtn} onPress={handleFinish}>
            <Text style={s.startBtnText}>INIZIA →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.navBtn} onPress={() => goTo(page + 1)}>
            <Text style={[s.navBtnText, { color: Colors.accent }]}>AVANTI →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
