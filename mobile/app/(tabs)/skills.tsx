import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import Svg, { Line as SvgLine } from 'react-native-svg';
import { useSkillStore, Skill } from '../../stores/skillStore';
import { useCharacterStore } from '../../stores/characterStore';
import { Colors, RankColors } from '../../constants/theme';

const SCREEN_W = Dimensions.get('window').width;
const NODE_W = (SCREEN_W - 48 - 12) / 2;
const NODE_H = 110;
const COL_GAP = 12;
const ROW_GAP = 44;

type SkillNode = Skill & { depth: number; col: number };

function buildLayout(skills: Skill[]): SkillNode[] {
  const idToSkill = new Map(skills.map((s) => [s.id, s]));
  const roots = skills.filter((s) => !s.parentSkillId);
  const result: SkillNode[] = [];

  function place(skill: Skill, depth: number, col: number) {
    result.push({ ...skill, depth, col });
    const children = skills.filter((s) => s.parentSkillId === skill.id);
    children.forEach((child, i) => place(child, depth + 1, i));
  }

  roots.forEach((root, i) => place(root, 0, i));
  return result;
}

function groupByDepth(nodes: SkillNode[]): SkillNode[][] {
  const map = new Map<number, SkillNode[]>();
  for (const n of nodes) {
    if (!map.has(n.depth)) map.set(n.depth, []);
    map.get(n.depth)!.push(n);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a - b).map(([, v]) => v);
}

function statBonusText(bonus: Record<string, number>) {
  return Object.entries(bonus)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k.toUpperCase()} +${v}`)
    .join(' · ') || '';
}

export default function SkillsScreen() {
  const { skills, loading, unlocking, fetch, unlock } = useSkillStore();
  const { character } = useCharacterStore();
  const rankColor = RankColors[character?.rank ?? 'E'] ?? Colors.accent;

  useEffect(() => { fetch(); }, []);

  const nodes = buildLayout(skills);
  const rows = groupByDepth(nodes);

  // Per calcolare le posizioni dei nodi per le linee SVG
  const nodePositions = new Map<string, { x: number; y: number }>();
  let currentY = 0;
  for (const row of rows) {
    row.forEach((node, idx) => {
      const x = 24 + idx * (NODE_W + COL_GAP) + NODE_W / 2;
      nodePositions.set(node.id, { x, y: currentY + NODE_H / 2 });
    });
    currentY += NODE_H + ROW_GAP;
  }
  const totalH = currentY;

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
      `Vuoi sbloccare "${skill.name}"?${skill.type === 'passive' && Object.keys(skill.statBonus).length > 0 ? `\n\nBonus: ${statBonusText(skill.statBonus)}` : ''}`,
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

      <View style={{ height: totalH, position: 'relative' }}>
        {/* Linee SVG connettori */}
        <Svg style={StyleSheet.absoluteFill} width={SCREEN_W} height={totalH}>
          {nodes.map((node) => {
            if (!node.parentSkillId) return null;
            const from = nodePositions.get(node.parentSkillId);
            const to = nodePositions.get(node.id);
            if (!from || !to) return null;
            return (
              <SvgLine
                key={`line-${node.id}`}
                x1={from.x} y1={from.y + NODE_H / 2}
                x2={to.x} y2={to.y - NODE_H / 2}
                stroke={node.unlocked ? rankColor : Colors.border}
                strokeWidth="2"
                strokeDasharray={node.unlocked ? undefined : '4,4'}
              />
            );
          })}
        </Svg>

        {/* Nodi skill per riga */}
        {rows.map((row, rowIdx) => {
          let rowTop = 0;
          for (let i = 0; i < rowIdx; i++) rowTop += NODE_H + ROW_GAP;
          return (
            <View key={rowIdx} style={[styles.row, { top: rowTop }]}>
              {row.map((node) => {
                const canUnlock = !node.unlocked && !!character && character.level >= node.unlockLevel &&
                  (!node.parentSkillId || skills.find((s) => s.id === node.parentSkillId)?.unlocked);
                const isUnlocking = unlocking === node.id;

                return (
                  <TouchableOpacity
                    key={node.id}
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
                        <View style={styles.nodeTop}>
                          <Text style={[styles.nodeType, { color: node.type === 'passive' ? Colors.accent : Colors.warning }]}>
                            {node.type === 'passive' ? '◈ PASSIVA' : '⚡ ATTIVA'}
                          </Text>
                          {node.unlocked && <Text style={[styles.unlockCheck, { color: rankColor }]}>✓</Text>}
                        </View>
                        <Text style={[styles.nodeName, node.unlocked ? { color: rankColor } : !canUnlock ? { color: Colors.textMuted } : {}]} numberOfLines={2}>
                          {node.name}
                        </Text>
                        <Text style={styles.nodeDesc} numberOfLines={2}>{node.description}</Text>
                        {statBonusText(node.statBonus) ? (
                          <Text style={[styles.nodeBonus, node.unlocked ? { color: rankColor } : {}]}>
                            {statBonusText(node.statBonus)}
                          </Text>
                        ) : null}
                        {!node.unlocked && (
                          <Text style={[styles.nodeLevel, canUnlock ? { color: Colors.accent } : {}]}>
                            Lv. {node.unlockLevel}
                          </Text>
                        )}
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 60 },
  center: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  loadingText: { color: Colors.textMuted, fontSize: 12, letterSpacing: 1, textAlign: 'center' },

  systemLabel: { color: Colors.textMuted, fontSize: 10, letterSpacing: 4, marginBottom: 4 },
  subtitle: { color: Colors.textSecondary, fontSize: 12, marginBottom: 28 },

  row: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', gap: COL_GAP, paddingHorizontal: 0 },

  node: {
    width: NODE_W, height: NODE_H,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, backgroundColor: Colors.surface,
    padding: 10, justifyContent: 'space-between',
  },
  nodeCanUnlock: { borderColor: Colors.accent, borderStyle: 'dashed' },
  nodeLocked: { opacity: 0.5 },

  nodeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nodeType: { fontSize: 8, letterSpacing: 1, fontWeight: '700' },
  unlockCheck: { fontSize: 12, fontWeight: '800' },

  nodeName: { color: Colors.text, fontSize: 12, fontWeight: '700', lineHeight: 16 },
  nodeDesc: { color: Colors.textMuted, fontSize: 9, lineHeight: 13, flex: 1 },
  nodeBonus: { color: Colors.accent, fontSize: 9, fontWeight: '700' },
  nodeLevel: { color: Colors.textMuted, fontSize: 10, fontWeight: '700', textAlign: 'right' },
});
