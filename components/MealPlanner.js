'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRecipes } from '@/context/RecipeContext';
import { Calendar, Plus, X, ChefHat, Trash2 } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_COLORS = {
  breakfast: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700',
  lunch: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  dinner: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
  snack: 'bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-700',
};

export default function MealPlanner() {
  const { savedRecipes, mealPlan, addToMealPlan, removeFromMealPlan, mounted } = useRecipes();
  const [pickerSlot, setPickerSlot] = useState(null); // { day, meal, replacing }
  const [confirmClear, setConfirmClear] = useState(false);

  const closePicker = useCallback(() => setPickerSlot(null), []);

  // Escape closes modals — basic keyboard accessibility.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        closePicker();
        setConfirmClear(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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
    <div className="w-full max-w-5xl mx-auto mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Weekly Meal Plan</h2>
        <div className="flex items-center gap-2">
          {totalCalories > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
              ~{totalCalories.toLocaleString()} cal/week
            </div>
          )}
          {mealPlan.length > 0 && (
            <button
              onClick={() => setConfirmClear(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Trash2 size={14} />
              Clear week
            </button>
          )}
        </div>
      </div>

      {savedRecipes.length === 0 ? (
        <div className="text-center py-16">
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full inline-block mb-4">
            <Calendar className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            No recipes to plan with
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Save some recipes first, then come back to plan your meals.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
          {/* grid-cols-5 = day label column + 4 meal columns (was cols-8 → misaligned) */}
          <div className="grid grid-cols-5 gap-2 min-w-[680px]">
            <div className="p-2"></div>
            {MEALS.map((meal) => (
              <div
                key={meal}
                className="p-2 text-center font-semibold text-gray-600 dark:text-gray-300 capitalize text-sm"
              >
                {meal}
              </div>
            ))}

            {DAYS.map((day) => (
              <div key={day} className="contents">
                <div className="p-2 font-semibold text-gray-700 dark:text-gray-200 text-sm flex items-center">
                  {day.slice(0, 3)}
                </div>
                {MEALS.map((meal) => {
                  const entry = getMealForSlot(day, meal);
                  return (
                    <div
                      key={`${day}-${meal}`}
                      className={`p-2 min-h-[80px] rounded-lg border-2 transition-all ${
                        entry
                          ? `${MEAL_COLORS[meal]} border-solid cursor-pointer hover:shadow-md`
                          : 'border-dashed border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600 cursor-pointer'
                      }`}
                      onClick={() => handleSlotClick(day, meal)}
                      role="button"
                      tabIndex={0}
                      aria-label={`${day} ${meal}: ${entry?.recipe?.title || 'empty'}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
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
                            className="absolute -top-1.5 -right-1.5 p-0.5 bg-white dark:bg-gray-800 rounded-full shadow-sm hover:bg-red-50 dark:hover:bg-red-900 transition-colors z-10"
                            aria-label={`Remove ${entry.recipe?.title || 'recipe'} from ${day} ${meal}`}
                          >
                            <X size={12} className="text-red-500" />
                          </button>
                          <div className="text-xs font-medium truncate pr-4">
                            {entry.recipe?.title || 'Recipe'}
                          </div>
                          {entry.recipe?.nutrition?.calories > 0 && (
                            <div className="text-[10px] opacity-75 mt-1">
                              {entry.recipe.nutrition.calories} cal
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <Plus size={16} className="text-gray-300 dark:text-gray-600" />
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
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={closePicker}
          role="dialog"
          aria-modal="true"
          aria-label={`Select a recipe for ${pickerSlot.day} ${pickerSlot.meal}`}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  {pickerSlot.replacing ? 'Replace Recipe' : 'Select Recipe'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                  {pickerSlot.day} — {pickerSlot.meal}
                  {pickerSlot.replacing ? ' (current meal will be replaced)' : ''}
                </p>
              </div>
              <button
                onClick={closePicker}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Close picker"
              >
                <X size={20} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-2">
              {savedRecipes.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => handleSelectRecipe(recipe)}
                  className="w-full text-left p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 dark:bg-emerald-900/40 p-2 rounded-lg">
                      <ChefHat size={18} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {recipe.title}
                      </div>
                      {recipe.nutrition?.calories > 0 && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {recipe.nutrition.calories} cal
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Clear-week confirmation */}
      {confirmClear && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setConfirmClear(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Confirm clearing the meal plan"
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-gray-900 dark:text-white mb-2">Clear the whole week?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              This removes all {mealPlan.length} planned meals. Saved recipes are not affected.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmClear(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearWeek}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
