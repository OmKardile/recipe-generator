'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays, Sparkles, Lock, Unlock, RotateCw, X, Plus, CheckCircle2,
  ChevronLeft, ChevronRight, Trash2, Copy, ShoppingBasket, ChefHat,
  AlertTriangle, Flame, XCircle, ThumbsUp, ThumbsDown,
} from 'lucide-react';
import HouseholdProfile from '@/components/household/HouseholdProfile';
import PlanInsights from '@/components/planner/PlanInsights';
import { analyzePlanQuality } from '@/lib/planInsights';
import { useRecipes } from '@/context/RecipeContext';

/**
 * AI meal planner — generates a dated plan via /api/planner (household
 * preferences + pantry + allergies enforced server-side), then supports
 * surgical edits: lock meals, regenerate the whole plan / one day / one
 * meal, adjust servings, place saved recipes, move meals, mark cooked
 * (which deducts pantry stock, user-confirmed), and hand off to the
 * grocery list.
 */

const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_COUNTS = [1, 3, 7];

const inputClass =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition';

const labelClass = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1';

const todayIso = () => new Date().toISOString().slice(0, 10);

/** Saved-recipe store entry → the recipe shape plan slots expect. */
const toPlanRecipe = (saved) => {
  if (saved?.structured?.title) return saved.structured;
  const ings = (saved?.ingredients || []).map((i) =>
    typeof i === 'string' ? { name: i, amount: 0, unit: '', note: null } : i
  );
  return {
    title: saved?.title || 'Saved recipe',
    dishName: saved?.dishName || saved?.title || 'Saved recipe',
    cuisine: 'Indian',
    servings: saved?.baseServings || saved?.servings || 4,
    ingredients: ings,
    instructions: [],
    structured: false,
  };
};

