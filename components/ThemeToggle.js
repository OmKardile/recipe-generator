'use client';

import { motion } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ];

  return (
    <div className="flex items-center gap-1 bg-emerald-100/70 dark:bg-gray-800/70 rounded-full p-1 ring-1 ring-emerald-600/10 dark:ring-gray-700 backdrop-blur-sm">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          title={label}
          aria-label={`${label} theme`}
          aria-pressed={theme === value}
          className={`relative p-2 rounded-full transition-colors ${
            theme === value
              ? 'text-white'
              : 'text-gray-500 dark:text-gray-400 hover:text-emerald-700 dark:hover:text-emerald-300'
          }`}
        >
          {theme === value && (
            <motion.span
              layoutId="theme-pill"
              className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-600/25"
              transition={{ type: 'spring', bounce: 0.28, duration: 0.55 }}
            />
          )}
          <Icon size={16} className="relative z-10" />
        </button>
      ))}
    </div>
  );
}
