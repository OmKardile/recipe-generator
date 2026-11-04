"use client";

import { useState, useEffect, useCallback } from "react";
import { useRecipes } from "@/context/RecipeContext";
import { Plus, X, Trash2 } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEALS = ["breakfast", "lunch", "dinner", "snack"];

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

  const handleClearWeek = async () => {
    setConfirmClear(false);
    // Remove one slot at a time, awaiting each response: firing all deletes
    // concurrently let out-of-order responses race and leave stale meals in
    // client state even though the server was already empty.
    for (const entry of [...mealPlan]) {
      await removeFromMealPlan(entry.day, entry.meal);
    }
  };

  const totalCalories = mealPlan.reduce(
    (sum, entry) => sum + (entry.recipe?.nutrition?.calories || 0),
    0
  );

  return (
    <div className="in">
      <div className="section-head">
        <h2 className="section-title">Weekly meal plan</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--u)" }}>
          {totalCalories > 0 && (
            <span className="mono">~{totalCalories.toLocaleString()} cal / week</span>
          )}
          {mealPlan.length > 0 && (
            <button
              onClick={() => setConfirmClear(true)}
              className="btn btn--danger"
              data-fill
              style={{ padding: "0.5em 0.9em" }}
            >
              <span className="fill" aria-hidden="true" />
              <Trash2 size={13} />
              Clear week
            </button>
          )}
        </div>
      </div>

      {savedRecipes.length === 0 ? (
        <div className="empty">
          <p className="empty__title">Nothing to plan with yet</p>
          <p>Save some recipes first, then come back to plan your week.</p>
        </div>
      ) : (
        <div className="week">
          <div className="week__grid">
            <div />
            {MEALS.map((meal) => (
              <div key={meal} className="week__col">
                {meal}
              </div>
            ))}

            {DAYS.map((day) => (
              <div key={day} style={{ contents: "contents" }} className="week__row">
                <div className="week__day">{day.slice(0, 3)}</div>
                {MEALS.map((meal) => {
                  const entry = getMealForSlot(day, meal);
                  return (
                    <div
                      key={`${day}-${meal}`}
                      className={`slot${entry ? " slot--filled" : ""}`}
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
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromMealPlan(day, meal);
                            }}
                            className="slot__x"
                            aria-label={`Remove ${entry.recipe?.title || "recipe"} from ${day} ${meal}`}
                          >
                            <X size={12} />
                          </button>
                          <div className="slot__title">{entry.recipe?.title || "Recipe"}</div>
                          {entry.recipe?.nutrition?.calories > 0 && (
                            <div className="slot__cal">
                              {entry.recipe.nutrition.calories} cal
                            </div>
                          )}
                        </>
                      ) : (
                        <Plus size={16} className="slot__plus" aria-hidden />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recipe picker */}
      {pickerSlot && (
        <div
          className="overlay in"
          onClick={closePicker}
          role="dialog"
          aria-modal="true"
          aria-label={`Select a recipe for ${pickerSlot.day} ${pickerSlot.meal}`}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__head">
              <div>
                <h3 className="modal__title">
                  {pickerSlot.replacing ? "Replace recipe" : "Select recipe"}
                </h3>
                <p className="modal__sub">
                  {pickerSlot.day} · {pickerSlot.meal}
                  {pickerSlot.replacing ? " (current meal will be replaced)" : ""}
                </p>
              </div>
              <button onClick={closePicker} className="icon-btn" aria-label="Close picker">
                <X size={18} />
              </button>
            </div>
            <div className="modal__body">
              {savedRecipes.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => handleSelectRecipe(recipe)}
                  className="pick"
                >
                  <span className="pick__title">{recipe.title}</span>
                  {recipe.nutrition?.calories > 0 && (
                    <span className="pick__cal">{recipe.nutrition.calories} cal</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Clear-week confirmation */}
      {confirmClear && (
        <div
          className="overlay in"
          onClick={() => setConfirmClear(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Confirm clearing the meal plan"
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__head">
              <div>
                <h3 className="modal__title">Clear the whole week?</h3>
                <p className="modal__sub">
                  Removes all {mealPlan.length} planned meals. Saved recipes are not affected.
                </p>
              </div>
            </div>
            <div className="modal__body" style={{ display: "flex", gap: "0.6rem" }}>
              <button onClick={() => setConfirmClear(false)} className="btn btn--ghost">
                Cancel
              </button>
              <button onClick={handleClearWeek} className="btn btn--danger" data-fill>
                <span className="fill" aria-hidden="true" />
                Clear week
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
