'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Loader2, Sparkles, Carrot } from 'lucide-react';

const MAX_INGREDIENTS = 25;
const MAX_INGREDIENT_LENGTH = 40;

const QUICK_SUGGESTIONS = [
  'Onion', 'Tomato', 'Ginger', 'Garlic', 'Potato', 'Paneer',
  'Chicken', 'Rice', 'Toor dal', 'Spinach',
];

const chipPop = {
  initial: { opacity: 0, scale: 0.7 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.7 },
  transition: { type: 'spring', stiffness: 480, damping: 24 },
};

export default function IngredientInput({
  ingredients,
  setIngredients,
  preferences,
  setPreferences,
  onSubmit,
  isLoading,
  includeNutrition,
  setIncludeNutrition,
}) {
  const [inputValue, setInputValue] = useState('');
  const [notice, setNotice] = useState('');

  const addFromText = (text) => {
    // Split on commas so "chicken, rice, tomatoes" becomes three chips at once.
    const parts = text
      .split(',')
      .map((s) => s.trim().replace(/\s+/g, ' ').slice(0, MAX_INGREDIENT_LENGTH))
      .filter(Boolean);

    if (parts.length === 0) return false;

    const existing = new Set(ingredients.map((i) => i.toLowerCase()));
    const next = [...ingredients];
    let skipped = 0;

    for (const part of parts) {
      if (next.length >= MAX_INGREDIENTS) { skipped++; continue; }
      const key = part.toLowerCase();
      if (existing.has(key)) { skipped++; continue; } // duplicate guard
      existing.add(key);
      next.push(part);
    }

    setIngredients(next);
    setNotice(
      skipped > 0
        ? skipped === 1
          ? 'Skipped 1 duplicate or over-limit ingredient.'
          : `Skipped ${skipped} duplicate or over-limit ingredients.`
        : ''
    );
    return true;
  };

  const handleAddIngredient = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      addFromText(inputValue);
      setInputValue('');
    }
  };

  const removeIngredient = (index) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handlePreferencesKeyDown = (e) => {
    // Ctrl/Cmd + Enter inside the preferences box triggers generation.
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !isLoading && ingredients.length > 0) {
      e.preventDefault();
      onSubmit();
    }
  };

  const canSubmit = ingredients.length > 0 && !isLoading;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-md mx-auto bg-white/85 dark:bg-gray-800/85 backdrop-blur-md p-6 rounded-3xl shadow-xl shadow-emerald-900/5 border border-emerald-900/10 dark:border-gray-700/80 transition-colors"
    >
      <h2 className="font-display text-2xl font-bold mb-1 text-gray-900 dark:text-white tracking-tight">
        What&apos;s in your kitchen?
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        Add ingredients — commas are fine. Ctrl + Enter to generate.
      </p>

      <form onSubmit={handleAddIngredient} className="flex gap-2 mb-3">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="e.g. Chicken, Rice, Tomatoes"
          disabled={isLoading}
          aria-label="Add ingredient"
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-60 transition"
        />
        <motion.button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          whileTap={{ scale: 0.9 }}
          aria-label="Add ingredient"
          className="bg-emerald-600 text-white p-2.5 rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md shadow-emerald-600/20"
        >
          <Plus size={22} />
        </motion.button>
      </form>

      {notice && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-2" role="status">
          {notice}
        </p>
      )}

      {ingredients.length === 0 ? (
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wide flex items-center gap-1">
            <Sparkles size={12} /> Quick add
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_SUGGESTIONS.map((suggestion, i) => (
              <motion.button
                key={suggestion}
                type="button"
                onClick={() => addFromText(suggestion)}
                disabled={isLoading}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.04, duration: 0.35 }}
                whileTap={{ scale: 0.92 }}
                className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors disabled:opacity-50"
              >
                + {suggestion}
              </motion.button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mb-5">
          <AnimatePresence mode="popLayout">
            {ingredients.map((ing, index) => (
              <motion.span
                key={`${ing}-${index}`}
                {...chipPop}
                layout
                className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5 shadow-sm"
              >
                <Carrot size={12} className="opacity-70" />
                {ing}
                <button
                  onClick={() => removeIngredient(index)}
                  disabled={isLoading}
                  aria-label={`Remove ${ing}`}
                  className="hover:text-emerald-600 dark:hover:text-emerald-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-full transition-colors disabled:opacity-50"
                >
                  <X size={14} />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
          <span className="text-xs text-gray-400 dark:text-gray-500 self-center ml-1">
            {ingredients.length}/{MAX_INGREDIENTS}
          </span>
        </div>
      )}

      <div className="mb-5">
        <label
          htmlFor="preferences"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Dietary Preferences / Restrictions{' '}
          <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <textarea
          id="preferences"
          value={preferences}
          onChange={(e) => setPreferences(e.target.value)}
          onKeyDown={handlePreferencesKeyDown}
          placeholder="e.g. Vegan, Gluten-free, Spicy, under 30 minutes, Jain…"
          disabled={isLoading}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-60 h-24 resize-none transition"
        />
      </div>

      <div className="mb-6 flex items-center gap-3">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={includeNutrition}
            onChange={(e) => setIncludeNutrition(e.target.checked)}
            disabled={isLoading}
            className="sr-only peer"
            aria-label="Include nutrition information"
          />
          <div className="w-9 h-5 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:dark:border-gray-500 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
        </label>
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Include nutrition info <span className="text-gray-400">(slightly slower)</span>
        </span>
      </div>

      <motion.button
        onClick={onSubmit}
        disabled={!canSubmit}
        whileHover={canSubmit ? { scale: 1.015 } : undefined}
        whileTap={canSubmit ? { scale: 0.98 } : undefined}
        className="w-full bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 text-white py-3.5 rounded-2xl font-bold text-lg shadow-xl shadow-emerald-600/30 hover:shadow-emerald-600/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-shadow flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin" size={20} /> Cooking up ideas…
          </>
        ) : (
          <>
            <Sparkles size={20} /> Generate 3 Recipes
          </>
        )}
      </motion.button>
    </motion.div>
  );
}
