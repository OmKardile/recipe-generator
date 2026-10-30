"use client";

import { useState, useMemo, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
  PiMapPinFill,
  PiGaugeFill,
  PiClockFill,
  PiBasketFill,
  PiFireFill,
  PiSparkleFill,
  PiListChecksFill,
  PiArrowCounterClockwiseFill,
  PiCopyFill,
  PiShareFatFill,
  PiLinkFill,
  PiBookmarkSimpleFill,
  PiCheckFill,
  PiScalesFill,
  PiInfoFill,
  PiForkKnifeFill,
} from "react-icons/pi";
import { useRecipes } from "@/context/RecipeContext";
import { ingredientLine, formatAmount } from "@/lib/recipeUtils";
import ServingAdjuster from "./ServingAdjuster";
import RecipeMedia from "./RecipeMedia";

const DIFFICULTY_STYLES = {
  Easy: "bg-herb-100 text-herb-700 border-herb-200 dark:bg-herb-900/60 dark:text-herb-300 dark:border-herb-800",
  Medium: "bg-saffron/15 text-saffron-deep border-saffron/40 dark:bg-saffron/10 dark:text-saffron dark:border-saffron/30",
  Hard: "bg-chili/10 text-chili border-chili/30 dark:bg-chili/15 dark:text-chili dark:border-chili/40",
};

