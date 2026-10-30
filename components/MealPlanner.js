"use client";

import { useState, useEffect, useCallback } from "react";
import { useRecipes } from "@/context/RecipeContext";
import {
  PiCalendarFill,
  PiPlus,
  PiX,
  PiTrashSimpleFill,
  PiFireFill,
} from "react-icons/pi";
import { GiChefToque } from "react-icons/gi";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEALS = ["breakfast", "lunch", "dinner", "snack"];

const MEAL_COLORS = {
  breakfast: "bg-saffron/15 text-saffron-deep border-saffron/40 dark:bg-saffron/10 dark:text-saffron dark:border-saffron/30",
  lunch: "bg-zest/20 text-herb-800 border-zest-deep/50 dark:bg-zest/10 dark:text-zest dark:border-zest/25",
  dinner: "bg-herb-100 text-herb-800 border-herb-300 dark:bg-herb-900/60 dark:text-herb-200 dark:border-herb-700",
  snack: "bg-chili/10 text-chili border-chili/30 dark:bg-chili/15 dark:text-chili dark:border-chili/40",
};

const MEAL_DOTS = {
  breakfast: "bg-saffron",
  lunch: "bg-zest-deep",
  dinner: "bg-herb-500",
  snack: "bg-chili",
};

export default function MealPlanner() {
  const { savedRecipes, mealPlan, addToMealPlan, removeFromMealPlan, mounted } = useRecipes();
  const [pickerSlot, setPickerSlot] = useState(null); // { day, meal, replacing }
  const [confirmClear, setConfirmClear] = useState(false);

  const closePicker = useCallback(() => setPickerSlot(null), []);

  // Escape closes modals — basic keyboard accessibility.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        closePicker();
        setConfirmClear(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePicker]);

  if (!mounted) return null;

  const getMealForSlot = (day, meal) =>
    mealPlan.find((p) => p.day === day && p.meal === meal);

  const handleSlotClick = (day, meal) => {
    const existing = getMealForSlot(day, meal);
    setPickerSlot({ day, meal, replacing: Boolean(existing) });
  };

  const handleSelectRecipe = (recipe) => {
    if (!pickerSlot) return;
    addToMealPlan(pickerSlot.day, pickerSlot.meal, recipe);
    closePicker();
  };

  const handleClearWeek = () => {
    mealPlan.forEach((entry) => removeFromMealPlan(entry.day, entry.meal));
    setConfirmClear(false);
  };

  const totalCalories = mealPlan.reduce(
    (sum, entry) => sum + (entry.recipe?.nutrition?.calories || 0),
    0
  );

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-8 text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-herb-600 dark:text-herb-400">
          The week ahead
        </p>
        <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Weekly <span className="display-accent text-herb-600 dark:text-herb-300">meal plan</span>
        </h2>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {totalCalories > 0 && (
          <div className="flex items-center gap-2 rounded-full border border-line bg-elev px-4 py-2 text-sm font-semibold text-body shadow-card">
            <PiFireFill size={14} className="text-herb-600 dark:text-herb-400" aria-hidden />
            ~{totalCalories.toLocaleString()} kcal planned
          </div>
        )}
        {mealPlan.length > 0 && (
          <button
            onClick={() => setConfirmClear(true)}
            className="flex items-center gap-1.5 rounded-full border border-line bg-elev px-4 py-2 text-sm font-semibold text-body transition-colors hover:border-chili/50 hover:text-chili"
          >
            <PiTrashSimpleFill size={13} aria-hidden />
            Clear week
          </button>
        )}
      </div>

      {savedRecipes.length === 0 ? (
        <div className="py-20 text-center">
          <div className="mx-auto mb-5 grid h-20 w-20 animate-float place-items-center rounded-3xl border border-line bg-elev shadow-card">
            <PiCalendarFill className="text-3xl text-herb-400" aria-hidden />
          </div>
          <h3 className="mb-2 font-display text-2xl font-semibold">No recipes to plan with</h3>
          <p className="text-body">
            Save some recipes first, then come back to plan your meals.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
          {/* grid-cols-5 = day label column + 4 meal columns */}
          <div className="grid min-w-[680px] grid-cols-5 gap-2">
            <div className="p-2" />
            {MEALS.map((meal) => (
              <div
                key={meal}
                className="flex items-center justify-center gap-1.5 p-2 text-center text-xs font-bold uppercase tracking-[0.14em] text-body"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${MEAL_DOTS[meal]}`} aria-hidden />
                {meal}
              </div>
            ))}

            {DAYS.map((day, dayIndex) => (
              <div key={day} className="contents">
                <div className="flex items-center p-2 font-display text-sm font-semibold text-ink">
                  {day.slice(0, 3)}
                </div>
                {MEALS.map((meal) => {
                  const entry = getMealForSlot(day, meal);
                  return (
                    <div
                      key={`${day}-${meal}`}
                      style={{ animationDelay: `${(dayIndex * 4) * 30}ms` }}
                      className={`animate-fade-in group min-h-[80px] cursor-pointer rounded-2xl border-2 p-2 transition-all ${
                        entry
                          ? `${MEAL_COLORS[meal]} border-solid hover:shadow-card`
                          : "border-dashed border-line hover:border-herb-400 hover:bg-herb-50/50 dark:hover:border-herb-700 dark:hover:bg-herb-900/20"
                      }`}
                      onClick={() => handleSlotClick(day, meal)}
                      role="button"
                      tabIndex={0}
                      aria-label={`${day} ${meal}: ${entry?.recipe?.title || "empty"}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSlotClick(day, meal);
                        }
                      }}
                    >
                      {entry ? (
                        <div className="relative h-full">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromMealPlan(day, meal);
                            }}
                            className="absolute -right-1.5 -top-1.5 z-10 grid h-5 w-5 place-items-center rounded-full border border-line bg-elev text-body opacity-0 shadow-card transition-all hover:bg-chili hover:text-white group-hover:opacity-100"
                            aria-label={`Remove ${entry.recipe?.title || "recipe"} from ${day} ${meal}`}
                          >
                            <PiX size={10} aria-hidden />
                          </button>
                          <div className="pr-3 text-xs font-semibold leading-snug">
                            {entry.recipe?.title || "Recipe"}
                          </div>
                          {entry.recipe?.nutrition?.calories > 0 && (
                            <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold opacity-75">
                              <PiFireFill size={9} aria-hidden />
                              {entry.recipe.nutrition.calories} cal
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <PiPlus
                            size={15}
                            className="text-body/40 transition-all duration-300 group-hover:scale-125 group-hover:text-herb-500"
                            aria-hidden
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recipe Picker Modal */}
      {pickerSlot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-herb-950/60 p-4 backdrop-blur-sm animate-fade-in"
          onClick={closePicker}
          role="dialog"
          aria-modal="true"
          aria-label={`Select a recipe for ${pickerSlot.day} ${pickerSlot.meal}`}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-3xl border border-line bg-elev shadow-lift animate-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line p-5">
              <div>
                <h3 className="font-display text-lg font-semibold">
                  {pickerSlot.replacing ? "Replace recipe" : "Select recipe"}
                </h3>
                <p className="text-sm capitalize text-body">
                  {pickerSlot.day} — {pickerSlot.meal}
                  {pickerSlot.replacing ? " (current meal will be replaced)" : ""}
                </p>
              </div>
              <button
                onClick={closePicker}
                className="grid h-9 w-9 place-items-center rounded-xl text-body transition-colors hover:bg-herb-100 hover:text-herb-700 dark:hover:bg-herb-900 dark:hover:text-herb-300"
                aria-label="Close picker"
              >
                <PiX size={18} aria-hidden />
              </button>
            </div>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto p-4">
              {savedRecipes.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => handleSelectRecipe(recipe)}
                  className="tilt-card flex w-full items-center gap-3 rounded-2xl border border-line bg-elev p-3 text-left transition-all hover:border-herb-400 hover:shadow-card"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-herb-100 text-herb-600 dark:bg-herb-900/70 dark:text-herb-300">
                    <GiChefToque size={20} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">
                      {recipe.title}
                    </span>
                    {recipe.nutrition?.calories > 0 && (
                      <span className="block text-sm text-body">
                        {recipe.nutrition.calories} cal
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Clear-week confirmation */}
      {confirmClear && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-herb-950/60 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setConfirmClear(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Confirm clearing the meal plan"
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-line bg-elev p-6 text-center shadow-lift animate-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 font-display text-xl font-semibold">Clear the whole week?</h3>
            <p className="mb-6 text-sm text-body">
              This removes all {mealPlan.length} planned meals. Saved recipes are not affected.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmClear(false)}
                className="flex-1 rounded-full border border-line py-2.5 text-sm font-semibold text-body transition-colors hover:bg-herb-100/50 dark:hover:bg-herb-900/40"
              >
                Cancel
              </button>
              <button
                onClick={handleClearWeek}
                className="flex-1 rounded-full bg-chili py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-95"
              >
                Clear week
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
