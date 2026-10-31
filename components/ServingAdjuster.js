'use client';

import { Minus, Plus, Users, RotateCcw } from 'lucide-react';

export default function ServingAdjuster({ servings, baseServings = 4, onServingsChange }) {
  const isModified = servings !== baseServings;

  return (
    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1.5">
      <Users size={14} className="text-gray-500 dark:text-gray-400" />
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 hidden sm:inline">
        Servings
      </span>
      <button
        onClick={() => onServingsChange(Math.max(1, servings - 1))}
        disabled={servings <= 1}
        aria-label="Decrease servings"
        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Minus size={13} className="text-gray-600 dark:text-gray-300" />
      </button>
      <span
        className="font-bold text-gray-800 dark:text-gray-100 w-6 text-center tabular-nums"
        aria-live="polite"
      >
        {servings}
      </span>
      <button
        onClick={() => onServingsChange(Math.min(24, servings + 1))}
        disabled={servings >= 24}
        aria-label="Increase servings"
        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Plus size={13} className="text-gray-600 dark:text-gray-300" />
      </button>
      {isModified && (
        <button
          onClick={() => onServingsChange(baseServings)}
          title={`Reset to base ${baseServings} servings`}
          aria-label={`Reset to ${baseServings} servings`}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors text-emerald-600 dark:text-emerald-400"
        >
          <RotateCcw size={13} />
        </button>
      )}
    </div>
  );
}
