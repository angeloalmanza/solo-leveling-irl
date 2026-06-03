export const Colors = {
  background: '#0a0a1a',
  surface: '#0f0f2a',
  surfaceElevated: '#141430',
  accent: '#00d4ff',
  accentDim: '#0099bb',
  text: '#e0f7ff',
  textSecondary: '#7ab8cc',
  textMuted: '#3a6070',
  border: '#1a2a40',
  success: '#00ff88',
  warning: '#ffaa00',
  error: '#ff4444',
} as const;

export const RankColors: Record<string, string> = {
  E: '#888888',
  D: '#44bb44',
  C: '#4488ff',
  B: '#aa44ff',
  A: '#ff8800',
  S: '#ffd700',
};

export const Fonts = {
  regular: 'Orbitron_400Regular',
  bold: 'Orbitron_700Bold',
  extraBold: 'Orbitron_800ExtraBold',
} as const;