export default function RecipeDisplay({ data, ingredients, preferences }) {
  const { saveRecipe } = useRecipes();
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareError, setShareError] = useState("");
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Cook mode state
  const [cookMode, setCookMode] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState(new Set());
  const [doneSteps, setDoneSteps] = useState(new Set());

  const recipe = data?.recipe;
  const structured = data?.structured && data.ingredients?.length ? data : null;
  const baseServings = structured?.servings || 4;

  const [servings, setServings] = useState(baseServings);

  const scaleFactor = structured ? servings / baseServings : 1;
  const isScaled = Math.abs(scaleFactor - 1) > 0.001;

  const markdown = useMemo(() => recipe || "", [recipe]);

  // Animate macro bars in after mount.
  const [barsReady, setBarsReady] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setBarsReady(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!recipe && !structured) return null;

  const toggleItem = (set, setter, index) => {
    const next = new Set(set);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setter(next);
  };

  const handleSave = () => {
    if (saved) return;
    saveRecipe({
      title: data.title,
      recipe,
      nutrition: data.nutrition,
      ingredients: ingredients || [],
      preferences,
      servings: baseServings,
      baseServings,
      structured: structured
        ? {
            description: data.description,
            cuisine: data.cuisine,
            difficulty: data.difficulty,
            prepMinutes: data.prepMinutes,
            cookMinutes: data.cookMinutes,
            totalTimeMinutes: data.totalTimeMinutes,
            servings: baseServings,
            ingredients: data.ingredients,
            instructions: data.instructions,
            tips: data.tips,
          }
        : null,
    });
    setSaved(true);
  };

  const writeClipboard = async (text) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback for non-secure contexts / older browsers.
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  };

  const handleShare = async () => {
    setShareError("");
    try {
      if (shared) {
        await writeClipboard(shareUrl);
        return;
      }

      setSharing(true);
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          recipe,
          nutrition: data.nutrition,
          ingredients: ingredients || [],
          preferences,
        }),
      });

      const res = await response.json();
      if (!response.ok) throw new Error(res.error || "Sharing failed");

      const url = `${window.location.origin}${res.url}`;
      setShareUrl(url);
      setShared(true);
      await writeClipboard(url);
    } catch (error) {
      setShareError("Could not create a share link. Please try again.");
      console.error("Error sharing recipe:", error);
    } finally {
      setSharing(false);
    }
  };

  const handleCopyRecipe = async () => {
    const ok = await writeClipboard(markdown);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetCookMode = () => {
    setCheckedIngredients(new Set());
    setDoneSteps(new Set());
  };

  const totalTime = structured?.totalTimeMinutes;
  const nutrition = data.nutrition;

  const macroMax = nutrition
    ? Math.max(nutrition.protein, nutrition.carbs, nutrition.fat, 1)
    : 0;

  return (
    <div className="animate-fade-up">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* ── Media column: dish photograph + video tutorial ────────── */}
        <div className="lg:sticky lg:top-28">
          <RecipeMedia recipe={data} />
        </div>

        {/* ── Recipe body ───────────────────────────────────────────── */}
        <article className="overflow-hidden rounded-3xl border border-line bg-elev shadow-card">
          {/* Meta bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4 md:px-8">
            <div className="flex flex-wrap items-center gap-2">
              {structured?.cuisine && (
                <span className="inline-flex items-center gap-1 rounded-full border border-herb-200 bg-herb-100/70 px-3 py-1 text-xs font-semibold text-herb-700 dark:border-herb-800 dark:bg-herb-900/60 dark:text-herb-300">
                  <PiMapPinFill size={11} aria-hidden /> {structured.cuisine}
                </span>
              )}
              {structured?.difficulty && (
                <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${DIFFICULTY_STYLES[structured.difficulty] || DIFFICULTY_STYLES.Medium}`}>
                  <PiGaugeFill size={11} aria-hidden /> {structured.difficulty}
                </span>
              )}
              {totalTime != null && (
                <span className="inline-flex items-center gap-1 rounded-full border border-line bg-elev2 px-3 py-1 text-xs font-semibold text-body dark:bg-herb-950/60">
                  <PiClockFill size={11} aria-hidden /> {totalTime} min total
                </span>
              )}
            </div>
            <ServingAdjuster
              servings={servings}
              baseServings={baseServings}
              onServingsChange={setServings}
            />
          </div>

          <div className="px-6 py-7 md:px-8">
            {/* Title + description */}
            <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              {data.title}
            </h1>
            {structured?.description && (
              <p className="mt-3 text-base leading-relaxed text-body md:text-lg">
                {structured.description}
              </p>
            )}

            {/* Nutrition — calories + animated macro bars */}
            {nutrition && (
              <section
                className="mt-7 rounded-2xl border border-herb-200/70 bg-gradient-to-br from-herb-50 to-herb-100/50 p-5 dark:border-herb-800 dark:from-herb-900/40 dark:to-herb-950/60"
                aria-label="Nutrition per serving"
              >
                <div className="mb-4 flex items-center gap-2 text-herb-700 dark:text-herb-300">
                  <PiScalesFill size={16} aria-hidden />
                  <h2 className="text-sm font-bold uppercase tracking-[0.16em]">
                    Nutrition · per serving
                  </h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
                  <div className="flex items-baseline gap-1.5 justify-center sm:justify-start">
                    <span className="font-display text-5xl font-semibold text-herb-700 dark:text-herb-200">
                      {nutrition.calories}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-widest text-body">
                      kcal
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      ["Protein", nutrition.protein, "bg-herb-500"],
                      ["Carbs", nutrition.carbs, "bg-zest-deep"],
                      ["Fat", nutrition.fat, "bg-saffron"],
                    ].map(([label, grams, barColor]) => (
                      <div key={label} className="flex items-center gap-3">
                        <span className="w-14 text-[11px] font-bold uppercase tracking-[0.12em] text-body">
                          {label}
                        </span>
                        <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-herb-950/10 dark:bg-herb-100/10" aria-hidden>
                          <span
                            className={`block h-full rounded-full ${barColor} transition-all duration-700 ease-out`}
                            style={{ width: barsReady ? `${(grams / macroMax) * 100}%` : "0%" }}
                          />
                        </span>
                        <span className="w-14 text-right text-xs font-semibold tabular-nums text-ink">
                          {grams} g
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-body/80">
                  Estimated per serving — unaffected by serving scaling.
                </p>
              </section>
            )}

            {structured ? (
              <>
                {/* Ingredients — with REAL scaling */}
                <div className="mb-4 mt-8 flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-herb-100 text-herb-600 dark:bg-herb-900/70 dark:text-herb-300">
                    <PiBasketFill size={18} aria-hidden />
                  </span>
                  <h2 className="font-display text-xl font-semibold">Ingredients</h2>
                  {isScaled && (
                    <span className="rounded-full bg-zest/25 px-2.5 py-0.5 text-xs font-bold text-herb-800 dark:bg-zest/15 dark:text-zest">
                      scaled ×{formatAmount(scaleFactor)}
                    </span>
                  )}
                </div>

                <ul className="mb-3 space-y-1 rounded-2xl border border-line bg-elev2/60 p-3 dark:bg-herb-950/40">
                  {structured.ingredients.map((ing, index) => {
                    const line = ingredientLine(ing, scaleFactor);
                    const checked = checkedIngredients.has(index);
                    return (
                      <li key={`${ing.name}-${index}`}>
                        <button
                          onClick={() =>
                            cookMode && toggleItem(checkedIngredients, setCheckedIngredients, index)
                          }
                          className={`flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition-all ${
                            cookMode ? "cursor-pointer hover:bg-herb-100/50 dark:hover:bg-herb-900/40" : "cursor-default"
                          } ${checked ? "opacity-45" : ""}`}
                          aria-pressed={cookMode ? checked : undefined}
                        >
                          {cookMode && (
                            <span
                              className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition-colors ${
                                checked
                                  ? "border-herb-600 bg-herb-600 text-white"
                                  : "border-line"
                              }`}
                              aria-hidden
                            >
                              {checked && <PiCheckFill size={11} />}
                            </span>
                          )}
                          <span className={`leading-relaxed text-body ${checked ? "line-through" : ""}`}>
                            {line}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {isScaled && (
                  <p className="mb-6 px-1 text-xs text-body/80">
                    Amounts auto-scaled from the base recipe of {baseServings} servings.
                    Spices scale non-linearly — taste and adjust.
                  </p>
                )}

                {/* Instructions — timeline */}
                <div className="mb-4 mt-8 flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-herb-100 text-herb-600 dark:bg-herb-900/70 dark:text-herb-300">
                    <PiFireFill size={18} aria-hidden />
                  </span>
                  <h2 className="font-display text-xl font-semibold">Method</h2>
                  {cookMode && doneSteps.size > 0 && (
                    <span className="rounded-full bg-herb-100 px-2.5 py-0.5 text-xs font-bold text-herb-700 dark:bg-herb-900/70 dark:text-herb-300">
                      {doneSteps.size}/{structured.instructions.length} done
                    </span>
                  )}
                </div>

                <ol className="relative mb-8 space-y-1 before:absolute before:bottom-4 before:left-[19px] before:top-4 before:w-0.5 before:bg-gradient-to-b before:from-herb-300 before:to-herb-200 dark:before:from-herb-800 dark:before:to-herb-900">
                  {structured.instructions.map((step, index) => {
                    const done = doneSteps.has(index);
                    return (
                      <li key={index} className="relative">
                        <button
                          onClick={() => cookMode && toggleItem(doneSteps, setDoneSteps, index)}
                          className={`flex w-full items-start gap-4 rounded-2xl p-3.5 text-left transition-all ${
                            cookMode ? "cursor-pointer hover:bg-herb-100/50 dark:hover:bg-herb-900/40" : "cursor-default"
                          } ${done ? "bg-herb-100/40 dark:bg-herb-900/30" : ""}`}
                          aria-pressed={cookMode ? done : undefined}
                        >
                          <span
                            className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 font-display text-sm font-bold transition-all duration-300 ${
                              done
                                ? "border-herb-600 bg-herb-600 text-white scale-95"
                                : "border-herb-200 bg-elev text-herb-700 dark:border-herb-800 dark:bg-herb-950 dark:text-herb-300"
                            }`}
                            aria-hidden
                          >
                            {done ? <PiCheckFill size={15} /> : index + 1}
                          </span>
                          <span className={`pt-1.5 leading-relaxed text-body ${done ? "line-through opacity-60" : ""}`}>
                            {step}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>

                {/* Tips */}
                {structured.tips?.length > 0 && (
                  <section className="mb-2 rounded-2xl border border-zest/40 bg-zest/10 p-5 dark:border-zest/20 dark:bg-zest/5">
                    <div className="mb-3 flex items-center gap-2 text-herb-800 dark:text-zest">
                      <PiSparkleFill size={15} className="animate-wiggle" aria-hidden />
                      <h2 className="text-sm font-bold uppercase tracking-[0.16em]">
                        Chef&rsquo;s secrets
                      </h2>
                    </div>
                    <ul className="space-y-2">
                      {structured.tips.map((tip, index) => (
                        <li key={index} className="flex gap-3 leading-relaxed text-body">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zest-deep" aria-hidden />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            ) : (
              /* Legacy markdown fallback (non-structured recipes) */
              <ReactMarkdown
                components={{
                  h1: ({ node, ...props }) => (
                    <h1 className="mb-6 border-b border-line pb-4 font-display text-3xl font-semibold tracking-tight md:text-4xl" {...props} />
                  ),
                  h2: ({ node, ...props }) => {
                    const text = String(props.children ?? "").toLowerCase();
                    let Icon = PiForkKnifeFill;
                    if (text.includes("ingredient")) Icon = PiBasketFill;
                    if (text.includes("instruction") || text.includes("step")) Icon = PiFireFill;
                    if (text.includes("time") || text.includes("serving")) Icon = PiClockFill;
                    if (text.includes("nutrition")) Icon = PiInfoFill;
                    return (
                      <div className="mb-4 mt-8 flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-herb-100 text-herb-600 dark:bg-herb-900/70 dark:text-herb-300">
                          <Icon size={18} aria-hidden />
                        </span>
                        <h2 className="font-display text-xl font-semibold" {...props} />
                      </div>
                    );
                  },
                  p: ({ node, ...props }) => (
                    <p className="mb-4 leading-relaxed text-body" {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="mb-6 list-none space-y-1 rounded-2xl border border-line bg-elev2/60 p-3 dark:bg-herb-950/40" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="mb-6 list-decimal space-y-3 pl-6 marker:font-bold marker:text-herb-600 dark:marker:text-herb-400" {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="leading-relaxed text-body" {...props} />
                  ),
                  strong: ({ node, ...props }) => (
                    <strong className="font-semibold text-ink" {...props} />
                  ),
                }}
              >
                {markdown}
              </ReactMarkdown>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-elev2/50 px-6 py-4 md:px-8">
            <span className="text-xs uppercase tracking-[0.2em] text-body/80">
              Generated by Gemini AI
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {structured && (
                <button
                  onClick={() => setCookMode((v) => !v)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                    cookMode
                      ? "bg-herb-600 text-white shadow-glow"
                      : "border border-line bg-elev text-body hover:border-herb-400 hover:text-herb-700 dark:hover:text-herb-300"
                  }`}
                  aria-pressed={cookMode}
                >
                  <PiListChecksFill size={15} aria-hidden />
                  {cookMode ? "Cook mode on" : "Cook mode"}
                </button>
              )}
              {cookMode && (doneSteps.size > 0 || checkedIngredients.size > 0) && (
                <button
                  onClick={resetCookMode}
                  className="rounded-full border border-line bg-elev p-2.5 text-body transition-colors hover:border-herb-400 hover:text-herb-700 dark:hover:text-herb-300"
                  title="Reset progress"
                  aria-label="Reset cook mode progress"
                >
                  <PiArrowCounterClockwiseFill size={15} aria-hidden />
                </button>
              )}
              <button
                onClick={handleCopyRecipe}
                className="flex items-center gap-2 rounded-full border border-line bg-elev px-4 py-2 text-sm font-semibold text-body transition-colors hover:border-herb-400 hover:text-herb-700 dark:hover:text-herb-300"
              >
                {copied ? (
                  <PiCheckFill size={15} className="text-herb-600 dark:text-herb-400" aria-hidden />
                ) : (
                  <PiCopyFill size={15} aria-hidden />
                )}
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={handleShare}
                disabled={sharing}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  shared
                    ? "bg-herb-100 text-herb-700 dark:bg-herb-900/70 dark:text-herb-300"
                    : "border border-line bg-elev text-body hover:border-herb-400 hover:text-herb-700 dark:hover:text-herb-300"
                } disabled:opacity-60`}
              >
                {shared ? (
                  <PiLinkFill size={15} aria-hidden />
                ) : (
                  <PiShareFatFill size={15} aria-hidden />
                )}
                {shared ? "Link copied!" : sharing ? "Sharing…" : "Share"}
              </button>
              <button
                onClick={handleSave}
                disabled={saved}
                className={`btn-shine flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white transition-all ${
                  saved
                    ? "bg-herb-400 dark:bg-herb-800"
                    : "bg-gradient-to-r from-herb-600 to-herb-500 shadow-glow hover:scale-[1.03] active:scale-95"
                } disabled:cursor-default`}
              >
                {saved ? (
                  <PiCheckFill size={15} aria-hidden />
                ) : (
                  <PiBookmarkSimpleFill size={15} aria-hidden />
                )}
                {saved ? "Saved" : "Save recipe"}
              </button>
            </div>
          </div>

          {shareError && (
            <p className="px-6 pb-5 text-sm text-chili md:px-8" role="alert">
              {shareError}
            </p>
          )}
        </article>
      </div>
    </div>
  );
}
