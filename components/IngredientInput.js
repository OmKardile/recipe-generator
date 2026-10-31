"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, Loader2, Sparkles } from 'lucide-react';

const MAX_INGREDIENTS = 25;
const MAX_INGREDIENT_LENGTH = 40;

const QUICK_SUGGESTIONS = [
  'Onion', 'Tomato', 'Ginger', 'Garlic', 'Potato', 'Paneer',
  'Chicken', 'Rice', 'Toor dal', 'Spinach',
];

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
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut', delay: 0.05 }}
      className="w-full max-w-md mx-auto bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 transition-colors"
    >
      <h2 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">
        What&apos;s in your kitchen?
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
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
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-60 transition"
        />
        <motion.button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          whileTap={{ scale: 0.92 }}
          aria-label="Add ingredient"
          className="bg-emerald-600 text-white p-2.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
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
            {QUICK_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addFromText(suggestion)}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors disabled:opacity-50"
              >
                + {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mb-5">
          {ingredients.map((ing, index) => (
            <span
              key={`${ing}-${index}`}
              className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5"
            >
              {ing}
              <button
                onClick={() => removeIngredient(index)}
                disabled={isLoading}
                aria-label={`Remove ${ing}`}
                className="hover:text-emerald-600 dark:hover:text-emerald-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-full transition-colors disabled:opacity-50"
              >
                <X size={14} />
              </button>
            </span>
          ))}
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
          Dietary Preferences / Restrictions <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <textarea
          id="preferences"
          value={preferences}
          onChange={(e) => setPreferences(e.target.value)}
          onKeyDown={handlePreferencesKeyDown}
          placeholder="e.g. Vegan, Gluten-free, Spicy, under 30 minutes, Jain…"
          disabled={isLoading}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-60 h-24 resize-none transition"
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
        whileTap={{ scale: 0.98 }}
        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3.5 rounded-xl font-bold text-lg shadow-lg shadow-emerald-600/30 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition flex items-center justify-center gap-2"
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
