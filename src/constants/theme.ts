import React, { createContext, useContext, useEffect, useState } from 'react';
import { initDB, getDB } from '../db';

export type AccentKey = 'amber' | 'coral' | 'blue';

const DARK = {
  bg: '#0E0E12',
  bg2: '#17171C',
  bg3: '#1F1F26',
  bg4: '#27272E',
  bg5: '#313138',
  border: 'rgba(255,255,255,0.07)',
  border2: 'rgba(255,255,255,0.13)',
  text1: '#EEECEA',
  text2: 'rgba(238,236,234,0.56)',
  text3: 'rgba(238,236,234,0.33)',
  text4: 'rgba(238,236,234,0.17)',
};

const LIGHT = {
  bg: '#F3F2EF',
  bg2: '#FFFFFF',
  bg3: '#EBEBEA',
  bg4: '#E2E1DE',
  bg5: '#D5D4D0',
  border: 'rgba(0,0,0,0.07)',
  border2: 'rgba(0,0,0,0.13)',
  text1: '#1A1A1F',
  text2: 'rgba(26,26,31,0.56)',
  text3: 'rgba(26,26,31,0.34)',
  text4: 'rgba(26,26,31,0.18)',
};

const ACCENTS: Record<AccentKey, { accent: string; accentA: string; accentB: string }> = {
  amber: { accent: '#D4920A', accentA: 'rgba(212,146,10,0.18)', accentB: 'rgba(212,146,10,0.10)' },
  coral: { accent: '#D95240', accentA: 'rgba(217,82,64,0.18)', accentB: 'rgba(217,82,64,0.10)' },
  blue:  { accent: '#3B82F6', accentA: 'rgba(59,130,246,0.18)',  accentB: 'rgba(59,130,246,0.10)' },
};

export const SEMANTIC = {
  green: '#4EAD6B',
  greenA: 'rgba(78,173,107,0.15)',
};

export const MACRO_COLORS = {
  protein: '#7B7CE8',
  carbs: '#3CBFC3',
  fat: '#C0B030',
};

export const RADII = {
  r1: 8,
  r2: 14,
  r3: 20,
  r4: 28,
};

export type Theme = typeof DARK & typeof ACCENTS['amber'] & typeof SEMANTIC & {
  isDark: boolean;
  accentKey: AccentKey;
};

function buildTheme(isDark: boolean, accentKey: AccentKey): Theme {
  return {
    ...(isDark ? DARK : LIGHT),
    ...ACCENTS[accentKey],
    ...SEMANTIC,
    isDark,
    accentKey,
  };
}

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  setIsDark: (v: boolean) => void;
  accent: AccentKey;
  setAccent: (v: AccentKey) => void;
  loaded: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  const [accent, setAccent] = useState<AccentKey>('blue');
  const [loaded, setLoaded] = useState(false);

  // Load persisted theme from SQLite on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        await initDB();
        const db = getDB();
        const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
        const map: Record<string, string> = {};
        for (const row of rows) map[row.key] = row.value;
        if (!cancelled) {
          if (map.isDark === '0' || map.isDark === 'false') setIsDark(false);
          else if (map.isDark === '1' || map.isDark === 'true') setIsDark(true);
          if (map.accent && map.accent in ACCENTS) setAccent(map.accent as AccentKey);
        }
      } catch (err) {
        console.error('[ThemeProvider] load settings error', err);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const theme = buildTheme(isDark, accent);

  const wrappedSetIsDark = (v: boolean) => {
    setIsDark(v);
    saveSetting('isDark', String(v));
  };

  const wrappedSetAccent = (v: AccentKey) => {
    setAccent(v);
    saveSetting('accent', v);
  };

  return React.createElement(ThemeContext.Provider, {
    value: { theme, isDark, setIsDark: wrappedSetIsDark, accent, setAccent: wrappedSetAccent, loaded },
    children,
  });
}

async function saveSetting(key: string, value: string): Promise<void> {
  try {
    await initDB();
    await getDB().runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, value]
    );
  } catch (err) {
    console.error('[ThemeProvider] save setting error', err);
  }
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
