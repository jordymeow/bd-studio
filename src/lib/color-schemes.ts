export interface ColorScheme {
  id: string;
  name: string;
  bg: string;
  surface: string;
  surfaceLight: string;
  border: string;
  text: string;
  textMuted: string;
  sidebar: string;
  sidebarHover: string;
  accent: string;
  accentHover: string;
}

export const COLOR_SCHEMES: ColorScheme[] = [
  {
    id: 'zinc',
    name: 'Zinc (default)',
    bg: '#0e0e0e', surface: '#1a1a1a', surfaceLight: '#242424', border: '#242424',
    text: '#fafafa', textMuted: '#737373',
    sidebar: '#141414', sidebarHover: '#1f1f1f',
    accent: '#4ade80', accentHover: '#86efac',
  },
  {
    id: 'slate',
    name: 'Slate',
    bg: '#0f172a', surface: '#1e293b', surfaceLight: '#334155', border: '#334155',
    text: '#f1f5f9', textMuted: '#94a3b8',
    sidebar: '#0c1424', sidebarHover: '#1e293b',
    accent: '#38bdf8', accentHover: '#7dd3fc',
  },
  {
    id: 'forest',
    name: 'Forest',
    bg: '#0a1612', surface: '#142420', surfaceLight: '#1e332d', border: '#1e332d',
    text: '#ecfdf5', textMuted: '#6ee7b7',
    sidebar: '#0a1612', sidebarHover: '#142420',
    accent: '#22c55e', accentHover: '#4ade80',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    bg: '#0a0a1a', surface: '#14142b', surfaceLight: '#1f1f3d', border: '#1f1f3d',
    text: '#e0e7ff', textMuted: '#818cf8',
    sidebar: '#0a0a1a', sidebarHover: '#14142b',
    accent: '#818cf8', accentHover: '#a5b4fc',
  },
  {
    id: 'crimson',
    name: 'Crimson',
    bg: '#0f0a0a', surface: '#1f1414', surfaceLight: '#2d1f1f', border: '#2d1f1f',
    text: '#fef2f2', textMuted: '#fca5a5',
    sidebar: '#0f0a0a', sidebarHover: '#1f1414',
    accent: '#f43f5e', accentHover: '#fb7185',
  },
  {
    id: 'amber',
    name: 'Amber',
    bg: '#0f0a05', surface: '#1f1810', surfaceLight: '#2d251a', border: '#2d251a',
    text: '#fef3c7', textMuted: '#fbbf24',
    sidebar: '#0f0a05', sidebarHover: '#1f1810',
    accent: '#f59e0b', accentHover: '#fbbf24',
  },
  {
    id: 'plum',
    name: 'Plum',
    bg: '#100a14', surface: '#1f1428', surfaceLight: '#2d1f3b', border: '#2d1f3b',
    text: '#faf5ff', textMuted: '#c084fc',
    sidebar: '#100a14', sidebarHover: '#1f1428',
    accent: '#a855f7', accentHover: '#c084fc',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    bg: '#06141d', surface: '#0d2430', surfaceLight: '#143448', border: '#143448',
    text: '#ecfeff', textMuted: '#67e8f9',
    sidebar: '#06141d', sidebarHover: '#0d2430',
    accent: '#06b6d4', accentHover: '#22d3ee',
  },
  {
    id: 'rose',
    name: 'Rose',
    bg: '#140a0e', surface: '#241420', surfaceLight: '#3b1f30', border: '#3b1f30',
    text: '#fff1f2', textMuted: '#fda4af',
    sidebar: '#140a0e', sidebarHover: '#241420',
    accent: '#ec4899', accentHover: '#f472b6',
  },
  {
    id: 'mono',
    name: 'Mono',
    bg: '#000000', surface: '#0e0e0e', surfaceLight: '#1a1a1a', border: '#222222',
    text: '#ffffff', textMuted: '#888888',
    sidebar: '#000000', sidebarHover: '#0e0e0e',
    accent: '#ffffff', accentHover: '#e5e5e5',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    bg: '#140a05', surface: '#241408', surfaceLight: '#3b2010', border: '#3b2010',
    text: '#fff7ed', textMuted: '#fdba74',
    sidebar: '#140a05', sidebarHover: '#241408',
    accent: '#f97316', accentHover: '#fb923c',
  },
  {
    id: 'teal',
    name: 'Teal',
    bg: '#06120f', surface: '#0a1f1a', surfaceLight: '#103027', border: '#103027',
    text: '#f0fdfa', textMuted: '#5eead4',
    sidebar: '#06120f', sidebarHover: '#0a1f1a',
    accent: '#14b8a6', accentHover: '#2dd4bf',
  },
  {
    id: 'lavender',
    name: 'Lavender',
    bg: '#0c0a14', surface: '#181428', surfaceLight: '#241f3d', border: '#241f3d',
    text: '#f3f0ff', textMuted: '#a78bfa',
    sidebar: '#0c0a14', sidebarHover: '#181428',
    accent: '#8b5cf6', accentHover: '#a78bfa',
  },
  {
    id: 'mint',
    name: 'Mint',
    bg: '#06120e', surface: '#0a1f17', surfaceLight: '#103024', border: '#103024',
    text: '#f0fdf4', textMuted: '#6ee7b7',
    sidebar: '#06120e', sidebarHover: '#0a1f17',
    accent: '#10b981', accentHover: '#34d399',
  },
  {
    id: 'coffee',
    name: 'Coffee',
    bg: '#100a08', surface: '#1c1410', surfaceLight: '#2c211a', border: '#2c211a',
    text: '#fdf5e8', textMuted: '#d4a574',
    sidebar: '#100a08', sidebarHover: '#1c1410',
    accent: '#d97706', accentHover: '#f59e0b',
  },
  {
    id: 'cyber',
    name: 'Cyber',
    bg: '#0a0a14', surface: '#14142d', surfaceLight: '#1f1f48', border: '#1f1f48',
    text: '#e0fffe', textMuted: '#67e8f9',
    sidebar: '#0a0a14', sidebarHover: '#14142d',
    accent: '#06b6d4', accentHover: '#67e8f9',
  },
];

export function getColorScheme(id: string | undefined): ColorScheme {
  return COLOR_SCHEMES.find(s => s.id === id) ?? COLOR_SCHEMES[0];
}

export function colorSchemeToCssVars(scheme: ColorScheme): string {
  return [
    `--color-bg: ${scheme.bg}`,
    `--color-surface: ${scheme.surface}`,
    `--color-surface-light: ${scheme.surfaceLight}`,
    `--color-border: ${scheme.border}`,
    `--color-text: ${scheme.text}`,
    `--color-text-muted: ${scheme.textMuted}`,
    `--color-sidebar: ${scheme.sidebar}`,
    `--color-sidebar-hover: ${scheme.sidebarHover}`,
    `--color-accent: ${scheme.accent}`,
    `--color-accent-hover: ${scheme.accentHover}`,
  ].join(';');
}
