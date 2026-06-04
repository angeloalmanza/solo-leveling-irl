import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, Animated, TouchableOpacity, Alert,
} from 'react-native';
import { useQuestStore, DailyQuest, CompleteResult } from '../../stores/questStore';
import { QuestCard } from '../../components/QuestCard';
import { LevelUpModal } from '../../components/LevelUpModal';
import { RankUpModal } from '../../components/RankUpModal';
import { UnlockModal, UnlockItem } from '../../components/UnlockModal';
import { Colors } from '../../constants/theme';

const CATEGORY_LABELS: Record<string, string> = {
  fitness: '⚔ PHYSICAL TRAINING',
  mente: '🔮 MENTAL FORTITUDE',
};

export default function QuestsScreen() {
  const { quests, loading, refreshing, completing, fetch, refresh, complete } = useQuestStore();
  const [bannerVisible, setBannerVisible] = useState(false);
  const bannerOpacity = useRef(new Animated.Value(0)).current;

  const [levelUpData, setLevelUpData] = useState<{ oldLevel: number; newLevel: number } | null>(null);
  const [rankUpData, setRankUpData] = useState<{ newRank: string; newLevel: number } | null>(null);
  const [unlockQueue, setUnlockQueue] = useState<UnlockItem[]>([]);

  useEffect(() => { fetch(); }, []);

  function showBanner() {
    setBannerVisible(true);
    Animated.sequence([
      Animated.timing(bannerOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(bannerOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setBannerVisible(false));
  }

  function handleModalResult(result: CompleteResult) {
    if (result.rankedUp) {
      setRankUpData({ newRank: result.newRank, newLevel: result.newLevel });
    } else if (result.leveledUp) {
      setLevelUpData({ oldLevel: result.oldLevel, newLevel: result.newLevel });
    }
    const { shadows, achievements } = result.newlyUnlocked;
    const items: UnlockItem[] = [
      ...shadows.map((s) => ({ type: 'shadow' as const, name: s.name, rank: s.rank, description: s.description })),
      ...achievements.map((a) => ({ type: 'achievement' as const, name: a.name, titleReward: a.titleReward, description: a.description })),
    ];
    if (items.length > 0) setUnlockQueue(items);
  }

  async function handleComplete(questId: string) {
    try {
      const result = await complete(questId);
      if (!result.undone) {
        showBanner();
        handleModalResult(result);
      }
    } catch { /* handled in store */ }
  }

  const grouped = quests.reduce<Record<string, DailyQuest[]>>((acc, q) => {
    const cat = q.questTemplate.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(q);
    return acc;
  }, {});

  const completedCount = quests.filter((q) => q.completed).length;
  const totalCount = quests.length;

  return (
    <View style={styles.container}>
      {bannerVisible && (
        <Animated.View style={[styles.banner, { opacity: bannerOpacity }]}>
          <Text style={styles.bannerText}>QUEST COMPLETATA</Text>
        </Animated.View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetch} tintColor={Colors.accent} />}
      >
        <View style={styles.header}>
          <Text style={styles.systemLabel}>[ DAILY QUESTS ]</Text>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() =>
              Alert.alert(
                'CAMBIA MISSIONI',
                'Vuoi sostituire le quest non completate con nuove missioni generate dall\'AI?',
                [
                  { text: 'Annulla', style: 'cancel' },
                  { text: 'Sì, cambia', onPress: refresh },
                ],
              )
            }
            disabled={refreshing}
          >
            <Text style={[styles.refreshIcon, refreshing && { opacity: 0.4 }]}>↻</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>{completedCount}/{totalCount} completate</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: totalCount ? `${(completedCount / totalCount) * 100}%` : '0%' }]} />
          </View>
        </View>

        {Object.entries(grouped).map(([category, categoryQuests]) => (
          <View key={category} style={styles.section}>
            <Text style={styles.sectionTitle}>{CATEGORY_LABELS[category] ?? category.toUpperCase()}</Text>
            {categoryQuests.map((quest) => (
              <QuestCard
                key={quest.id}
                id={quest.id}
                title={quest.questTemplate.title}
                description={quest.questTemplate.description}
                xpReward={quest.questTemplate.xpReward}
                statRewards={quest.questTemplate.statRewards}
                difficulty={quest.questTemplate.difficulty}
                completed={quest.completed}
                completing={completing === quest.id}
                onComplete={() => handleComplete(quest.id)}
              />
            ))}
          </View>
        ))}

        {totalCount === 0 && !loading && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Nessuna quest disponibile</Text>
          </View>
        )}

        {completedCount === totalCount && totalCount > 0 && (
          <View style={styles.allDone}>
            <Text style={styles.allDoneText}>[ ALL QUESTS COMPLETED ]</Text>
            <Text style={styles.allDoneSub}>Torna domani per nuove missioni</Text>
          </View>
        )}
      </ScrollView>

      <LevelUpModal
        visible={!!levelUpData}
        oldLevel={levelUpData?.oldLevel ?? 1}
        newLevel={levelUpData?.newLevel ?? 1}
        onClose={() => setLevelUpData(null)}
      />

      <RankUpModal
        visible={!!rankUpData}
        newRank={rankUpData?.newRank ?? 'E'}
        newLevel={rankUpData?.newLevel ?? 1}
        onClose={() => setRankUpData(null)}
      />

      <UnlockModal
        visible={unlockQueue.length > 0}
        item={unlockQueue[0] ?? null}
        onClose={() => setUnlockQueue((q) => q.slice(1))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },

  banner: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 100,
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    alignItems: 'center',
  },
  bannerText: { color: Colors.background, fontSize: 13, fontWeight: '800', letterSpacing: 4 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  systemLabel: { color: Colors.textMuted, fontSize: 10, letterSpacing: 4 },
  refreshBtn: { padding: 6 },
  refreshIcon: { color: Colors.accent, fontSize: 22 },

  progressRow: { gap: 8, marginBottom: 28 },
  progressText: { color: Colors.textSecondary, fontSize: 12 },
  progressTrack: { height: 4, backgroundColor: Colors.surfaceElevated, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: 2 },

  section: { marginBottom: 24 },
  sectionTitle: { color: Colors.textSecondary, fontSize: 11, letterSpacing: 3, marginBottom: 12 },

  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: Colors.textMuted, fontSize: 14 },

  allDone: { alignItems: 'center', marginTop: 20, padding: 20, borderWidth: 1, borderColor: Colors.accent, borderRadius: 8 },
  allDoneText: { color: Colors.accent, fontSize: 13, fontWeight: '800', letterSpacing: 3 },
  allDoneSub: { color: Colors.textSecondary, fontSize: 12, marginTop: 6 },
});
