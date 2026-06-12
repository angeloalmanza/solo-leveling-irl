import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, Animated, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useQuestStore, DailyQuest, CompleteResult } from '../../stores/questStore';
import { useBossStore, DefeatResult } from '../../stores/bossStore';
import { QuestCard } from '../../components/QuestCard';
import { LevelUpModal } from '../../components/LevelUpModal';
import { RankUpModal } from '../../components/RankUpModal';
import { UnlockModal, UnlockItem } from '../../components/UnlockModal';
import { Colors } from '../../constants/theme';

const CATEGORY_LABELS: Record<string, string> = {
  fitness: '⚔ PHYSICAL TRAINING',
  mente: '🔮 MENTAL FORTITUDE',
};

const DIFF_STARS = ['', '★', '★★', '★★★', '★★★★', '★★★★★'];

export default function QuestsScreen() {
  const { quests, loading, completing, fetch, reroll, complete } = useQuestStore();
  const { boss, loading: bossLoading, defeating, fetch: fetchBoss, completeTask, defeat } = useBossStore();
  const [bannerVisible, setBannerVisible] = useState(false);
  const bannerOpacity = useRef(new Animated.Value(0)).current;

  const [levelUpData, setLevelUpData] = useState<{ oldLevel: number; newLevel: number } | null>(null);
  const [rankUpData, setRankUpData] = useState<{ newRank: string; newLevel: number } | null>(null);
  const [unlockQueue, setUnlockQueue] = useState<UnlockItem[]>([]);

  useEffect(() => {
    fetch();
    fetchBoss();
  }, []);

  function showBanner() {
    setBannerVisible(true);
    Animated.sequence([
      Animated.timing(bannerOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(bannerOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setBannerVisible(false));
  }

  function handleDefeatResult(result: DefeatResult) {
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

  async function handleBossDefeat() {
    Alert.alert(
      'SCONFIGGI IL BOSS',
      'Hai completato tutte le sfide settimanali. Sei pronto a sconfiggere il boss?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'SCONFIGGI',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await defeat();
              handleDefeatResult(result);
            } catch { /* handled */ }
          },
        },
      ]
    );
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
    } catch (err: any) {
      const msg = err?.response?.data?.error;
      if (typeof msg === 'string') Alert.alert('Operazione non riuscita', msg);
    }
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
        <Text style={styles.systemLabel}>[ DAILY QUESTS ]</Text>
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>{completedCount}/{totalCount} completate</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: totalCount ? `${(completedCount / totalCount) * 100}%` : '0%' }]} />
          </View>
        </View>

        {/* ── BOSS SETTIMANALE ── */}
        {bossLoading && !boss ? (
          <View style={bossStyles.loadingContainer}>
            <ActivityIndicator color="#ff4444" size="small" />
            <Text style={bossStyles.loadingText}>Evocando il boss...</Text>
          </View>
        ) : boss ? (
          <View style={[bossStyles.card, boss.defeatedAt ? bossStyles.cardDefeated : null]}>
            <View style={bossStyles.header}>
              <Text style={bossStyles.systemLabel}>[ BOSS SETTIMANALE ]</Text>
              <Text style={bossStyles.difficulty}>{DIFF_STARS[boss.difficulty]}</Text>
            </View>
            <Text style={bossStyles.name}>{boss.name}</Text>
            <Text style={bossStyles.description}>{boss.description}</Text>
            <Text style={bossStyles.lore}>{boss.lore}</Text>

            <View style={bossStyles.progressRow}>
              <Text style={bossStyles.progressText}>
                {boss.tasks.filter((t) => t.completed).length}/{boss.tasks.length} sfide
              </Text>
              <View style={bossStyles.progressTrack}>
                <View
                  style={[
                    bossStyles.progressFill,
                    { width: `${(boss.tasks.filter((t) => t.completed).length / boss.tasks.length) * 100}%` },
                  ]}
                />
              </View>
            </View>

            <View style={bossStyles.tasks}>
              {boss.tasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  style={[bossStyles.task, task.completed ? bossStyles.taskDone : null]}
                  onPress={() => !boss.defeatedAt && completeTask(task.id)}
                  activeOpacity={boss.defeatedAt ? 1 : 0.7}
                >
                  <View style={[bossStyles.checkbox, task.completed ? bossStyles.checkboxDone : null]}>
                    {task.completed && <Text style={bossStyles.checkmark}>✓</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[bossStyles.taskTitle, task.completed ? bossStyles.taskTitleDone : null]}>
                      {task.title}
                    </Text>
                    <Text style={bossStyles.taskDesc}>{task.description}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={bossStyles.rewardRow}>
              <Text style={bossStyles.rewardText}>
                Ricompensa: <Text style={bossStyles.rewardXp}>{boss.xpReward} XP</Text>
              </Text>
            </View>

            {boss.defeatedAt ? (
              <View style={bossStyles.defeatedBanner}>
                <Text style={bossStyles.defeatedText}>[ BOSS SCONFITTO ]</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  bossStyles.defeatBtn,
                  boss.tasks.every((t) => t.completed) ? bossStyles.defeatBtnActive : bossStyles.defeatBtnDisabled,
                ]}
                onPress={boss.tasks.every((t) => t.completed) ? handleBossDefeat : undefined}
                disabled={!boss.tasks.every((t) => t.completed) || defeating}
              >
                {defeating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={bossStyles.defeatBtnText}>
                    {boss.tasks.every((t) => t.completed) ? '⚔ SCONFIGGI' : 'COMPLETA LE SFIDE'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        ) : null}

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
                onReroll={() => reroll(quest.id)}
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

const BOSS_RED = '#8b0000';
const BOSS_ACCENT = '#ff4444';

const bossStyles = StyleSheet.create({
  loadingContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24, padding: 16 },
  loadingText: { color: BOSS_ACCENT, fontSize: 12, letterSpacing: 2 },

  card: {
    borderWidth: 1,
    borderColor: BOSS_ACCENT,
    borderRadius: 8,
    backgroundColor: '#1a0000',
    padding: 16,
    marginBottom: 28,
  },
  cardDefeated: { borderColor: '#555', opacity: 0.7 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  systemLabel: { color: BOSS_ACCENT, fontSize: 10, letterSpacing: 4 },
  difficulty: { color: BOSS_ACCENT, fontSize: 12 },

  name: { color: '#ff8888', fontSize: 18, fontWeight: '800', letterSpacing: 2, marginBottom: 6 },
  description: { color: '#cc8888', fontSize: 13, marginBottom: 8 },
  lore: { color: '#996666', fontSize: 12, fontStyle: 'italic', marginBottom: 14, lineHeight: 18 },

  progressRow: { gap: 6, marginBottom: 14 },
  progressText: { color: '#cc8888', fontSize: 12 },
  progressTrack: { height: 3, backgroundColor: '#330000', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: BOSS_ACCENT, borderRadius: 2 },

  tasks: { gap: 10, marginBottom: 14 },
  task: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 10, borderRadius: 6, backgroundColor: '#200000', borderWidth: 1, borderColor: '#440000' },
  taskDone: { borderColor: '#553333', opacity: 0.6 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: BOSS_ACCENT, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxDone: { backgroundColor: BOSS_ACCENT, borderColor: BOSS_ACCENT },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: '800' },
  taskTitle: { color: '#ffaaaa', fontSize: 13, fontWeight: '700', marginBottom: 2 },
  taskTitleDone: { textDecorationLine: 'line-through', color: '#886666' },
  taskDesc: { color: '#996666', fontSize: 12 },

  rewardRow: { marginBottom: 12 },
  rewardText: { color: '#cc8888', fontSize: 12 },
  rewardXp: { color: BOSS_ACCENT, fontWeight: '800' },

  defeatedBanner: { alignItems: 'center', padding: 10, borderWidth: 1, borderColor: '#555', borderRadius: 6 },
  defeatedText: { color: '#888', fontSize: 12, letterSpacing: 3 },

  defeatBtn: { padding: 14, borderRadius: 6, alignItems: 'center' },
  defeatBtnActive: { backgroundColor: BOSS_RED, borderWidth: 1, borderColor: BOSS_ACCENT },
  defeatBtnDisabled: { backgroundColor: '#1a0000', borderWidth: 1, borderColor: '#440000' },
  defeatBtnText: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 3 },
});

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

  systemLabel: { color: Colors.textMuted, fontSize: 10, letterSpacing: 4, marginBottom: 14 },

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
