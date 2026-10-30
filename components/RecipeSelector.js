"use client";

import {
  PiClockFill,
  PiUsersThreeFill,
  PiFireFill,
  PiCheckFill,
  PiMapPinFill,
  PiBowlFoodFill,
  PiHeartFill,
} from "react-icons/pi";
import { GiChefToque } from "react-icons/gi";

const DIFFICULTY_STYLES = {
  Easy: "bg-herb-100 text-herb-700 dark:bg-herb-900/60 dark:text-herb-300",
  Medium: "bg-saffron/15 text-saffron-deep dark:bg-saffron/10 dark:text-saffron",
  Hard: "bg-chili/10 text-chili dark:bg-chili/15",
};

const ROLE_META = [
  {
    Icon: PiBowlFoodFill,
    label: "Speed run · under 30 min",
    tile: "from-herb-400 to-herb-600",
    ribbon: "from-herb-400/70 to-herb-600/70",
  },
  {
    Icon: PiHeartFill,
    label: "Classic comfort",
    tile: "from-zest-deep to-herb-500",
    ribbon: "from-zest-deep/60 to-herb-500/70",
  },
  {
    Icon: GiChefToque,
    label: "Weekend showstopper",
    tile: "from-saffron to-chili",
    ribbon: "from-saffron/60 to-chili/70",
  },
];

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

export default function RecipeSelector({ recipes, onSelect, selectedIndex }) {
  if (!recipes || recipes.length === 0) return null;

  return (
    <div className="mt-12">
      <div className="mb-7 text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-herb-600 dark:text-herb-400">
          The tasting menu
        </p>
        <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Choose your <span className="display-accent text-herb-600 dark:text-herb-300">adventure</span>
        </h2>
        <p className="mt-2 text-sm text-body">
          {recipes.length} chef-crafted options for your ingredients
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {recipes.map((recipe, index) => {
          const isSelected = selectedIndex === index;
          const preview = recipe.description || fallbackPreview(recipe.recipe);
          const totalTime = recipe.totalTimeMinutes;
          const role = ROLE_META[index] || ROLE_META[1];

          return (
            <button
              key={recipe.id ?? index}
              onClick={() => onSelect(index)}
              aria-pressed={isSelected}
              style={{ animationDelay: `${index * 120}ms` }}
              className={`tilt-card animate-fade-up group relative overflow-hidden rounded-3xl border p-6 text-left shadow-card ${
                isSelected
                  ? "border-herb-500 shadow-glow ring-2 ring-herb-500/30"
                  : "border-line bg-elev hover:border-herb-300 hover:shadow-lift dark:hover:border-herb-700"
              }`}
            >
              {/* Role ribbon */}
              <span
                aria-hidden
                className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${role.ribbon}`}
              />

              <div className="mb-4 flex items-start justify-between">
                <span
                  className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-card transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110 ${role.tile}`}
                >
                  <role.Icon size={22} aria-hidden />
                </span>
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full transition-all duration-300 ${
                    isSelected
                      ? "scale-100 bg-herb-600 text-white"
                      : "scale-0 bg-transparent text-transparent"
                  }`}
                  aria-hidden
                >
                  <PiCheckFill size={14} />
                </span>
              </div>

              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-herb-600 dark:text-herb-400">
                <role.Icon size={12} aria-hidden />
                {role.label}
              </div>

              <h3 className="mb-2 line-clamp-2 font-display text-xl font-semibold leading-snug">
                {recipe.title}
              </h3>

              <p className="mb-5 line-clamp-2 text-sm leading-relaxed text-body">
                {preview}
              </p>

              <div className="flex flex-wrap items-center gap-2 text-xs text-body">
                {recipe.cuisine && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-herb-200/70 bg-herb-100/60 px-2.5 py-1 font-semibold text-herb-700 dark:border-herb-800 dark:bg-herb-900/50 dark:text-herb-300">
                    <PiMapPinFill size={10} aria-hidden />
                    {recipe.cuisine}
                  </span>
                )}
                {recipe.difficulty && (
                  <span className={`rounded-full px-2.5 py-1 font-semibold ${DIFFICULTY_STYLES[recipe.difficulty] || DIFFICULTY_STYLES.Medium}`}>
                    {recipe.difficulty}
                  </span>
                )}
                {totalTime != null && (
                  <span className="inline-flex items-center gap-1">
                    <PiClockFill size={11} aria-hidden />
                    {totalTime} min
                  </span>
                )}
                {recipe.servings != null && (
                  <span className="inline-flex items-center gap-1">
                    <PiUsersThreeFill size={11} aria-hidden />
                    {recipe.servings}
                  </span>
                )}
                {recipe.nutrition?.calories > 0 && (
                  <span className="inline-flex items-center gap-1 font-semibold text-herb-600 dark:text-herb-400">
                    <PiFireFill size={11} aria-hidden />
                    {recipe.nutrition.calories} cal
                  </span>
                )}
              </div>

              {/* "Select" affordance slides up on hover */}
              <span className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center gap-1.5 bg-gradient-to-t from-herb-600 to-herb-500 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-white transition-transform duration-300 group-hover:translate-y-0">
                View recipe
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
