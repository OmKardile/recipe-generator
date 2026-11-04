'use client';

import { useState } from 'react';
import { Minus, Plus, Users, RotateCcw } from 'lucide-react';

/**
 * Serving scaler — stepper + quick presets (1 / 2 / 4 / 6) + custom quantity.
 * All changes flow through onServingsChange; the recipe display scales every
 * ingredient amount from the recipe's base servings.
 */
export default function ServingAdjuster({ servings, baseServings = 4, onServingsChange }) {
  const isModified = servings !== baseServings;
  const [customDraft, setCustomDraft] = useState('');

  const applyCustom = () => {
    const n = parseInt(customDraft, 10);
    if (Number.isFinite(n) && n >= 1 && n <= 24 && n !== servings) {
      onServingsChange(n);
    }
    setCustomDraft('');
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
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

      <div className="flex items-center gap-1" role="group" aria-label="Serving presets">
        {[1, 2, 4, 6].map((n) => (
          <button
            key={n}
            onClick={() => onServingsChange(n)}
            aria-pressed={servings === n}
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums transition-colors ${
              servings === n
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-emerald-50 dark:hover:bg-gray-600 hover:text-emerald-600 dark:hover:text-emerald-400'
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
        <span className="hidden sm:inline">custom</span>
        <input
          type="number"
          min="1"
          max="24"
          value={customDraft}
          onChange={(e) => setCustomDraft(e.target.value)}
          onBlur={applyCustom}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              applyCustom();
            }
          }}
          aria-label="Custom servings (1 to 24)"
          placeholder="×"
          className="w-14 px-2 py-0.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 text-[11px] tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </label>
    </div>
  );
}
