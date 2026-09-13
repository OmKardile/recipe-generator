'use client';

import { useState } from 'react';
import { useRecipes } from '@/context/RecipeContext';
import { Calendar, Plus, X, ChefHat } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_COLORS = {
  breakfast: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  lunch: 'bg-blue-100 text-blue-800 border-blue-200',
  dinner: 'bg-purple-100 text-purple-800 border-purple-200',
  snack: 'bg-pink-100 text-pink-800 border-pink-200',
};

export default function MealPlanner() {
  const { savedRecipes, mealPlan, addToMealPlan, removeFromMealPlan, mounted } = useRecipes();
  const [showSelector, setShowSelector] = useState(null);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [selectedMeal, setSelectedMeal] = useState('dinner');

  if (!mounted) return null;

  const getMealForSlot = (day, meal) => {
    return mealPlan.find((p) => p.day === day && p.meal === meal);
  };

  const handleAddToSlot = (day, meal) => {
    setSelectedDay(day);
    setSelectedMeal(meal);
    setShowSelector('picker');
  };

  const handleSelectRecipe = (recipe) => {
    addToMealPlan(selectedDay, selectedMeal, recipe);
    setShowSelector(null);
  };

  const handleRemoveFromSlot = (day, meal) => {
    removeFromMealPlan(day, meal);
  };

  const totalCalories = mealPlan.reduce((sum, entry) => {
    return sum + (entry.recipe?.nutrition?.calories || 0);
  }, 0);

  return (
    <div className="w-full max-w-5xl mx-auto mt-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Weekly Meal Plan</h2>
        {totalCalories > 0 && (
          <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            ~{totalCalories.toLocaleString()} cal/week
          </div>
        )}
      </div>

      {savedRecipes.length === 0 ? (
        <div className="text-center py-16">
          <div className="bg-gray-100 p-4 rounded-full inline-block mb-4">
            <Calendar className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No recipes to plan with</h3>
          <p className="text-gray-500">
            Save some recipes first, then come back to plan your meals.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid grid-cols-8 gap-2 min-w-[800px]">
            {/* Header */}
            <div className="p-2"></div>
            {MEALS.map((meal) => (
              <div key={meal} className="p-2 text-center font-semibold text-gray-600 capitalize text-sm">
                {meal}
              </div>
            ))}

            {/* Days */}
            {DAYS.map((day) => (
              <div key={day} className="contents">
                <div className="p-2 font-semibold text-gray-700 text-sm flex items-center">
                  {day.slice(0, 3)}
                </div>
                {MEALS.map((meal) => {
                  const entry = getMealForSlot(day, meal);
                  return (
                    <div
                      key={`${day}-${meal}`}
                      className={`p-2 min-h-[80px] rounded-lg border-2 border-dashed transition-colors ${
                        entry
                          ? MEAL_COLORS[meal]
                          : 'border-gray-200 hover:border-blue-300 cursor-pointer'
                      }`}
                      onClick={() => {
                        if (!entry) handleAddToSlot(day, meal);
                      }}
                    >
                      {entry ? (
                        <div className="relative h-full">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFromSlot(day, meal);
                            }}
                            className="absolute -top-1 -right-1 p-0.5 bg-white rounded-full shadow-sm hover:bg-red-50 transition-colors"
                          >
                            <X size={12} className="text-red-500" />
                          </button>
                          <div className="text-xs font-medium truncate pr-4">
                            {entry.recipe?.title || 'Recipe'}
                          </div>
                          {entry.recipe?.nutrition && (
                            <div className="text-[10px] opacity-75 mt-1">
                              {entry.recipe.nutrition.calories} cal
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <Plus size={16} className="text-gray-300" />
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
      {showSelector === 'picker' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">Select Recipe</h3>
                <p className="text-sm text-gray-500">
                  {selectedDay} - {selectedMeal}
                </p>
              </div>
              <button
                onClick={() => setShowSelector(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-2">
              {savedRecipes.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => handleSelectRecipe(recipe)}
                  className="w-full text-left p-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-100 p-2 rounded-lg">
                      <ChefHat size={18} className="text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {recipe.title}
                      </div>
                      {recipe.nutrition && (
                        <div className="text-sm text-gray-500">
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
    </div>
  );
}
