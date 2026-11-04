'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gauge, ChevronDown, Repeat, Soup, Lightbulb, Info } from 'lucide-react';

/**
 * Plan insights — the explainable plan-quality panel (roadmap P0-2).
 * Shows the heuristic score with per-dimension breakdowns, shared-ingredient
 * reuse, leftover-friendly meals and plain-language insights. Every number
 * carries its explanation; missing data is labelled instead of guessed.
 */

function scoreTone(score) {
  if (score == null) return 'text-gray-400 dark:text-gray-500';
  if (score >= 70) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 40) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-500 dark:text-red-400';
}

function barTone(score) {
  if (score == null) return 'bg-gray-200 dark:bg-gray-700';
  if (score >= 70) return 'bg-gradient-to-r from-emerald-500 to-teal-500';
  if (score >= 40) return 'bg-gradient-to-r from-amber-400 to-orange-400';
  return 'bg-gradient-to-r from-red-400 to-rose-500';
}

export default function PlanInsights({ insights }) {
  const [open, setOpen] = useState(true);

  if (!insights) return null;

  const { overall, dimensions, ingredientReuse, leftovers, insights: notes, disclaimer } = insights;

  return (
    <section
      className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors"
      aria-label="Plan quality insights"
    >
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-emerald-50/50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <span className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-lg text-white shrink-0">
          <Gauge size={18} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-gray-900 dark:text-white text-sm">Plan insights</span>
          <span className="block text-xs text-gray-500 dark:text-gray-400">
            {overall != null
              ? `Quality score ${overall}/100 · ${insights.mealCount} meals analysed`
              : 'Not enough data for a score yet — rate the dimensions below'}
          </span>
        </span>
        {overall != null && (
          <span className={`text-lg font-extrabold tabular-nums ${scoreTone(overall)}`}>
            {overall}
          </span>
        )}
        <ChevronDown
          size={18}
          className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 border-t border-gray-100 dark:border-gray-700 space-y-4">
              {/* Per-dimension scorecard */}
              <div className="space-y-3">
                {dimensions.map((d) => (
                  <div key={d.key}>
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{d.label}</span>
                      <span className={`text-xs font-bold tabular-nums ${scoreTone(d.score)}`}>
                        {d.score != null ? `${d.score}/100` : 'no data'}
                      </span>
                    </div>
                    <div
                      className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden"
                      role="img"
                      aria-label={`${d.label}: ${d.score != null ? `${d.score} out of 100` : 'not enough data'}`}
                    >
                      {d.score != null ? (
                        <div
                          className={`h-full rounded-full transition-all ${barTone(d.score)}`}
                          style={{ width: `${Math.max(3, d.score)}%` }}
                        />
                      ) : (
                        <div className="h-full w-full bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(156,163,175,0.35)_4px,rgba(156,163,175,0.35)_8px)]" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                      {d.explanation}
                      {d.missingData && (
                        <span className="italic text-gray-400 dark:text-gray-500"> — {d.missingData}</span>
                      )}
                    </p>
                  </div>
                ))}
              </div>

              {/* Shared ingredients */}
              {ingredientReuse.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    <Repeat size={13} className="text-emerald-600 dark:text-emerald-400" />
                    Buy once, use across meals
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ingredientReuse.map((r) => (
                      <span
                        key={r.name}
                        className="px-2 py-1 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                        title={`Used in: ${r.meals.join(', ')}`}
                      >
                        {r.name} · {r.count}×
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Leftover-friendly meals */}
              {leftovers.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    <Soup size={13} className="text-teal-600 dark:text-teal-400" />
                    Cook extra, ease tomorrow
                  </div>
                  <ul className="space-y-1">
                    {leftovers.map((l) => (
                      <li key={l.title} className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{l.title}</span>
                        {l.note ? ` — ${l.note}` : ' — makes intentional leftovers'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Plain-language insights */}
              {notes.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    <Lightbulb size={13} className="text-amber-500" />
                    What this score means
                  </div>
                  <ul className="space-y-1.5">
                    {notes.map((note, i) => (
                      <li key={i} className="flex gap-2 text-[11px] text-gray-600 dark:text-gray-300 leading-snug">
                        <span className="mt-1.5 h-1 w-1 rounded-full bg-emerald-400 shrink-0" />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="flex items-start gap-1.5 text-[10px] text-gray-400 dark:text-gray-500 leading-snug pt-1 border-t border-gray-100 dark:border-gray-700">
                <Info size={11} className="shrink-0 mt-0.5" />
                {disclaimer}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
