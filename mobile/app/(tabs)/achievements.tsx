import { useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl, TouchableOpacity,
} from 'react-native';
import { useUnlockStore } from '../../stores/unlockStore';
import { useCharacterStore } from '../../stores/characterStore';
import { api } from '../../lib/api';
import { Colors } from '../../constants/theme';

export default function AchievementsScreen() {
  const { achievements, loadingAchievements, fetchAchievements } = useUnlockStore();
  const { character, fetch: fetchCharacter } = useCharacterStore();

  useEffect(() => {
    fetchAchievements();
    fetchCharacter();
  }, []);

  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);

  if (loadingAchievements && achievements.length === 0) {
    return <View style={styles.center}><ActivityIndicator color={Colors.accent} size="large" /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loadingAchievements} onRefresh={fetchAchievements} tintColor={Colors.accent} />}
    >
      <Text style={styles.systemLabel}>[ TITLES ]</Text>

      {character?.activeTitle && (
        <View style={styles.activeBadge}>
          <Text style={styles.activelabel}>TITOLO ATTIVO</Text>
          <Text style={styles.activeTitle}>「{character.activeTitle}」</Text>
        </View>
      )}

      {unlocked.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>SBLOCCATI ({unlocked.length})</Text>
          {unlocked.map((ach) => (
            <AchievementRow
              key={ach.id}
              name={ach.name}
              description={ach.description}
              titleReward={ach.titleReward}
              unlockedAt={ach.unlockedAt}
              isActive={character?.activeTitle === ach.titleReward}
              onSetActive={() => {
                useCharacterStore.getState().setCharacter({ ...character!, activeTitle: ach.titleReward });
                api.patch('/character/me', { activeTitle: ach.titleReward }).catch(() => {});
              }}
            />
          ))}
        </>
      )}

      {locked.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>BLOCCATI ({locked.length})</Text>
          {locked.map((ach) => (
            <View key={ach.id} style={[styles.row, styles.rowLocked]}>
              <View style={styles.lockIcon}><Text>🔒</Text></View>
              <View style={styles.rowContent}>
                <Text style={styles.lockedName}>{ach.name}</Text>
                <Text style={styles.lockedDesc}>{ach.description}</Text>
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function AchievementRow({
  name, description, titleReward, unlockedAt, isActive, onSetActive,
}: {
  name: string; description: string; titleReward: string;
  unlockedAt: string | null; isActive: boolean; onSetActive: () => void;
}) {
  return (
    <View style={[styles.row, isActive && styles.rowActive]}>
      <View style={styles.trophyIcon}><Text>🏆</Text></View>
      <View style={styles.rowContent}>
        <Text style={styles.achName}>{name}</Text>
        <Text style={styles.achDesc}>{description}</Text>
        <View style={styles.rowFooter}>
          <Text style={styles.titleText}>「{titleReward}」</Text>
          {unlockedAt && (
            <Text style={styles.date}>{new Date(unlockedAt).toLocaleDateString('it-IT')}</Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={[styles.useBtn, isActive && styles.useBtnActive]}
        onPress={onSetActive}
      >
        <Text style={[styles.useBtnText, isActive && styles.useBtnTextActive]}>
          {isActive ? 'ATTIVO' : 'USA'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  systemLabel: { color: Colors.textMuted, fontSize: 10, letterSpacing: 4, marginBottom: 16 },

  activeBadge: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.accent,
    borderRadius: 10, padding: 14, marginBottom: 20, alignItems: 'center',
  },
  activelabel: { color: Colors.textMuted, fontSize: 10, letterSpacing: 3, marginBottom: 6 },
  activeTitle: { color: Colors.accent, fontSize: 20, fontWeight: '700', letterSpacing: 2 },

  sectionLabel: { color: Colors.textSecondary, fontSize: 10, letterSpacing: 3, marginBottom: 10 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    padding: 14, marginBottom: 8, gap: 12,
  },
  rowActive: { borderColor: Colors.accent },
  rowLocked: { opacity: 0.45 },
  trophyIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.accent + '22', alignItems: 'center', justifyContent: 'center' },
  lockIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  rowContent: { flex: 1 },
  achName: { color: Colors.text, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  achDesc: { color: Colors.textSecondary, fontSize: 12, marginBottom: 4 },
  rowFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleText: { color: Colors.accent, fontSize: 12, fontWeight: '600' },
  date: { color: Colors.textMuted, fontSize: 11 },
  lockedName: { color: Colors.textMuted, fontSize: 14, fontWeight: '700' },
  lockedDesc: { color: Colors.textMuted, fontSize: 12 },
  useBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 6,
  },
  useBtnActive: { borderColor: Colors.accent, backgroundColor: Colors.accent + '22' },
  useBtnText: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  useBtnTextActive: { color: Colors.accent },
});
