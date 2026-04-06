import { useState, useEffect, useCallback } from 'react';
import { PaletteMode } from '@mui/material';

const STORAGE_KEY = 'ai-note-theme-mode';

export const useTheme = () => {
  const [mode, setMode] = useState<PaletteMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const toggleTheme = useCallback(() => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const setTheme = useCallback((newMode: PaletteMode) => {
    setMode(newMode);
  }, []);

  return { mode, toggleTheme, setTheme };
};
