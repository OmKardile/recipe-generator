"use client";

import { Clock, Users, Flame } from "lucide-react";
import MediaImage from "./MediaImage";
import useRecipeMedia from "@/hooks/useRecipeMedia";
import { youtubeThumbnailSources } from "@/lib/video";

const ROLE_META = ["Quick & easy", "Classic comfort", "Weekend showstopper"];

function fallbackPreview(recipeText) {
  if (!recipeText) return "A delicious recipe.";
  const lines = recipeText.split("\n");
  let description = "";
  let started = false;
  for (const line of lines) {
    if (line.startsWith("##")) {
      if (started) break;
      started = true;
      continue;
    }
    if (started && line.trim() && !line.startsWith("#")) {
      description += line.trim() + " ";
      if (description.length > 120) break;
    }
  }
  return description.trim() || "A delicious recipe.";
}

function RecipeRow({ recipe, index, isSelected, onSelect }) {
  const totalTime = recipe.totalTimeMinutes;
  const role = ROLE_META[index] || ROLE_META[1];

  // Real photo of the real dish (Wikipedia → TheMealDB → video still).
  const { media, loading } = useRecipeMedia({
    dishName: recipe.dishName,
    title: recipe.title,
    youtubeVideoId: recipe.youtubeVideoId,
  });
  const thumbSources = [
    ...(media?.url ? [media.url] : []),
    ...youtubeThumbnailSources(recipe.youtubeVideoId),
  ];

  return (
    <li>
      <button
        onClick={() => onSelect(index)}
        aria-pressed={isSelected}
        data-preview={thumbSources[0] || ""}
        className="index-row"
      >
        {/* The real photo rides IN the row — the picture is the point of
            the app, so it is never hidden behind a hover. The numeral
            badges the thumb's corner like a sticker. */}
        <span className="index-row__thumb">
          {loading ? (
            <span
              className="skel"
              role="status"
              aria-label="Finding a real photo"
            />
          ) : (
            <MediaImage
              key={`${recipe.id}-${thumbSources[0] || "none"}`}
              sources={thumbSources}
              alt={`Real photo of ${recipe.dishName || recipe.title}`}
            />
          )}
          <span className="index-row__num">{String(index + 1).padStart(2, "0")}</span>
        </span>
        <span className="index-row__main">
          <span className="index-row__title">{recipe.title}</span>
          <span className="index-row__meta">
            <span>{role}</span>
            {recipe.cuisine && <span>{recipe.cuisine}</span>}
            {recipe.difficulty && <span>{recipe.difficulty}</span>}
            {totalTime != null && (
              <span>
                <Clock size={11} aria-hidden /> {totalTime} min
              </span>
            )}
            {recipe.servings != null && (
              <span>
                <Users size={11} aria-hidden /> {recipe.servings}
              </span>
            )}
            {recipe.nutrition?.calories > 0 && (
              <span className="hot">
                <Flame size={11} aria-hidden /> {recipe.nutrition.calories} cal
              </span>
            )}
          </span>
        </span>
        <span className="index-row__arrow" aria-hidden>
          →
        </span>
      </button>
    </li>
  );
}

export default function RecipeSelector({ recipes, onSelect, selectedIndex }) {
  if (!recipes || recipes.length === 0) return null;

  return (
    <div style={{ marginTop: "calc(var(--u) * 5)" }}>
      <div className="section-head in">
        <h2 className="section-title">Three for tonight</h2>
        <span className="mono">Pick one to cook</span>
      </div>
      <ul className="index in" style={{ animationDelay: "0.08s" }}>
        {recipes.map((recipe, index) => (
          <RecipeRow
            key={recipe.id ?? index}
            recipe={recipe}
            index={index}
            isSelected={selectedIndex === index}
            onSelect={onSelect}
          />
        ))}
      </ul>
      <p className="hint in" style={{ marginTop: "var(--u)", animationDelay: "0.12s" }}>
        Chef-crafted for your ingredients — real dishes, real photos.
      </p>
    </div>
  );
}
