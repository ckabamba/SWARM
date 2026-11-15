// WarmPath Visual & Design Tokens ported from DESIGN.md and prototypes/thermal/index.html

export const THEME = {
  colors: {
    void: '#06040b',
    panel: 'rgba(9, 6, 15, 0.84)',
    panelSolid: '#0c0814',
    ash: '#8f8798',
    bone: '#f4eee6',
    ember: '#ff6a1f',
    gold: '#eaaa00', // Georgia Tech Buzz Gold
    goldDeep: '#8f5c00',
    glow: '#ffe9a8', // Hottest state
    glowHover: '#fff5d3',
    tie: '#f6cfa6', // Shared alumni connection highlight text
    line: 'rgba(244, 238, 230, 0.16)',
    surface: 'rgba(244, 238, 230, 0.04)',
    surfaceSubtle: 'rgba(244, 238, 230, 0.08)',
    fogOrange: '#ff8a2a',
    fogAmber: '#ee9b00',
    fogNavy: '#050c1c',
  },
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
