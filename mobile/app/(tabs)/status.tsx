import { useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCharacterStore, streakMultiplier } from '../../stores/characterStore';
import { RankBadge } from '../../components/RankBadge';
import { XPBar } from '../../components/XPBar';
import { StatCard } from '../../components/StatCard';
import { router } from 'expo-router';
import { Colors, RankColors } from '../../constants/theme';

export default function StatusScreen() {
  const { character, loading, lastPenalty, fetch, clearPenalty } = useCharacterStore();

  useEffect(() => { fetch(); }, []);

  useEffect(() => {
    if (!lastPenalty) return;
    const lines = [
      `Hai saltato ${lastPenalty.daysLost} giorno${lastPenalty.daysLost > 1 ? 'i' : ''} senza completare quest.`,
      `Hai perso ${lastPenalty.xpLost} XP.`,
      lastPenalty.levelDown ? `Sei sceso al livello ${lastPenalty.newLevel}.` : '',
      lastPenalty.rankDown ? `Sei retrocesso di Rank.` : '',
      '\nLa streak è stata azzerata.',
    ].filter(Boolean).join('\n');

    Alert.alert('⚠ PENALITÀ INATTIVITÀ', lines, [
      { text: 'Capito', onPress: clearPenalty },
    ]);
  }, [lastPenalty]);

  if (loading && !character) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  if (!character) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Errore nel caricamento del personaggio</Text>
        <TouchableOpacity onPress={fetch}><Text style={styles.retry}>Riprova</Text></TouchableOpacity>
      </View>
    );
  }

  const rankColor = RankColors[character.rank] ?? Colors.accent;
  const mult = streakMultiplier(character.streak);
  const hasBonus = mult > 1;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <LinearGradient colors={['#0d1a2e', Colors.background]} style={styles.header}>
        <Text style={styles.systemLabel}>[ STATUS WINDOW ]</Text>

        <View style={styles.nameRow}>
          <RankBadge rank={character.rank} size="lg" />
          <View style={styles.nameBlock}>
            <Text style={styles.name}>{character.name}</Text>
            {character.activeTitle && (
              <Text style={[styles.title, { color: rankColor }]}>「{character.activeTitle}」</Text>
            )}
          </View>
        </View>

        <View style={styles.levelRow}>
          <Text style={styles.levelLabel}>LV.</Text>
          <Text style={[styles.levelValue, { color: rankColor }]}>{character.level}</Text>
          <Text style={styles.rankLabel}>{character.rank}-RANK HUNTER</Text>
        </View>

        <XPBar xp={character.xp} level={character.level} />

        {/* Streak */}
        <View style={styles.streakRow}>
          <Text style={styles.streakIcon}>🔥</Text>
          <Text style={styles.streakValue}>{character.streak}</Text>
          <Text style={styles.streakLabel}>
            {character.streak === 1 ? 'giorno consecutivo' : 'giorni consecutivi'}
          </Text>
          {hasBonus && (
            <View style={styles.multBadge}>
              <Text style={styles.multText}>×{mult.toFixed(2)} XP</Text>
            </View>
          )}
        </View>
        {character.bestStreak > 0 && (
          <Text style={styles.bestStreak}>Record: {character.bestStreak} giorni</Text>
        )}
      </LinearGradient>

      <View style={styles.divider} />
      <Text style={styles.sectionLabel}>[ STATISTICS ]</Text>

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.halfBtn} onPress={() => router.push('/progress')}>
          <Text style={styles.halfBtnText}>[ PROGRESSI ]</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.halfBtn} onPress={() => router.push('/body')}>
          <Text style={styles.halfBtnText}>[ MISURE ]</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard stat="STR" value={character.str} />
          <StatCard stat="AGI" value={character.agi} />
          <StatCard stat="INT" value={character.int} />
        </View>
        <View style={styles.statsRow}>
          <StatCard stat="VIT" value={character.vit} />
          <StatCard stat="END" value={character.end} />
          <View style={styles.empty} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  center: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: Colors.textSecondary, marginBottom: 12 },
  retry: { color: Colors.accent, fontWeight: '700' },

  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 24 },
  systemLabel: { color: Colors.textMuted, fontSize: 10, letterSpacing: 4, marginBottom: 20, fontFamily: 'Orbitron_400Regular' },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  nameBlock: { flex: 1 },
  name: { color: Colors.text, fontSize: 22, fontFamily: 'Orbitron_700Bold', letterSpacing: 2 },
  title: { fontSize: 13, fontWeight: '600', marginTop: 4, letterSpacing: 1 },

  levelRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 16 },
  levelLabel: { color: Colors.textSecondary, fontSize: 13, letterSpacing: 2 },
  levelValue: { fontSize: 42, fontFamily: 'Orbitron_800ExtraBold', lineHeight: 50 },
  rankLabel: { color: Colors.textSecondary, fontSize: 10, letterSpacing: 2, marginLeft: 8, fontFamily: 'Orbitron_400Regular' },

  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  streakIcon: { fontSize: 20 },
  streakValue: { color: Colors.text, fontSize: 22, fontFamily: 'Orbitron_700Bold' },
  streakLabel: { color: Colors.textSecondary, fontSize: 12, flex: 1 },
  multBadge: {
    backgroundColor: 'rgba(255,180,0,0.15)', borderWidth: 1,
    borderColor: '#ffd700', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  multText: { color: '#ffd700', fontSize: 11, fontWeight: '800' },
  bestStreak: { color: Colors.textMuted, fontSize: 11, marginTop: 4, marginLeft: 28 },

  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 24, marginVertical: 8 },
  sectionLabel: { color: Colors.textMuted, fontSize: 10, letterSpacing: 4, marginHorizontal: 24, marginTop: 16, marginBottom: 12 },

  btnRow: { flexDirection: 'row', marginHorizontal: 24, marginBottom: 16, gap: 10 },
  halfBtn: { flex: 1, borderWidth: 1, borderColor: Colors.accent, borderRadius: 6, paddingVertical: 10, alignItems: 'center' },
  halfBtnText: { color: Colors.accent, fontSize: 10, letterSpacing: 2 },

  statsGrid: { paddingHorizontal: 24, gap: 10 },
  statsRow: { flexDirection: 'row', gap: 10 },
  empty: { flex: 1 },
});
