"use client";

import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { Check, Bookmark, Share2, Link2, Copy, ListChecks, RotateCcw } from "lucide-react";
import { useRecipes } from "@/context/RecipeContext";
import { ingredientLine, formatAmount } from "@/lib/recipeUtils";
import ServingAdjuster from "./ServingAdjuster";
import RecipeMedia from "./RecipeMedia";
import useRecipeMedia from "@/hooks/useRecipeMedia";

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

  // Real media: canonical dish name + server-verified video id drive the
  // real-photo lookup (Wikipedia → TheMealDB → video thumbnail).
  const dishName = data?.dishName || data?.title;
  const youtubeVideoId = data?.youtubeVideoId || null;
  const { media, loading: mediaLoading } = useRecipeMedia({
    dishName,
    title: data?.title,
    youtubeVideoId,
  });

  const [servings, setServings] = useState(baseServings);

  const scaleFactor = structured ? servings / baseServings : 1;
  const isScaled = Math.abs(scaleFactor - 1) > 0.001;

  const markdown = useMemo(() => recipe || "", [recipe]);

  if (!recipe && !structured) return null;

  const toggleItem = (set, setter, index) => {
    const next = new Set(set);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setter(next);
  };

  const payload = () => ({
    title: data.title,
    dishName,
    recipe,
    nutrition: data.nutrition,
    media: media ? { url: media.url, source: media.source, credit: media.credit } : null,
    youtubeUrl: data.youtubeUrl || null,
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
          dishName,
          youtubeVideoId,
        }
      : null,
  });

  const handleSave = () => {
    if (saved) return;
    saveRecipe(payload());
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
        body: JSON.stringify(payload()),
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

  return (
    <article className="dish">
      {/* Real media — real photo of the real dish + verified video */}
      <RecipeMedia
        dishName={dishName}
        title={data.title}
        youtubeVideoId={youtubeVideoId}
        media={media}
        loading={mediaLoading}
      />

      {/* Head: title · description · meta strip */}
      <header className="dish__head">
        <h1 className="dish__title">{data.title}</h1>
        {structured?.description && <p className="dish__desc">{structured.description}</p>}
        <div className="dish__meta">
          {structured?.cuisine && <span>{structured.cuisine}</span>}
          {structured?.difficulty && <span>{structured.difficulty}</span>}
          {totalTime != null && <span>{totalTime} min total</span>}
          {data.nutrition?.calories > 0 && (
            <span className="hot">{data.nutrition.calories} cal / serving</span>
          )}
          <ServingAdjuster
            servings={servings}
            baseServings={baseServings}
            onServingsChange={setServings}
          />
        </div>
      </header>

      {structured ? (
        <>
          {/* Ingredients — with REAL scaling */}
          <section aria-labelledby="ing-title">
            <h2 id="ing-title" className="dish__section-title">
              Ingredients
              {isScaled && (
                <span className="mono">scaled ×{formatAmount(scaleFactor)}</span>
              )}
            </h2>
            <ul className="ing-grid">
              {structured.ingredients.map((ing, index) => {
                const line = ingredientLine(ing, scaleFactor);
                const checked = checkedIngredients.has(index);
                return (
                  <li key={`${ing.name}-${index}`}>
                    <button
                      onClick={() =>
                        cookMode && toggleItem(checkedIngredients, setCheckedIngredients, index)
                      }
                      className={`ing${cookMode ? "" : " ing--static"}`}
                      aria-pressed={cookMode ? checked : undefined}
                    >
                      {cookMode && (
                        <span className="box" aria-hidden="true">
                          ✓
                        </span>
                      )}
                      <span className="label">{line}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {isScaled && (
              <p className="hint">
                Amounts auto-scaled from the base recipe of {baseServings} servings. Spices
                scale non-linearly — taste and adjust.
              </p>
            )}
          </section>

          {/* Instructions — numbered, tappable in cook mode */}
          <section aria-labelledby="steps-title">
            <h2 id="steps-title" className="dish__section-title">
              Instructions
              {cookMode && doneSteps.size > 0 && (
                <span className="mono">
                  {doneSteps.size}/{structured.instructions.length} done
                </span>
              )}
            </h2>
            <ol className="steps">
              {structured.instructions.map((step, index) => {
                const done = doneSteps.has(index);
                return (
                  <li key={index}>
                    <button
                      onClick={() => cookMode && toggleItem(doneSteps, setDoneSteps, index)}
                      className="step"
                      aria-pressed={cookMode ? done : undefined}
                    >
                      <span className="step__num" aria-hidden="true">
                        {done ? "✓" : String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="step__text">{step}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Tips */}
          {structured.tips?.length > 0 && (
            <section aria-labelledby="tips-title">
              <h2 id="tips-title" className="dish__section-title">
                Chef&apos;s tips
              </h2>
              <ul className="tips">
                {structured.tips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : (
        /* Legacy markdown fallback (non-structured recipes) */
        <div className="md">
          <ReactMarkdown
            components={{
              h1: ({ node, ...props }) => <h1 {...props} />,
              h2: ({ node, ...props }) => <h2 {...props} />,
              p: ({ node, ...props }) => <p {...props} />,
              ul: ({ node, ...props }) => <ul {...props} />,
              ol: ({ node, ...props }) => <ol {...props} />,
              li: ({ node, ...props }) => <li {...props} />,
              strong: ({ node, ...props }) => <strong {...props} />,
            }}
          >
            {markdown}
          </ReactMarkdown>
        </div>
      )}

      {data.nutrition && (
        <section aria-labelledby="nut-title">
          <h2 id="nut-title" className="dish__section-title">
            Nutrition per serving
          </h2>
          <div className="facts">
            {[
              ["Calories", data.nutrition.calories, ""],
              ["Protein", data.nutrition.protein, "g"],
              ["Carbs", data.nutrition.carbs, "g"],
              ["Fat", data.nutrition.fat, "g"],
            ].map(([label, value, unit]) => (
              <div className="fact" key={label}>
                <span className="fact__value">
                  {value}
                  {unit && <small> {unit}</small>}
                </span>
                <span className="fact__label">{label}</span>
              </div>
            ))}
          </div>
          <p className="hint">Estimated per serving — unaffected by serving scaling.</p>
        </section>
      )}

      {/* Action bar */}
      <div className="action-bar">
        <span className="mono">Real dish · real photo · verified video</span>
        <div className="action-bar__group">
          {structured && (
            <button
              onClick={() => setCookMode((v) => !v)}
              className={`btn${cookMode ? " btn--active" : ""}`}
              data-fill
              aria-pressed={cookMode}
            >
              <span className="fill" aria-hidden="true" />
              <ListChecks size={14} />
              {cookMode ? "Cook mode on" : "Cook mode"}
            </button>
          )}
          {cookMode && (doneSteps.size > 0 || checkedIngredients.size > 0) && (
            <button
              onClick={resetCookMode}
              className="icon-btn"
              title="Reset progress"
              aria-label="Reset cook mode progress"
            >
              <RotateCcw size={16} />
            </button>
          )}
          <button onClick={handleCopyRecipe} className="btn btn--ghost" data-fill>
            <span className="fill" aria-hidden="true" />
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button onClick={handleShare} disabled={sharing} className="btn btn--ghost" data-fill>
            <span className="fill" aria-hidden="true" />
            {shared ? <Link2 size={14} /> : <Share2 size={14} />}
            {shared ? "Link copied" : sharing ? "Sharing…" : "Share"}
          </button>
          <button
            onClick={handleSave}
            disabled={saved}
            className="btn"
            data-fill
            style={saved ? { borderColor: "var(--c-leaf)", color: "var(--c-leaf)" } : undefined}
          >
            <span className="fill" aria-hidden="true" />
            {saved ? <Check size={14} /> : <Bookmark size={14} />}
            {saved ? "Saved" : "Save recipe"}
          </button>
        </div>
      </div>

      {shareError && (
        <p role="alert" className="hint" style={{ color: "var(--c-danger)" }}>
          {shareError}
        </p>
      )}
    </article>
  );
}
