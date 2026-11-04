'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ChevronDown, Save, Check, Sparkles, RotateCcw } from 'lucide-react';
import { profileHeadline } from '@/lib/personalization';

/**
 * Household profile — family size, servings, diet, allergies (hard
 * exclusions), dislikes, cuisines, skill, equipment, time budget, budget.
 * Persisted via /api/household; the planner and restriction gate read it
 * server-side, so saving here immediately shapes future plans.
 */

const DIETS = [
  { value: 'none', label: 'No specific diet' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'eggetarian', label: 'Eggetarian' },
  { value: 'pescatarian', label: 'Pescatarian' },
  { value: 'keto', label: 'Keto' },
  { value: 'mediterranean', label: 'Mediterranean' },
  { value: 'high protein', label: 'High protein' },
  { value: 'low carbohydrate', label: 'Low carbohydrate' },
  { value: 'gluten free', label: 'Gluten-free' },
  { value: 'dairy free', label: 'Dairy-free' },
  { value: 'indian vegetarian', label: 'Indian vegetarian' },
];

const ALLERGY_OPTIONS = ['dairy', 'gluten', 'nuts', 'egg', 'soy', 'seafood', 'sesame', 'mustard', 'shellfish'];

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'AUD', 'CAD', 'SGD'];

const inputClass =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition';

const labelClass = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1';

