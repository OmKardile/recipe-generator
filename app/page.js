"use client";

import { useState } from 'react';
import IngredientInput from '@/components/IngredientInput';
import RecipeDisplay from '@/components/RecipeDisplay';
import SavedRecipes from '@/components/SavedRecipes';
import ShoppingList from '@/components/ShoppingList';
import MealPlanner from '@/components/MealPlanner';
import ThemeToggle from '@/components/ThemeToggle';
import CookingTimer from '@/components/CookingTimer';
import { ChefHat, Sparkles, BookOpen, Calendar, ShoppingCart } from 'lucide-react';

export default function Home() {
  const [ingredients, setIngredients] = useState([]);
  const [preferences, setPreferences] = useState('');
  const [recipe, setRecipe] = useState(null);
  const [nutrition, setNutrition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [includeNutrition, setIncludeNutrition] = useState(false);
  const [activeTab, setActiveTab] = useState('generate');

  const generateRecipe = async () => {
    setLoading(true);
    setError(null);
    setRecipe(null);
    setNutrition(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ingredients, preferences, includeNutrition }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate recipe');
      }

      setRecipe(data.recipe);
      setNutrition(data.nutrition);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <ChefHat className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl mb-2">
            AI Recipe Generator
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Tell us what you have, and we'll cook up something amazing!
          </p>
        </div>

        {/* Header with Theme Toggle */}
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors ${
              activeTab === 'generate'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <Sparkles size={18} />
            Generate
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors ${
              activeTab === 'recipes'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <BookOpen size={18} />
            My Recipes
          </button>
          <button
            onClick={() => setActiveTab('mealplan')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors ${
              activeTab === 'mealplan'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <Calendar size={18} />
            Meal Plan
          </button>
          <button
            onClick={() => setActiveTab('shopping')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors ${
              activeTab === 'shopping'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <ShoppingCart size={18} />
            Shopping
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'generate' && (
          <>
            <IngredientInput
              ingredients={ingredients}
              setIngredients={setIngredients}
              preferences={preferences}
              setPreferences={setPreferences}
              onSubmit={generateRecipe}
              isLoading={loading}
              includeNutrition={includeNutrition}
              setIncludeNutrition={setIncludeNutrition}
            />

            {error && (
              <div className="mt-8 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-center max-w-md mx-auto border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}

            <RecipeDisplay
              recipe={recipe}
              nutrition={nutrition}
              ingredients={ingredients}
              preferences={preferences}
            />
          </>
        )}

        {activeTab === 'recipes' && <SavedRecipes />}

        {activeTab === 'mealplan' && <MealPlanner />}

        {activeTab === 'shopping' && (
          <ShoppingList currentRecipe={recipe} currentIngredients={ingredients} />
        )}
      </div>

      {/* Floating Cooking Timer */}
      <CookingTimer />
    </main>
  );
}
