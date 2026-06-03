import { useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useUnlockStore } from '../../stores/unlockStore';
import { RankBadge } from '../../components/RankBadge';
import { Colors, RankColors } from '../../constants/theme';

export default function ArmyScreen() {
  const { shadows, loadingShadows, fetchShadows } = useUnlockStore();

  useEffect(() => { fetchShadows(); }, []);

  const unlocked = shadows.filter((s) => s.unlocked);
  const locked = shadows.filter((s) => !s.unlocked);

  if (loadingShadows && shadows.length === 0) {
    return <View style={styles.center}><ActivityIndicator color={Colors.accent} size="large" /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loadingShadows} onRefresh={fetchShadows} tintColor={Colors.accent} />}
    >
      <Text style={styles.systemLabel}>[ SHADOW ARMY ]</Text>
      <Text style={styles.count}>{unlocked.length} / {shadows.length} ombre sbloccate</Text>

      {unlocked.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>SBLOCCATE</Text>
          <View style={styles.grid}>
            {unlocked.map((shadow) => (
              <View key={shadow.id} style={[styles.card, { borderColor: RankColors[shadow.rank] ?? Colors.border }]}>
                <View style={[styles.iconBg, { backgroundColor: (RankColors[shadow.rank] ?? Colors.accent) + '22' }]}>
                  <Text style={styles.shadowIcon}>👥</Text>
                </View>
                <RankBadge rank={shadow.rank} size="sm" />
                <Text style={[styles.shadowName, { color: RankColors[shadow.rank] ?? Colors.text }]}>{shadow.name}</Text>
                <Text style={styles.shadowDesc} numberOfLines={2}>{shadow.description}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {locked.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>BLOCCATE</Text>
          <View style={styles.grid}>
            {locked.map((shadow) => (
              <View key={shadow.id} style={[styles.card, styles.cardLocked]}>
                <View style={styles.iconBgLocked}>
                  <Text style={styles.shadowIcon}>❓</Text>
                </View>
                <Text style={styles.shadowNameLocked}>???</Text>
                <Text style={styles.shadowDescLocked} numberOfLines={2}>
                  {shadow.description.replace(/[a-zA-Z0-9àèéìòùÀÈÉÌÒÙ]/g, '?')}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {unlocked.length === shadows.length && shadows.length > 0 && (
        <View style={styles.complete}>
          <Text style={styles.completeText}>[ SHADOW ARMY COMPLETE ]</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  systemLabel: { color: Colors.textMuted, fontSize: 10, letterSpacing: 4, marginBottom: 4 },
  count: { color: Colors.textSecondary, fontSize: 13, marginBottom: 20 },
  sectionLabel: { color: Colors.textSecondary, fontSize: 10, letterSpacing: 3, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47%',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1, borderRadius: 10,
    padding: 14, alignItems: 'center', gap: 8,
  },
  cardLocked: { borderColor: Colors.border, opacity: 0.5 },
  iconBg: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  iconBgLocked: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  shadowIcon: { fontSize: 26 },
  shadowName: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  shadowNameLocked: { color: Colors.textMuted, fontSize: 14, fontWeight: '700' },
  shadowDesc: { color: Colors.textSecondary, fontSize: 11, textAlign: 'center', lineHeight: 14 },
  shadowDescLocked: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', lineHeight: 14 },
  complete: { marginTop: 24, padding: 16, borderWidth: 1, borderColor: Colors.accent, borderRadius: 8, alignItems: 'center' },
  completeText: { color: Colors.accent, fontSize: 12, fontWeight: '700', letterSpacing: 3 },
});
