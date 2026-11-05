"use client";

import { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import Garnish from "./Garnish";

const MAX_INGREDIENTS = 25;
const MAX_INGREDIENT_LENGTH = 40;

const QUICK_SUGGESTIONS = [
  "Onion",
  "Tomato",
  "Ginger",
  "Garlic",
  "Potato",
  "Paneer",
  "Chicken",
  "Rice",
  "Toor dal",
  "Spinach",
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
      if (next.length >= MAX_INGREDIENTS) {
        skipped++;
        continue;
      }
      const key = part.toLowerCase();
      if (existing.has(key)) {
        skipped++; // duplicate guard
        continue;
      }
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
    <section className="hero" aria-labelledby="hero-title">
      {/* The magnet field: colorful stickers scattered around (and over)
          the paper's edges — the page's visual headline. Decorative. */}
      <Garnish variant="hero" />

      <div className="hero__paper in" style={{ animationDelay: "0.02s" }}>
        <h1 className="hero__title in" id="hero-title">
          What&apos;s in your <span className="accent">kitchen?</span>
        </h1>
        <p className="hero__lede in" style={{ animationDelay: "0.08s" }}>
          Add what you have. Get three real, chef-crafted Indian dishes — with real photos,
          verified videos and a plan for the week.
        </p>

        <form onSubmit={handleAddIngredient} className="field-row in" style={{ animationDelay: "0.14s" }}>
        <div className="field">
          <label className="field__label" htmlFor="ingredient-input">
            Ingredients
          </label>
          <input
            id="ingredient-input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="e.g. chicken, rice, tomatoes"
            disabled={isLoading}
            aria-label="Add ingredient"
            autoComplete="off"
          />
        </div>
        <button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          className="sq-btn"
          aria-label="Add ingredient"
        >
          <Plus size={20} />
        </button>
      </form>

      {notice && (
        <p className="hint in" role="status">
          {notice}
        </p>
      )}

      {ingredients.length === 0 ? (
        <div className="chips in" style={{ animationDelay: "0.2s" }}>
          {QUICK_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => addFromText(suggestion)}
              disabled={isLoading}
              className="chip chip--add"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : (
        <div className="chips in" style={{ animationDelay: "0.18s" }}>
          {ingredients.map((ing, index) => (
            <span key={`${ing}-${index}`} className="chip chip--filled">
              {ing}
              <button
                onClick={() => removeIngredient(index)}
                disabled={isLoading}
                aria-label={`Remove ${ing}`}
                className="x"
              >
                <X size={13} />
              </button>
            </span>
          ))}
          <span className="mono" style={{ color: "var(--c-muted)" }}>
            {ingredients.length}/{MAX_INGREDIENTS}
          </span>
        </div>
      )}

      <div className="field in" style={{ animationDelay: "0.24s" }}>
        <label className="field__label" htmlFor="preferences">
          Preferences · restrictions (optional)
        </label>
        <textarea
          id="preferences"
          value={preferences}
          onChange={(e) => setPreferences(e.target.value)}
          onKeyDown={handlePreferencesKeyDown}
          placeholder="e.g. vegan, gluten-free, spicy, under 30 minutes, Jain…"
          disabled={isLoading}
          rows={2}
        />
        <p className="hint" style={{ marginTop: "0.55em" }}>
          Ctrl + Enter generates from here.
        </p>
      </div>

      <div className="switch-row in" style={{ animationDelay: "0.28s" }}>
        <button
          type="button"
          role="switch"
          aria-checked={includeNutrition}
          onClick={() => setIncludeNutrition(!includeNutrition)}
          disabled={isLoading}
          className="switch"
          aria-label="Include nutrition information"
        />
        <span>Include nutrition info (slightly slower)</span>
      </div>

      <button
        onClick={onSubmit}
        disabled={!canSubmit}
        className="btn btn--primary in"
        data-fill
        style={{ animationDelay: "0.32s" }}
      >
        <span className="fill" aria-hidden="true" />
        {isLoading ? (
          <>
            <Loader2 size={18} className="spin" />
            Cooking up ideas
          </>
        ) : (
          "Generate three dishes"
        )}
      </button>
      </div>
    </section>
  );
}