export default function PlannerView({ onGoToGrocery }) {
  const { savedRecipes, mounted } = useRecipes();

  const [config, setConfig] = useState({
    name: '',
    startDate: todayIso(),
    dayCount: 7,
    mealSlots: ['breakfast', 'lunch', 'dinner'],
    cookDays: [],
    maxPrepMinutes: 20,
    maxCookMinutes: 45,
    leftoversAllowed: false,
    customDays: 7,
  });
  const [plans, setPlans] = useState([]);
  const [activePlanId, setActivePlanId] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busySlot, setBusySlot] = useState(null); // `${date}|${slot}` while regenerating one meal
  const [picker, setPicker] = useState(null); // { date, mealType }
  const [moveSource, setMoveSource] = useState(null); // { date, mealType }
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [planVoted, setPlanVoted] = useState(null); // 'up' | 'down' after plan feedback

  // Lightweight context for live plan-insight recompute (household budget,
  // current pantry stock) — refreshed per plan and after pantry consumption.
  const [householdLite, setHouseholdLite] = useState(null);
  const [pantryLite, setPantryLite] = useState([]);

  const refreshInsightContext = useCallback(() => {
    fetch('/api/household')
      .then((r) => r.json())
      .then((d) => setHouseholdLite(d.household || {}))
      .catch(() => {});
    fetch('/api/pantry')
      .then((r) => r.json())
      .then((d) => setPantryLite(d.pantry || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activePlanId) refreshInsightContext();
  }, [activePlanId, refreshInsightContext]);

  const insights = useMemo(
    () => (plan ? analyzePlanQuality({ plan, pantry: pantryLite, household: householdLite }) : null),
    [plan, pantryLite, householdLite]
  );

  const set = (field, value) => setConfig((c) => ({ ...c, [field]: value }));

  /** Personalization telemetry — fire-and-forget, never blocks the UI. */
  const trackEvent = (event) => {
    fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }).catch(() => {});
  };

  const toggleSlot = (s) => {
    setConfig((c) => ({
      ...c,
      mealSlots: c.mealSlots.includes(s)
        ? c.mealSlots.filter((x) => x !== s)
        : SLOTS.filter((x) => x === s || c.mealSlots.includes(x)),
    }));
  };

  const toggleCookDay = (d) => {
    setConfig((c) => ({
      ...c,
      cookDays: c.cookDays.includes(d)
        ? c.cookDays.filter((x) => x !== d)
        : [...c.cookDays, d],
    }));
  };

  const loadPlans = useCallback(async (selectFirst = false) => {
    try {
      const res = await fetch('/api/planner');
      const data = await res.json();
      const list = data.plans || [];
      setPlans(list);
      if (selectFirst && list.length) {
        setActivePlanId((current) => current || list[0].id);
      }
    } catch {
      /* network hiccup — keep whatever we have */
    }
  }, []);

  useEffect(() => {
    loadPlans(true).finally(() => setLoadingPlan(false));
  }, [loadPlans]);

  useEffect(() => {
    if (!activePlanId) {
      setPlan(null);
      return;
    }
    let cancelled = false;
    setPlanVoted(null); // feedback is per-plan
    fetch(`/api/planner/${activePlanId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.plan) setPlan(d.plan);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activePlanId]);

  const dayCountValue = config.dayCount === 'custom' ? config.customDays : config.dayCount;

  const generate = async () => {
    if (!config.mealSlots.length) {
      setError('Pick at least one meal to plan.');
      return;
    }
    setGenerating(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: config.name,
          startDate: config.startDate,
          dayCount: dayCountValue,
          mealSlots: config.mealSlots,
          cookDays: config.cookDays.length ? config.cookDays : undefined,
          maxPrepMinutes: config.maxPrepMinutes,
          maxCookMinutes: config.maxCookMinutes,
          leftoversAllowed: config.leftoversAllowed,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate the plan.');
      setPlan(data.plan);
      setActivePlanId(data.plan.id);
      await loadPlans();
      setNotice(
        data.plan.warnings?.length
          ? `Plan ready — ${data.plan.warnings.length} meal(s) skipped for safety (see warnings below).`
          : 'Plan ready! Adjust servings, lock favourites, or regenerate any meal.'
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const regenerate = async (scope, date = null, mealType = null) => {
    if (!plan) return;
    const key = date && mealType ? `${date}|${mealType}` : null;
    if (key) setBusySlot(key);
    setError(null);
    // Replacing one meal is a mild negative signal for that dish.
    if (scope === 'meal' && date && mealType) {
      const old = plan.days.find((d) => d.date === date)?.meals?.[mealType];
      if (old?.recipe) {
        trackEvent({
          type: 'meal_replaced',
          title: old.recipe.title,
          dishName: old.recipe.dishName || '',
          cuisine: old.recipe.cuisine || '',
          mealType,
        });
      }
    }
    try {
      const res = await fetch(`/api/planner/${plan.id}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, date, mealType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to regenerate.');
      setPlan(data.plan);
      if (data.warnings?.length) setNotice(data.warnings.join(' · '));
    } catch (err) {
      setError(err.message);
    } finally {
      if (key) setBusySlot(null);
    }
  };

  /** Plan-level feedback → personalization engine (up = 5, down = 1). */
  const votePlan = (direction) => {
    if (!plan || planVoted === direction) return;
    setPlanVoted(direction);
    trackEvent({
      type: 'plan_feedback',
      rating: direction === 'up' ? 5 : 1,
      note: plan.name || '',
    });
  };

  const patch = async (payload) => {
    if (!plan) return null;
    try {
      const res = await fetch(`/api/planner/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed.');
      setPlan(data.plan);
      return data.plan;
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  const cookMeal = async (date, mealType) => {
    if (!plan) return;
    setError(null);
    const meal = plan.days.find((d) => d.date === date)?.meals?.[mealType];
    try {
      const res = await fetch('/api/pantry/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, date, mealType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not record cooking.');
      // Cooking a planned meal is the strongest endorsement signal.
      if (meal?.recipe) {
        trackEvent({
          type: 'recipe_cooked',
          title: meal.recipe.title,
          dishName: meal.recipe.dishName || '',
          cuisine: meal.recipe.cuisine || '',
          mealType,
          ingredients: (meal.recipe.ingredients || []).map((i) => i.name),
          totalTimeMinutes: meal.recipe.totalTimeMinutes || null,
        });
      }
      await fetch(`/api/planner/${plan.id}`)
        .then((r) => r.json())
        .then((d) => d.plan && setPlan(d.plan));
      refreshInsightContext(); // pantry quantities just changed
      const skipped = data.skipped?.length
        ? ` (${data.skipped.length} pantry line(s) not deducted — unit mismatch)`
        : '';
      setNotice(`Cooked! Pantry updated for the ingredients you stock.${skipped}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const placeRecipe = async (recipe) => {
    if (!picker) return;
    await patch({
      action: 'setMeal',
      date: picker.date,
      mealType: picker.mealType,
      recipe: toPlanRecipe(recipe),
      servings: recipe?.baseServings || recipe?.structured?.servings || null,
    });
    setPicker(null);
  };

  const moveTo = async (date, mealType) => {
    if (!moveSource) return;
    await patch({
      action: 'moveMeal',
      fromDate: moveSource.date,
      fromMealType: moveSource.mealType,
      toDate: date,
      toMealType: mealType,
    });
    setMoveSource(null);
  };

  const generateGrocery = async () => {
    if (!plan) return;
    setError(null);
    try {
      const res = await fetch('/api/grocery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealPlanId: plan.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to build the grocery list.');
      setNotice('Grocery list built from this plan — pantry stock already deducted.');
      onGoToGrocery?.();
    } catch (err) {
      setError(err.message);
    }
  };

  const duplicate = async () => {
    if (!plan) return;
    const res = await fetch('/api/planner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duplicateOf: plan.id }),
    });
    const data = await res.json();
    if (res.ok && data.plan) {
      setPlan(data.plan);
      setActivePlanId(data.plan.id);
      await loadPlans();
    }
  };

  const removePlan = async () => {
    if (!plan) return;
    await fetch(`/api/planner/${plan.id}`, { method: 'DELETE' });
    setConfirmDelete(false);
    setPlan(null);
    setActivePlanId(null);
    await loadPlans();
  };

  const mealSlots = plan?.mealSlots || config.mealSlots;

  const slotTargets = useMemo(
    () =>
      (plan?.days || []).flatMap((d) =>
        mealSlots.map((slot) => ({ date: d.date, mealType: slot, meal: d.meals?.[slot] || null }))
      ),
    [plan, mealSlots]
  );

  const totalMeals = slotTargets.filter((t) => t.meal).length;

  if (!mounted || loadingPlan) {
    return (
      <div className="w-full max-w-5xl mx-auto mt-8 space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md h-28 animate-pulse" />
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md h-64 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto mt-8 space-y-6">
      {/* ── Planner configuration ─────────────────────────────────────── */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="bg-gradient-to-r from-green-400 to-emerald-500 h-2" aria-hidden="true" />
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-xl text-white shadow-md shadow-emerald-500/30">
              <Sparkles size={20} />
            </span>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Plan your meals</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Chef Rani plans the whole schedule together — shared ingredients, your pantry, zero repeats.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div>
              <label className={labelClass} htmlFor="pl-name">Plan name</label>
              <input
                id="pl-name"
                className={inputClass}
                placeholder="This week…"
                value={config.name}
                onChange={(e) => set('name', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="pl-start">Start date</label>
              <input
                id="pl-start"
                type="date"
                className={inputClass}
                value={config.startDate}
                onChange={(e) => set('startDate', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="pl-prep">Max prep (min)</label>
              <input
                id="pl-prep"
                type="number"
                min="5"
                max="240"
                className={inputClass}
                value={config.maxPrepMinutes}
                onChange={(e) => set('maxPrepMinutes', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="pl-cook">Max cook (min)</label>
              <input
                id="pl-cook"
                type="number"
                min="5"
                max="480"
                className={inputClass}
                value={config.maxCookMinutes}
                onChange={(e) => set('maxCookMinutes', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <div>
              <span className={labelClass}>Days</span>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Plan length">
                {DAY_COUNTS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => set('dayCount', n)}
                    aria-pressed={config.dayCount === n}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      config.dayCount === n
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {n} day{n > 1 ? 's' : ''}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => set('dayCount', 'custom')}
                  aria-pressed={config.dayCount === 'custom'}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    config.dayCount === 'custom'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Custom
                </button>
                {config.dayCount === 'custom' && (
                  <input
                    type="number"
                    min="1"
                    max="14"
                    aria-label="Custom day count"
                    className={`${inputClass} !w-24`}
                    value={config.customDays}
                    onChange={(e) => set('customDays', e.target.value)}
                  />
                )}
              </div>
            </div>

            <div>
              <span className={labelClass}>Meals to plan</span>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Meal slots">
                {SLOTS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSlot(s)}
                    aria-pressed={config.mealSlots.includes(s)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                      config.mealSlots.includes(s)
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className={labelClass}>Cooking days (empty = every day)</span>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Cooking days">
                {WEEKDAYS.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleCookDay(i)}
                    aria-pressed={config.cookDays.includes(i)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      config.cookDays.length === 0 || config.cookDays.includes(i)
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={config.leftoversAllowed}
                onChange={(e) => set('leftoversAllowed', e.target.checked)}
                className="accent-emerald-600 w-4 h-4"
              />
              Leftover-friendly dinners (batch-cook & repurpose)
            </label>
          </div>

          <button
            onClick={generate}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold shadow-md shadow-emerald-600/30 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-70 transition-all"
          >
            {generating ? (
              <>
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="inline-flex"
                >
                  <ChefHat size={18} />
                </motion.span>
                Chef Rani is planning your week…
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Generate meal plan
              </>
            )}
          </button>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                role="alert"
                className="mt-3 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm flex items-center gap-2"
              >
                <AlertTriangle size={16} /> {error}
              </motion.div>
            )}
            {notice && !error && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg text-sm"
              >
                {notice}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </section>

      <HouseholdProfile />

      {/* ── Saved plans ───────────────────────────────────────────────── */}
      {plans.length > 0 && (
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-4 flex flex-wrap items-center gap-3 transition-colors">
          <CalendarDays size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <select
            aria-label="Select a saved meal plan"
            className={`${inputClass} flex-1 min-w-48`}
            value={activePlanId || ''}
            onChange={(e) => setActivePlanId(e.target.value)}
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name || p.startDate} · {p.dayCount} days, {p.mealCount} meals
              </option>
            ))}
          </select>
          <button
            onClick={duplicate}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Duplicate this plan onto new dates"
          >
            <Copy size={15} /> Copy
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
          >
            <Trash2 size={15} /> Delete
          </button>
        </section>
      )}

      {/* ── Plan calendar ─────────────────────────────────────────────── */}
      {plan && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                {plan.name || 'Meal plan'}
              </h2>
              {plan.aiSummary && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{plan.aiSummary}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full">
                {totalMeals} meals planned
              </span>
              <button
                onClick={() => regenerate('all')}
                disabled={generating}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                title="Regenerate every unlocked meal"
              >
                <RotateCw size={15} /> Regenerate plan
              </button>
              <button
                onClick={generateGrocery}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 shadow-sm shadow-emerald-600/30 transition-colors"
              >
                <ShoppingBasket size={15} /> Grocery list
              </button>
            </div>
          </div>

          {/* Plan-level feedback — trains future plan generation. */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-semibold">How did this plan work out?</span>
            <button
              onClick={() => votePlan('up')}
              aria-pressed={planVoted === 'up'}
              aria-label="This plan worked well"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-medium transition-colors ${
                planVoted === 'up'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-emerald-50 dark:hover:bg-gray-600 hover:text-emerald-600'
              }`}
            >
              <ThumbsUp size={13} /> Good plan
            </button>
            <button
              onClick={() => votePlan('down')}
              aria-pressed={planVoted === 'down'}
              aria-label="This plan did not work well"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-medium transition-colors ${
                planVoted === 'down'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-gray-600 hover:text-red-500'
              }`}
            >
              <ThumbsDown size={13} /> Needs work
            </button>
            {planVoted && (
              <span className="text-emerald-600 dark:text-emerald-400">Thanks — future plans will consider it.</span>
            )}
          </div>

          {/* Explainable plan-quality panel (recomputed live as meals change) */}
          <PlanInsights insights={insights} />

          {plan.warnings?.length > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-lg text-sm border border-amber-200 dark:border-amber-700 flex gap-2" role="status">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>
                <strong className="font-semibold">Safety skips:</strong> {plan.warnings.join(' · ')}
              </span>
            </div>
          )}

          {moveSource && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-lg text-sm border border-blue-200 dark:border-blue-700 flex items-center justify-between gap-2" role="status">
              <span>
                Moving <strong>{moveSource.date} {moveSource.mealType}</strong> — pick an empty slot below.
              </span>
              <button
                onClick={() => setMoveSource(null)}
                className="px-2 py-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 font-medium"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="space-y-3">
            {plan.days.map((day) => (
              <div
                key={day.date}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-md border transition-colors overflow-hidden ${
                  day.cook
                    ? 'border-gray-100 dark:border-gray-700'
                    : 'border-dashed border-gray-300 dark:border-gray-600 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-750/50">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-gray-900 dark:text-white">
                      {new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    {!day.cook && (
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">rest day</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => regenerate('day', day.date)}
                      disabled={generating || !day.cook}
                      className="p-1.5 rounded-md text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors disabled:opacity-40"
                      aria-label={`Regenerate ${day.date}`}
                      title="Regenerate this day's unlocked meals"
                    >
                      <RotateCw size={14} />
                    </button>
                    <button
                      onClick={() => patch({ action: 'setDayCook', date: day.date, cook: !day.cook })}
                      className={`p-1.5 rounded-md transition-colors ${
                        day.cook
                          ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                          : 'text-gray-400 hover:text-emerald-600'
                      }`}
                      aria-label={day.cook ? `Mark ${day.date} as rest day` : `Mark ${day.date} as cooking day`}
                      title={day.cook ? 'Set as rest day' : 'Set as cooking day'}
                    >
                      <Flame size={14} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-gray-700">
                  {mealSlots.map((slot) => {
                    const meal = day.meals?.[slot];
                    const busy = busySlot === `${day.date}|${slot}`;
                    const isMoveTarget = moveSource && !meal;
                    return (
                      <div key={slot} className="p-3 min-h-28 flex flex-col">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">
                          {slot}
                        </span>
                        {busy ? (
                          <div className="flex-1 flex items-center justify-center py-4">
                            <motion.span
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              className="text-emerald-500"
                            >
                              <RotateCw size={18} />
                            </motion.span>
                          </div>
                        ) : meal?.recipe ? (
                          <div className="flex-1">
                            <p className="font-semibold text-sm text-gray-900 dark:text-white leading-snug">
                              {meal.recipe.title}
                            </p>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                              {meal.recipe.cuisine} · {meal.recipe.totalTimeMinutes || meal.recipe.prepMinutes + meal.recipe.cookMinutes || '?'} min
                            </p>
                            <div className="flex items-center gap-1 mt-2 flex-wrap">
                              <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden" role="group" aria-label={`Servings for ${meal.recipe.title}`}>
                                <button
                                  onClick={() =>
                                    patch({
                                      action: 'setServings',
                                      date: day.date,
                                      mealType: slot,
                                      servings: Math.max(1, (meal.servings || meal.recipe.servings || 2) - 1),
                                    })
                                  }
                                  className="px-2 py-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 text-xs"
                                  aria-label="Fewer servings"
                                >
                                  <ChevronLeft size={12} />
                                </button>
                                <span className="px-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 tabular-nums">
                                  {meal.servings || meal.recipe.servings} srv
                                </span>
                                <button
                                  onClick={() =>
                                    patch({
                                      action: 'setServings',
                                      date: day.date,
                                      mealType: slot,
                                      servings: Math.min(24, (meal.servings || meal.recipe.servings || 2) + 1),
                                    })
                                  }
                                  className="px-2 py-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 text-xs"
                                  aria-label="More servings"
                                >
                                  <ChevronRight size={12} />
                                </button>
                              </div>
                              <button
                                onClick={() => patch({ action: 'toggleLock', date: day.date, mealType: slot })}
                                className={`p-1.5 rounded-md transition-colors ${
                                  meal.locked
                                    ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/30'
                                    : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30'
                                }`}
                                aria-pressed={meal.locked}
                                aria-label={meal.locked ? `Unlock ${meal.recipe.title}` : `Lock ${meal.recipe.title}`}
                                title={meal.locked ? 'Locked — regeneration keeps it' : 'Lock to protect from regeneration'}
                              >
                                {meal.locked ? <Lock size={13} /> : <Unlock size={13} />}
                              </button>
                              <button
                                onClick={() => regenerate('meal', day.date, slot)}
                                className="p-1.5 rounded-md text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                                aria-label={`Regenerate ${meal.recipe.title}`}
                                title="Swap this meal for a new one"
                              >
                                <RotateCw size={13} />
                              </button>
                              <button
                                onClick={() => setMoveSource({ date: day.date, mealType: slot })}
                                className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                aria-label={`Move ${meal.recipe.title} to another slot`}
                                title="Move to another slot"
                              >
                                <Plus size={13} className="rotate-45" />
                              </button>
                              {meal.cookedAt ? (
                                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 px-1.5">
                                  <CheckCircle2 size={13} /> cooked
                                </span>
                              ) : (
                                <button
                                  onClick={() => cookMeal(day.date, slot)}
                                  className="p-1.5 rounded-md text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                                  aria-label={`Mark ${meal.recipe.title} as cooked`}
                                  title="Cooked — deduct ingredients from pantry"
                                >
                                  <CheckCircle2 size={13} />
                                </button>
                              )}
                              <button
                                onClick={() => patch({ action: 'clearMeal', date: day.date, mealType: slot })}
                                className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors ml-auto"
                                aria-label={`Remove ${meal.recipe.title}`}
                                title="Remove meal"
                              >
                                <X size={13} />
                              </button>
                            </div>
                            {meal.makesLeftovers && meal.leftoverNote && (
                              <p className="text-[11px] text-teal-600 dark:text-teal-400 mt-1.5 italic">
                                ♻ {meal.leftoverNote}
                              </p>
                            )}
                          </div>
                        ) : isMoveTarget ? (
                          <button
                            onClick={() => moveTo(day.date, slot)}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-blue-400 dark:border-blue-500 text-blue-600 dark:text-blue-400 text-xs font-semibold py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          >
                            <Plus size={14} /> Move meal here
                          </button>
                        ) : day.cook ? (
                          <button
                            onClick={() => setPicker({ date: day.date, mealType: slot })}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 text-xs font-medium py-3 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                          >
                            <Plus size={14} /> Add recipe
                          </button>
                        ) : (
                          <p className="flex-1 flex items-center justify-center text-xs text-gray-300 dark:text-gray-600 py-3">
                            —
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Saved-recipe picker modal ─────────────────────────────────── */}
      <AnimatePresence>
        {picker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setPicker(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Pick a saved recipe"
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Add to {picker.date} · {picker.mealType}
                </h3>
                <button
                  onClick={() => setPicker(null)}
                  className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                  aria-label="Close picker"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="overflow-y-auto p-3 space-y-2">
                {savedRecipes.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                    No saved recipes yet — generate and save a recipe first, or let the AI fill this slot.
                  </p>
                ) : (
                  savedRecipes.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => placeRecipe(r)}
                      className="w-full text-left p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 transition-colors"
                    >
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">
                        {r.title || r.structured?.title}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {r.structured?.cuisine || 'Saved recipe'} · serves {r.baseServings || r.structured?.servings || 4}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete confirmation ───────────────────────────────────────── */}
      <AnimatePresence>
        {confirmDelete && plan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setConfirmDelete(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Confirm plan deletion"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <XCircle className="mx-auto text-red-500 mb-3" size={32} />
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">Delete this plan?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                “{plan.name || plan.startDate}” will be removed. Your recipes and pantry stay safe.
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Keep it
                </button>
                <button
                  onClick={removePlan}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
                >
                  Delete plan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
