'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Users, RotateCcw } from 'lucide-react';

export default function ServingAdjuster({ servings, baseServings = 4, onServingsChange }) {
  const isModified = servings !== baseServings;

  return (
    <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-full px-3 py-1.5 ring-1 ring-emerald-600/10 dark:ring-emerald-400/10">
      <Users size={14} className="text-emerald-600 dark:text-emerald-400" />
      <span className="text-xs font-medium text-emerald-700/70 dark:text-emerald-300/70 hidden sm:inline">
        Servings
      </span>
      <button
        onClick={() => onServingsChange(Math.max(1, servings - 1))}
        disabled={servings <= 1}
        aria-label="Decrease servings"
        className="p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-800/60 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Minus size={13} className="text-emerald-700 dark:text-emerald-300" />
      </button>
      <span
        className="relative font-bold text-emerald-800 dark:text-emerald-200 w-6 text-center tabular-nums overflow-hidden"
        aria-live="polite"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={servings}
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -14, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="inline-block"
          >
            {servings}
          </motion.span>
        </AnimatePresence>
      </span>
      <button
        onClick={() => onServingsChange(Math.min(24, servings + 1))}
        disabled={servings >= 24}
        aria-label="Increase servings"
        className="p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-800/60 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Plus size={13} className="text-emerald-700 dark:text-emerald-300" />
      </button>
      {isModified && (
        <button
          onClick={() => onServingsChange(baseServings)}
          title={`Reset to base ${baseServings} servings`}
          aria-label={`Reset to ${baseServings} servings`}
          className="p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-800/60 rounded-full transition-colors text-emerald-600 dark:text-emerald-400"
        >
          <RotateCcw size={13} />
        </button>
      )}
    </div>
  );
}
