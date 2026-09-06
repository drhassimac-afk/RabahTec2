const palettes = {
  dark: {
    bg: '#080C16',
    card: '#101827',
    cardAlt: '#141E33',
    text: '#FFFFFF',
    textDim: '#8A93A6',
    border: '#1C2740',
  },
  light: {
    bg: '#EEF2F9',
    card: '#FFFFFF',
    cardAlt: '#F1F4FA',
    text: '#0B1220',
    textDim: '#5B6478',
    border: '#DDE3EF',
  },
};

export const accents = {
  blue: {
    primary: '#3B82F6',
    purple: '#8B5CF6',
    cyan: '#22D3EE',
  },
  violet: {
    primary: '#8B5CF6',
    purple: '#EC4899',
    cyan: '#22D3EE',
  },
  green: {
    primary: '#10B981',
    purple: '#3B82F6',
    cyan: '#22D3EE',
  },
  orange: {
    primary: '#F59E0B',
    purple: '#EF4444',
    cyan: '#3B82F6',
  },
  pink: {
    primary: '#EC4899',
    purple: '#8B5CF6',
    cyan: '#22D3EE',
  },
};

export const colors = {
  ...palettes.dark,
  ...accents.blue,
  success: '#10B981',
};

export function applyTheme(mode = 'dark', accent = 'blue') {
  Object.assign(
    colors,
    palettes[mode] || palettes.dark,
    accents[accent] || accents.blue
  );
}
