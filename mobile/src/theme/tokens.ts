// WarmPath Visual & Design Tokens ported from DESIGN.md and prototypes/thermal/index.html

export type ThemeMode = 'dark' | 'light';

let activeThemeMode: ThemeMode = 'dark';

export function getThemeMode(): ThemeMode {
  return activeThemeMode;
}

export function setThemeMode(mode: ThemeMode) {
  activeThemeMode = mode;
}

const darkColors = {
  void: '#06040b',
  panel: 'rgba(9, 6, 15, 0.84)',
  panelSolid: '#0c0814',
  ash: '#8f8798',
  bone: '#f4eee6',
  ember: '#ff6a1f',
  gold: '#eaaa00',
  goldDeep: '#8f5c00',
  glow: '#ffe9a8',
  glowHover: '#fff5d3',
  tie: '#f6cfa6',
  line: 'rgba(244, 238, 230, 0.16)',
  surface: 'rgba(244, 238, 230, 0.04)',
  surfaceSubtle: 'rgba(244, 238, 230, 0.08)',
  fogOrange: '#ff8a2a',
  fogAmber: '#ee9b00',
  fogNavy: '#050c1c',
};

const lightColors: typeof darkColors = {
  void: '#f5f7fb',
  panel: 'rgba(255, 255, 255, 0.9)',
  panelSolid: '#ffffff',
  ash: '#55627f',
  bone: '#0b1f45',
  ember: '#c2410c',
  gold: '#eaaa00',
  goldDeep: '#8f5c00',
  glow: '#8f5c00',
  glowHover: '#f7bd2a',
  tie: '#8a4a00',
  line: 'rgba(11, 31, 69, 0.16)',
  surface: 'rgba(11, 31, 69, 0.04)',
  surfaceSubtle: 'rgba(11, 31, 69, 0.08)',
  fogOrange: '#f1b06a',
  fogAmber: '#f7d889',
  fogNavy: '#e6edf8',
};

const colors = new Proxy(darkColors, {
  get(target, key: keyof typeof darkColors) {
    return activeThemeMode === 'light' ? lightColors[key] : target[key];
  },
});

export const THEME = {
  colors,
  typography: {
    display: {
      fontSize: 26,
      fontWeight: '300' as const,
      letterSpacing: -0.5,
      color: '#f4eee6',
    },
    headline: {
      fontSize: 20,
      fontWeight: '400' as const,
      letterSpacing: -0.3,
      color: '#f4eee6',
    },
    title: {
      fontSize: 16,
      fontWeight: '500' as const,
      letterSpacing: -0.1,
      color: '#f4eee6',
    },
    body: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
      color: '#f4eee6',
    },
    bodyAsh: {
      fontSize: 13,
      fontWeight: '400' as const,
      lineHeight: 18,
      color: '#8f8798',
    },
    cap: {
      fontSize: 10.5,
      fontWeight: '500' as const,
      letterSpacing: 1.8,
      textTransform: 'uppercase' as const,
      color: '#8f8798',
    },
  },
  rounded: {
    pill: 999,
    field: 12,
    message: 14,
    card: 16,
  },
  spacing: {
    hair: 8,
    row: 18,
    panel: 24,
    gutter: 20,
  },
};