export default function HouseholdProfile({ compact = false }) {
  const [open, setOpen] = useState(false);
  const [household, setHousehold] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  // Learned taste profile — DERIVED from behaviour, never written into the
  // saved household fields above, and always resettable.
  const [learned, setLearned] = useState(null);
  const [resetArmed, setResetArmed] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    fetch('/api/household')
      .then((r) => r.json())
      .then((d) => setHousehold(d.household || {}))
      .catch(() => setError('Could not load household preferences.'));
  }, []);

  useEffect(() => {
    fetch('/api/interactions')
      .then((r) => r.json())
      .then((d) => setLearned(d.profile || null))
      .catch(() => {}); // learning state is optional UI
  }, []);

  const resetLearning = async () => {
    if (!resetArmed) {
      setResetArmed(true);
      return;
    }
    try {
      await fetch('/api/interactions', { method: 'DELETE' });
      setLearned(null);
      setResetArmed(false);
      setResetDone(true);
      setTimeout(() => setResetDone(false), 2500);
    } catch {
      /* keep the old profile on failure */
    }
  };

  const set = (field, value) => setHousehold((h) => ({ ...h, [field]: value }));

  const toggleAllergy = (a) => {
    const list = household?.allergies || [];
    set('allergies', list.includes(a) ? list.filter((x) => x !== a) : [...list, a]);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/household', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(household),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setHousehold(data.household);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!household) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-5 animate-pulse h-24" />
    );
  }

  const dietLabel = DIETS.find((d) => d.value === household.diet)?.label || household.customDiet || 'No specific diet';
  const summary = [
    `${household.adults ?? 2} adults${household.children ? ` · ${household.children} kids` : ''}`,
    dietLabel,
    household.allergies?.length ? `Allergies: ${household.allergies.join(', ')}` : 'No allergies',
  ].join(' · ');

  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-emerald-50/50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <span className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-lg text-white shrink-0">
          <Users size={18} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-gray-900 dark:text-white text-sm">Household profile</span>
          {!compact && (
            <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{summary}</span>
          )}
        </span>
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass} htmlFor="hh-adults">Adults</label>
                  <input
                    id="hh-adults"
                    type="number"
                    min="1"
                    max="20"
                    className={inputClass}
                    value={household.adults ?? 2}
                    onChange={(e) => set('adults', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="hh-children">Children</label>
                  <input
                    id="hh-children"
                    type="number"
                    min="0"
                    max="20"
                    className={inputClass}
                    value={household.children ?? 0}
                    onChange={(e) => set('children', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="hh-servings">Default servings / meal</label>
                  <input
                    id="hh-servings"
                    type="number"
                    min="1"
                    max="20"
                    className={inputClass}
                    value={household.defaultServings ?? 2}
                    onChange={(e) => set('defaultServings', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} htmlFor="hh-diet">Dietary preference</label>
                  <select
                    id="hh-diet"
                    className={inputClass}
                    value={household.diet || 'none'}
                    onChange={(e) => set('diet', e.target.value)}
                  >
                    {DIETS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                    Preferences are not allergies — both are enforced, separately.
                  </p>
                </div>
                <div>
                  <label className={labelClass} htmlFor="hh-custom-diet">Custom diet (optional)</label>
                  <input
                    id="hh-custom-diet"
                    className={inputClass}
                    placeholder="e.g. Jain, no onion/garlic"
                    value={household.customDiet || ''}
                    onChange={(e) => set('customDiet', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <span className={labelClass}>Allergies — hard exclusions</span>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Allergies">
                  {ALLERGY_OPTIONS.map((a) => {
                    const active = (household.allergies || []).includes(a);
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => toggleAllergy(a)}
                        aria-pressed={active}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                          active
                            ? 'bg-red-500 text-white shadow-sm'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        {a}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} htmlFor="hh-dislikes">Disliked ingredients (comma-separated)</label>
                  <input
                    id="hh-dislikes"
                    className={inputClass}
                    placeholder="bitter gourd, raisins…"
                    value={(household.dislikes || []).join(', ')}
                    onChange={(e) =>
                      set('dislikes', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))
                    }
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="hh-cuisines">Preferred cuisines</label>
                  <input
                    id="hh-cuisines"
                    className={inputClass}
                    placeholder="North Indian, Maharashtrian…"
                    value={household.cuisines || ''}
                    onChange={(e) => set('cuisines', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className={labelClass} htmlFor="hh-skill">Cooking skill</label>
                  <select
                    id="hh-skill"
                    className={inputClass}
                    value={household.skillLevel || 'beginner'}
                    onChange={(e) => set('skillLevel', e.target.value)}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="hh-cooktime">Daily cook time (min)</label>
                  <input
                    id="hh-cooktime"
                    type="number"
                    min="10"
                    max="600"
                    className={inputClass}
                    value={household.dailyCookMinutes ?? 45}
                    onChange={(e) => set('dailyCookMinutes', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="hh-budget">Weekly grocery budget</label>
                  <input
                    id="hh-budget"
                    type="number"
                    min="0"
                    className={inputClass}
                    placeholder="e.g. 2500"
                    value={household.weeklyBudget ?? ''}
                    onChange={(e) => set('weeklyBudget', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="hh-currency">Currency</label>
                  <select
                    id="hh-currency"
                    className={inputClass}
                    value={household.currency || 'INR'}
                    onChange={(e) => set('currency', e.target.value)}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="hh-equipment">Kitchen equipment</label>
                <input
                  id="hh-equipment"
                  className={inputClass}
                  placeholder="pressure cooker, induction, oven…"
                  value={household.equipment || ''}
                  onChange={(e) => set('equipment', e.target.value)}
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>
              )}

              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors"
              >
                {saved ? <Check size={15} /> : <Save size={15} />}
                {saved ? 'Saved' : saving ? 'Saving…' : 'Save household profile'}
              </button>

              {/* Learned taste profile — derived, displayed, resettable.
                  Explicit restrictions above ALWAYS outrank what is learned. */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={15} className="text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    Learned taste profile
                  </span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500">AI-derived, reset anytime</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  {profileHeadline(learned)}
                </p>

                {learned && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {(learned.cuisines || []).map((c) => (
                      <span key={`c-${c.name}`} className="px-2 py-1 rounded-full text-[11px] font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                        {c.name}
                      </span>
                    ))}
                    {(learned.likedIngredients || []).slice(0, 5).map((i) => (
                      <span key={`li-${i.name}`} className="px-2 py-1 rounded-full text-[11px] font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                        + {i.name}
                      </span>
                    ))}
                    {(learned.rejectedIngredients || []).slice(0, 4).map((i) => (
                      <span key={`ri-${i.name}`} className="px-2 py-1 rounded-full text-[11px] font-medium bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                        avoids {i.name}
                      </span>
                    ))}
                    {learned.typicalCookMinutes && (
                      <span className="px-2 py-1 rounded-full text-[11px] font-medium bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300">
                        ~{learned.typicalCookMinutes} min meals
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={resetLearning}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    {resetDone ? <Check size={13} /> : <RotateCcw size={13} />}
                    {resetDone
                      ? 'Learning reset'
                      : resetArmed
                        ? 'Tap again to confirm reset'
                        : 'Reset learned preferences'}
                  </button>
                  {resetArmed && !resetDone && (
                    <button
                      onClick={() => setResetArmed(false)}
                      className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      Cancel
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
                  Learning only adds soft hints — your saved allergies, diet and dislikes are
                  enforced absolutely and are never modified by what the app learns.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
