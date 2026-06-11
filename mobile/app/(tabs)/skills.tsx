import { useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useSkillStore, Skill } from '../../stores/skillStore';
import { useCharacterStore } from '../../stores/characterStore';
import { Colors, RankColors } from '../../constants/theme';

const INDENT = 22;

type SkillNode = Skill & { depth: number };

/** Appiattisce l'albero in ordine DFS (genitore poi figli), con la profondità. */
function flattenTree(skills: Skill[]): SkillNode[] {
  const roots = skills.filter((s) => !s.parentSkillId);
  const result: SkillNode[] = [];
  function visit(skill: Skill, depth: number) {
    result.push({ ...skill, depth });
    skills
      .filter((s) => s.parentSkillId === skill.id)
      .forEach((child) => visit(child, depth + 1));
  }
  roots.forEach((root) => visit(root, 0));
  return result;
}

function statBonusText(bonus: Record<string, number>) {
  return (
    Object.entries(bonus)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${k.toUpperCase()} +${v}`)
      .join(' · ') || ''
  );
}

export default function SkillsScreen() {
  const { skills, loading, unlocking, fetch, unlock } = useSkillStore();
  const { character } = useCharacterStore();
  const rankColor = RankColors[character?.rank ?? 'E'] ?? Colors.accent;

  useEffect(() => {
    fetch();
  }, []);

  const nodes = flattenTree(skills);

  function handleUnlock(skill: Skill) {
    if (skill.unlocked) return;
    if (!character || character.level < skill.unlockLevel) {
      Alert.alert('LIVELLO INSUFFICIENTE', `Raggiungi il livello ${skill.unlockLevel} per sbloccare questa skill.`);
      return;
    }
    if (skill.parentSkillId) {
      const parent = skills.find((s) => s.id === skill.parentSkillId);
      if (parent && !parent.unlocked) {
        Alert.alert('PREREQUISITO', `Sblocca prima "${parent.name}".`);
        return;
      }
    }
    Alert.alert(
      'SBLOCCA SKILL',
      `Vuoi sbloccare "${skill.name}"?${
        skill.type === 'passive' && Object.keys(skill.statBonus).length > 0
          ? `\n\nBonus: ${statBonusText(skill.statBonus)}`
          : ''
      }`,
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'SBLOCCA', onPress: () => unlock(skill.id) },
      ]
    );
  }

  if (loading && skills.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.accent} size="large" />
        <Text style={styles.loadingText}>Il Sistema sta generando il tuo albero...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.systemLabel}>[ SKILL TREE ]</Text>
      {character && (
        <Text style={styles.subtitle}>
          Lv.{character.level} · {character.rank}-RANK
        </Text>
      )}

      {nodes.map((node) => {
        const canUnlock =
          !node.unlocked &&
          !!character &&
          character.level >= node.unlockLevel &&
          (!node.parentSkillId || skills.find((s) => s.id === node.parentSkillId)?.unlocked);
        const isUnlocking = unlocking === node.id;

        return (
          <View key={node.id} style={[styles.nodeRow, { paddingLeft: node.depth * INDENT }]}>
            {/* Guide verticali per i livelli di annidamento */}
            {Array.from({ length: node.depth }).map((_, i) => (
              <View key={i} style={[styles.guide, { left: i * INDENT + 10 }]} />
            ))}
            {/* Connettore orizzontale verso la card (per i figli) */}
            {node.depth > 0 && (
              <View style={[styles.elbow, { left: (node.depth - 1) * INDENT + 10 }]} />
            )}

            <TouchableOpacity
              style={[
                styles.node,
                node.unlocked && { borderColor: rankColor, backgroundColor: `${rankColor}18` },
                canUnlock && styles.nodeCanUnlock,
                !node.unlocked && !canUnlock && styles.nodeLocked,
              ]}
              onPress={() => handleUnlock(node)}
              activeOpacity={node.unlocked ? 1 : 0.7}
            >
              {isUnlocking ? (
                <ActivityIndicator color={rankColor} size="small" />
              ) : (
                <>
                  <View style={styles.nodeHeader}>
                    <Text
                      style={[
                        styles.nodeType,
                        { color: node.type === 'passive' ? Colors.accent : Colors.warning },
                      ]}
                    >
                      {node.type === 'passive' ? '◈ PASSIVA' : '⚡ ATTIVA'}
                    </Text>
                    {node.unlocked ? (
                      <Text style={[styles.unlockCheck, { color: rankColor }]}>✓ SBLOCCATA</Text>
                    ) : (
                      <Text style={[styles.nodeLevel, canUnlock ? { color: Colors.accent } : {}]}>
                        Lv. {node.unlockLevel}
                      </Text>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.nodeName,
                      node.unlocked ? { color: rankColor } : !canUnlock ? { color: Colors.textMuted } : {},
                    ]}
                  >
                    {node.name}
                  </Text>
                  <Text style={styles.nodeDesc}>{node.description}</Text>
                  {statBonusText(node.statBonus) ? (
                    <Text style={[styles.nodeBonus, node.unlocked ? { color: rankColor } : {}]}>
                      {statBonusText(node.statBonus)}
                    </Text>
                  ) : null}
                </>
              )}
            </TouchableOpacity>
          </View>
        );
      })}

      {nodes.length === 0 && !loading && (
        <Text style={styles.loadingText}>Nessuna skill disponibile</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 60 },
  center: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 32,
  },
  loadingText: { color: Colors.textMuted, fontSize: 12, letterSpacing: 1, textAlign: 'center' },

  systemLabel: { color: Colors.textMuted, fontSize: 10, letterSpacing: 4, marginBottom: 4 },
  subtitle: { color: Colors.textSecondary, fontSize: 12, marginBottom: 24 },

  nodeRow: { position: 'relative', marginBottom: 12 },
  guide: {
    position: 'absolute',
    top: -12,
    bottom: 0,
    width: 1,
    backgroundColor: Colors.border,
  },
  elbow: {
    position: 'absolute',
    top: '50%',
    width: 12,
    height: 1,
    backgroundColor: Colors.border,
  },

  node: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    padding: 14,
    gap: 4,
  },
  nodeCanUnlock: { borderColor: Colors.accent, borderStyle: 'dashed' },
  nodeLocked: { opacity: 0.5 },

  nodeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  nodeType: { fontSize: 9, letterSpacing: 1, fontWeight: '700' },
  unlockCheck: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  nodeLevel: { color: Colors.textMuted, fontSize: 11, fontWeight: '700' },

  nodeName: { color: Colors.text, fontSize: 15, fontWeight: '700', lineHeight: 19 },
  nodeDesc: { color: Colors.textSecondary, fontSize: 12, lineHeight: 16 },
  nodeBonus: { color: Colors.accent, fontSize: 11, fontWeight: '700', marginTop: 2 },
});
