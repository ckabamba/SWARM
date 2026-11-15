import { getThemeMode } from './tokens';

const THEME_COLOR_PROPERTIES = new Set([
  'backgroundColor',
  'borderColor',
  'borderTopColor',
  'borderBottomColor',
  'borderLeftColor',
  'borderRightColor',
  'color',
  'shadowColor',
  'textShadowColor',
  'tintColor',
]);

function lightColor(value: string): string {
  const rgba = value.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,?\s*([\d.]+)?\s*\)$/i,
  );
  if (rgba) {
    const [, red, green, blue, alpha = '1'] = rgba;
    const rgb = `${red}, ${green}, ${blue}`;
    if (rgb === '244, 238, 230') return `rgba(11, 31, 69, ${alpha})`;
    if (rgb === '143, 135, 152') return `rgba(85, 98, 127, ${alpha})`;
    if (rgb === '246, 207, 166') return `rgba(138, 74, 0, ${alpha})`;
    if (rgb === '255, 233, 168') return `rgba(143, 92, 0, ${alpha})`;
    if (rgb === '255, 106, 31') return `rgba(194, 65, 12, ${alpha})`;
    if (rgb === '6, 4, 11') return `rgba(245, 247, 251, ${alpha})`;
    if (rgb === '9, 6, 15' || rgb === '12, 8, 20') {
      return `rgba(255, 255, 255, ${alpha})`;
    }
    return value;
  }

  switch (value.toLowerCase()) {
    case '#06040b': return '#f5f7fb';
    case '#0c0814': return '#ffffff';
    case '#f4eee6': return '#0b1f45';
    case '#8f8798': return '#55627f';
    case '#ff6a1f': return '#c2410c';
    case '#8f5c00': return '#8f5c00';
    case '#ffe9a8': return '#8f5c00';
    case '#fff5d3': return '#f7bd2a';
    case '#f6cfa6': return '#8a4a00';
    default: return value;
  }
}

function lightStyle<T extends object>(style: T): T {
  const result = { ...style };
  for (const [property, value] of Object.entries(style)) {
    if (THEME_COLOR_PROPERTIES.has(property) && typeof value === 'string') {
      (result as Record<string, unknown>)[property] = lightColor(value);
    }
  }
  return result;
}

export function createThemedStyles<T extends object>(styles: T): T {
  return new Proxy(styles, {
    get(target, property, receiver) {
      const style = Reflect.get(target, property, receiver);
      if (getThemeMode() !== 'light' || !style || typeof style !== 'object') {
        return style;
      }
      return lightStyle(style);
    },
  });
}
