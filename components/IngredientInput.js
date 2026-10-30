"use client";

import { useEffect, useState } from "react";
import {
  PiPlus,
  PiX,
  PiSparkleFill,
  PiCarrotFill,
  PiForkKnifeFill,
  PiCookingPotFill,
} from "react-icons/pi";

const MAX_INGREDIENTS = 25;
const MAX_INGREDIENT_LENGTH = 40;

const QUICK_SUGGESTIONS = [
  "Onion", "Tomato", "Ginger", "Garlic", "Potato", "Paneer",
  "Chicken", "Rice", "Toor dal", "Spinach",
];

const LOADING_LINES = [
  "Cooking up ideas…",
  "Consulting the spice rack…",
  "Channeling Chef Rani…",
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
  const [inputValue, setInputValue] = useState("");
  const [notice, setNotice] = useState("");
  const [loadingLine, setLoadingLine] = useState(0);

  // Rotate the playful status lines while the AI cooks.
  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(
      () => setLoadingLine((i) => (i + 1) % LOADING_LINES.length),
      2600
    );
    return () => clearInterval(interval);
  }, [isLoading]);

  const addFromText = (text) => {
    // Split on commas so "chicken, rice, tomatoes" becomes three chips at once.
    const parts = text
      .split(",")
      .map((s) => s.trim().replace(/\s+/g, " ").slice(0, MAX_INGREDIENT_LENGTH))
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
          ? "Skipped 1 duplicate or over-limit ingredient."
          : `Skipped ${skipped} duplicate or over-limit ingredients.`
        : ""
    );
    return true;
  };

  const handleAddIngredient = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      addFromText(inputValue);
      setInputValue("");
    }
  };

  const removeIngredient = (index) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handlePreferencesKeyDown = (e) => {
    // Ctrl/Cmd + Enter inside the preferences box triggers generation.
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !isLoading && ingredients.length > 0) {
      e.preventDefault();
      onSubmit();
    }
  };

  const canSubmit = ingredients.length > 0 && !isLoading;

  return (
    <section className="relative mx-auto w-full max-w-xl">
      <div className="overflow-hidden rounded-3xl border border-line bg-elev shadow-card">
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-herb-400 via-zest-deep to-herb-500"
        />

        <div className="p-6 sm:p-8">
          <div className="mb-1 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-herb-100 text-herb-600 dark:bg-herb-900/70 dark:text-herb-300">
              <PiForkKnifeFill size={20} aria-hidden />
            </span>
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                What&rsquo;s in your kitchen?
              </h2>
            </div>
          </div>
          <p className="mb-6 text-sm text-body">
            Add ingredients — commas are fine.{" "}
            <kbd className="rounded-md border border-line bg-elev2 px-1.5 py-0.5 text-[10px] font-semibold text-body dark:bg-herb-950/60">
              Ctrl
            </kbd>{" "}
            +{" "}
            <kbd className="rounded-md border border-line bg-elev2 px-1.5 py-0.5 text-[10px] font-semibold text-body dark:bg-herb-950/60">
              Enter
            </kbd>{" "}
            to generate.
          </p>

          <form onSubmit={handleAddIngredient} className="relative mb-3 flex gap-2">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-herb-400" aria-hidden>
              <PiCarrotFill size={17} />
            </span>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="e.g. Chicken, Rice, Tomatoes"
              disabled={isLoading}
              aria-label="Add ingredient"
              className="flex-1 rounded-full border border-line bg-paper py-3 pl-11 pr-4 text-sm text-ink outline-none transition-all placeholder:text-body/60 focus:border-herb-400 focus:ring-2 focus:ring-herb-400/30 disabled:opacity-60 dark:bg-herb-950/40"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              aria-label="Add ingredient"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-herb-100 text-herb-700 transition-all hover:bg-herb-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 dark:bg-herb-900/70 dark:text-herb-300 dark:hover:bg-herb-800"
            >
              <PiPlus size={19} aria-hidden />
            </button>
          </form>

          {notice && (
            <p className="mb-2 text-xs text-saffron-deep dark:text-saffron" role="status">
              {notice}
            </p>
          )}

          {ingredients.length === 0 ? (
            <div className="mb-6">
              <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-body">
                <PiSparkleFill size={11} className="text-zest-deep" aria-hidden /> Quick add
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_SUGGESTIONS.map((suggestion, i) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => addFromText(suggestion)}
                    disabled={isLoading}
                    style={{ animationDelay: `${i * 50}ms` }}
                    className="animate-pop rounded-full border border-herb-200/70 bg-herb-100/50 px-3 py-1 text-xs font-semibold text-herb-700 transition-all hover:-translate-y-0.5 hover:border-herb-400 hover:bg-herb-100 disabled:opacity-50 dark:border-herb-800 dark:bg-herb-900/50 dark:text-herb-300 dark:hover:bg-herb-900"
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-6 flex flex-wrap gap-2">
              {ingredients.map((ing, index) => (
                <span
                  key={`${ing}-${index}`}
                  style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                  className="animate-pop group inline-flex items-center gap-1.5 rounded-full border border-herb-200/80 bg-herb-100/70 py-1 pl-3 pr-1.5 text-sm font-semibold text-herb-800 transition-transform hover:scale-[1.04] dark:border-herb-800 dark:bg-herb-900/60 dark:text-herb-200"
                >
                  {ing}
                  <button
                    onClick={() => removeIngredient(index)}
                    disabled={isLoading}
                    aria-label={`Remove ${ing}`}
                    className="grid h-5 w-5 place-items-center rounded-full text-herb-500 transition-colors hover:bg-chili hover:text-white disabled:opacity-50 dark:text-herb-400"
                  >
                    <PiX size={11} aria-hidden />
                  </button>
                </span>
              ))}
              <span className="ml-1 self-center text-xs tabular-nums text-body/70">
                {ingredients.length}/{MAX_INGREDIENTS}
              </span>
            </div>
          )}

          <div className="mb-6">
            <label
              htmlFor="preferences"
              className="mb-2 block text-sm font-semibold text-ink"
            >
              Dietary preferences / restrictions{" "}
              <span className="font-normal text-body/70">(optional)</span>
            </label>
            <textarea
              id="preferences"
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              onKeyDown={handlePreferencesKeyDown}
              placeholder="e.g. Vegan, Gluten-free, Spicy, under 30 minutes, Jain…"
              disabled={isLoading}
              className="w-full resize-none rounded-2xl border border-line bg-paper px-4 py-3 text-sm text-ink outline-none transition-all placeholder:text-body/60 focus:border-herb-400 focus:ring-2 focus:ring-herb-400/30 disabled:opacity-60 dark:bg-herb-950/40"
              rows={3}
            />
          </div>

          <div className="mb-6 flex items-center gap-3">
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={includeNutrition}
                onChange={(e) => setIncludeNutrition(e.target.checked)}
                disabled={isLoading}
                className="peer sr-only"
                aria-label="Include nutrition information"
              />
              <span className="h-6 w-10 rounded-full border border-line bg-elev2 transition-colors after:absolute after:left-1 after:top-1/2 after:h-4 after:w-4 after:-translate-y-1/2 after:rounded-full after:bg-body after:transition-all after:content-[''] peer-checked:bg-herb-600 peer-checked:after:translate-x-[calc(2.5rem-1.25rem-0.25rem)] peer-checked:after:bg-white peer-focus-visible:ring-2 peer-focus-visible:ring-herb-400/40 dark:bg-herb-950/60 dark:after:bg-herb-400"></span>
            </label>
            <span className="text-sm text-body">
              Include nutrition info{" "}
              <span className="text-body/60">(slightly slower)</span>
            </span>
          </div>

          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className="btn-shine group flex w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-herb-600 to-herb-500 py-4 font-display text-lg font-semibold text-white shadow-glow transition-all hover:scale-[1.02] hover:shadow-lift active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {isLoading ? (
              <>
                <PiCookingPotFill size={21} className="animate-wiggle" aria-hidden />
                {LOADING_LINES[loadingLine % LOADING_LINES.length]}
              </>
            ) : (
              <>
                <PiSparkleFill size={20} className="transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" aria-hidden />
                Generate 3 recipes
              </>
            )}
          </button>

          {isLoading && (
            <div className="mt-4 flex justify-center gap-1.5" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span
                  key={`dot-${i}`}
                  className="h-1.5 w-1.5 rounded-full bg-herb-500/80"
                  style={{ animation: `pulse-ring 1.4s ease-out ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
