'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('system');
  const [resolvedTheme, setResolvedTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const settings = await res.json();
        if (settings.theme) setThemeState(settings.theme);
      }
    } catch {
      // Fallback to localStorage
      const saved = localStorage.getItem('recipe-generator-theme');
      if (saved) setThemeState(saved);
    }
  };

  const setTheme = async (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('recipe-generator-theme', newTheme);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme }),
      });
    } catch {
      // Silently fail
    }
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const getResolved = () => {
      if (theme === 'system') return mediaQuery.matches ? 'dark' : 'light';
      return theme;
    };

    setResolvedTheme(getResolved());

    const handler = (e) => {
      if (theme === 'system') setResolvedTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme]);

  useEffect(() => {
    if (mounted) {
      document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
    }
  }, [resolvedTheme, mounted]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
