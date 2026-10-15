import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ThemePreset {
  id: string;
  name: string;
  primary: string;
  primaryStrong: string;
  accent: string;
  gold: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'salvatoriano',
    name: '🌿 Verde Salvatoriano (Oficial)',
    primary: '#0C5528',
    primaryStrong: '#072e19',
    accent: '#DF5C12',
    gold: '#FFD23F',
  },
  {
    id: 'azul_marino',
    name: '🏛️ Azul Marino Académico',
    primary: '#0f3b6d',
    primaryStrong: '#092240',
    accent: '#d4af37',
    gold: '#fbbf24',
  },
  {
    id: 'borgona',
    name: '🍷 Borgoña Institucional',
    primary: '#881337',
    primaryStrong: '#4c0519',
    accent: '#f59e0b',
    gold: '#facc15',
  },
  {
    id: 'grafito',
    name: '🖤 Grafito Ejecutivo',
    primary: '#1e293b',
    primaryStrong: '#0f172a',
    accent: '#0284c7',
    gold: '#38bdf8',
  },
  {
    id: 'esmeralda',
    name: '🌲 Verde Esmeralda',
    primary: '#065f46',
    primaryStrong: '#022c22',
    accent: '#ea580c',
    gold: '#f59e0b',
  },
  {
    id: 'purpura',
    name: '🟣 Púrpura Universitario',
    primary: '#581c87',
    primaryStrong: '#3b0764',
    accent: '#f59e0b',
    gold: '#facc15',
  },
];

interface ThemeContextType {
  currentTheme: ThemePreset;
  presets: ThemePreset[];
  setThemeById: (id: string) => void;
  setCustomColors: (primary: string, accent: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemePreset>(() => {
    try {
      const saved = localStorage.getItem('constancia_theme_settings');
      return saved ? JSON.parse(saved) : THEME_PRESETS[0];
    } catch {
      return THEME_PRESETS[0];
    }
  });

  useEffect(() => {
    // Apply CSS variables to root
    document.documentElement.style.setProperty('--primary', currentTheme.primary);
    document.documentElement.style.setProperty('--primary-strong', currentTheme.primaryStrong);
    document.documentElement.style.setProperty('--accent', currentTheme.accent);
    document.documentElement.style.setProperty('--gold', currentTheme.gold);

    try {
      localStorage.setItem('constancia_theme_settings', JSON.stringify(currentTheme));
    } catch {}
  }, [currentTheme]);

  const setThemeById = (id: string) => {
    const preset = THEME_PRESETS.find(p => p.id === id);
    if (preset) {
      setCurrentTheme(preset);
    }
  };

  const setCustomColors = (primary: string, accent: string) => {
    const custom: ThemePreset = {
      id: 'custom',
      name: '🎨 Color Personalizado del Jurado',
      primary,
      primaryStrong: primary,
      accent,
      gold: '#FFD23F',
    };
    setCurrentTheme(custom);
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, presets: THEME_PRESETS, setThemeById, setCustomColors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
