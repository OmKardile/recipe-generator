'use client';

import { motion } from 'framer-motion';
import { ArrowLeftRight, Sparkles, X, Check, ChefHat, AlertTriangle } from 'lucide-react';
import { formatAmount } from '@/lib/recipeUtils';

/**
 * Substitution picker — curated + AI-suggested swaps for one ingredient.
 * Every option shows the quantity adjustment and the four honest notes
 * (taste / texture / nutrition / cooking); AI options are labelled as such.
 */
export default function SubstitutionPanel({
  ingredient, // { name, amount, unit } (base recipe quantities)
  options,
  loading,
  aiError,
  aiLoaded,
  askingAi,
  onApply,
  onAskAi,
  onClose,
}) {
  if (!ingredient) return null;

  const previewAmount = (ratio) =>
    typeof ingredient.amount === 'number' && ingredient.amount > 0
      ? `${formatAmount(Math.round(ingredient.amount * ratio * 100) / 100)}${ingredient.unit ? ` ${ingredient.unit}` : ''}`
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="mb-6 bg-emerald-50/60 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4"
      role="dialog"
      aria-label={`Substitutions for ${ingredient.name}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="bg-gradient-to-br from-emerald-500 to-teal-600 p-1.5 rounded-lg text-white shrink-0">
            <ArrowLeftRight size={14} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              Swap {ingredient.name}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Quantities adjust automatically · swaps are never nutritionally identical
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close substitutions"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-gray-700/60 transition-colors shrink-0"
        >
          <X size={15} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-2" role="status" aria-label="Loading substitutions">
          {[0, 1].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-white dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : options.length === 0 ? (
        <div className="text-sm text-gray-600 dark:text-gray-300 py-2">
          {aiLoaded ? (
            <p>
              No safe substitution found for <strong>{ingredient.name}</strong>
              {aiError ? ` — ${aiError}` : ' yet.'}
            </p>
          ) : (
            <p>
              No curated swap for <strong>{ingredient.name}</strong> in the handbook yet.
              Ask Chef Rani for ideas below.
            </p>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {options.map((option, i) => (
            <li
              key={`${option.to}-${i}`}
              className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                    {option.to}
                    <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                      ×{option.ratio}
                    </span>
                    {option.source === 'ai' && (
                      <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
                        AI idea
                      </span>
                    )}
                  </p>
                  {previewAmount(option.ratio) && (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {formatAmount(ingredient.amount)}{ingredient.unit ? ` ${ingredient.unit}` : ''}{' '}
                      {ingredient.name.toLowerCase()} → {previewAmount(option.ratio)} {option.to.toLowerCase()}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onApply(option)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shrink-0 transition-colors"
                >
                  <Check size={12} /> Use
                </button>
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-[11px] leading-snug">
                <div className="flex gap-1.5">
                  <dt className="font-semibold text-gray-400 dark:text-gray-500 shrink-0">Taste:</dt>
                  <dd className="text-gray-600 dark:text-gray-300">{option.taste}</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt className="font-semibold text-gray-400 dark:text-gray-500 shrink-0">Texture:</dt>
                  <dd className="text-gray-600 dark:text-gray-300">{option.texture}</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt className="font-semibold text-gray-400 dark:text-gray-500 shrink-0">Nutrition:</dt>
                  <dd className="text-gray-600 dark:text-gray-300">{option.nutrition}</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt className="font-semibold text-gray-400 dark:text-gray-500 shrink-0">Cooking:</dt>
                  <dd className="text-gray-600 dark:text-gray-300">{option.cooking}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}

      {aiError && options.length > 0 && (
        <p className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 mt-2">
          <AlertTriangle size={11} /> {aiError}
        </p>
      )}

      {!aiLoaded && (
        <button
          onClick={onAskAi}
          disabled={askingAi || loading}
          className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 disabled:opacity-60 transition-colors"
        >
          {askingAi ? <Sparkles size={12} className="animate-pulse" /> : <ChefHat size={12} />}
          {askingAi ? 'Asking Chef Rani…' : 'Ask Chef Rani for more ideas'}
        </button>
      )}
    </motion.div>
  );
}
