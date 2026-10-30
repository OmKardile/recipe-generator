"use client";

import { useState } from 'react';
import IngredientInput from '@/components/IngredientInput';
import RecipeDisplay from '@/components/RecipeDisplay';
import RecipeSelector from '@/components/RecipeSelector';
import RecipeSkeleton from '@/components/RecipeSkeleton';
import SavedRecipes from '@/components/SavedRecipes';
import ShoppingList from '@/components/ShoppingList';
import MealPlanner from '@/components/MealPlanner';
import ThemeToggle from '@/components/ThemeToggle';
import CookingTimer from '@/components/CookingTimer';
import { ChefHat, Sparkles, BookOpen, Calendar, ShoppingCart, AlertTriangle, RefreshCw } from 'lucide-react';

const TABS = [
  { key: 'generate', label: 'Generate', icon: Sparkles },
  { key: 'recipes', label: 'My Recipes', icon: BookOpen },
  { key: 'mealplan', label: 'Meal Plan', icon: Calendar },
  { key: 'shopping', label: 'Shopping', icon: ShoppingCart },
];

export default function Home() {
  const [ingredients, setIngredients] = useState([]);
  const [preferences, setPreferences] = useState('');
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [includeNutrition, setIncludeNutrition] = useState(false);
  const [activeTab, setActiveTab] = useState('generate');

  const selectedRecipe = selectedRecipeIndex !== null ? recipes[selectedRecipeIndex] : null;

  const generateRecipe = async () => {
    if (ingredients.length === 0) return;
    setLoading(true);
    setError(null);
    setRecipes([]);
    setSelectedRecipeIndex(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients, preferences, includeNutrition }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate recipes. Please try again.');
      }

      setRecipes(data.recipes || []);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="flex items-start justify-between gap-4 mb-10">
          <div className="text-center sm:text-left flex-1">
            <div className="flex justify-center sm:justify-start mb-3">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 p-3 rounded-2xl shadow-lg shadow-orange-500/25">
                <ChefHat className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl mb-1.5 tracking-tight bg-gradient-to-r from-orange-600 to-red-600 dark:from-orange-400 dark:to-red-400 bg-clip-text text-transparent">
              Indian Recipe Generator
            </h1>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400">
              From Biryani to Butter Chicken — three chef-crafted recipes from whatever&apos;s in your kitchen.
            </p>
          </div>
          <ThemeToggle />
        </header>

        {/* Navigation Tabs */}
        <nav
          className="flex flex-wrap justify-center gap-2 mb-8"
          role="tablist"
          aria-label="App sections"
        >
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={activeTab === key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all ${
                activeTab === key
                  ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-md shadow-orange-600/25'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-gray-700 hover:text-orange-700 dark:hover:text-orange-300 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>

        {/* Tab Content */}
        <div role="tabpanel">
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

              {loading && <RecipeSkeleton />}

              {error && !loading && (
                <div
                  className="mt-8 p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl text-center max-w-md mx-auto border border-red-200 dark:border-red-800 flex flex-col items-center gap-3"
                  role="alert"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={18} />
                    <span>{error}</span>
                  </div>
                  <button
                    onClick={generateRecipe}
                    disabled={ingredients.length === 0}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw size={14} />
                    Try Again
                  </button>
                </div>
              )}

              {recipes.length > 0 && selectedRecipeIndex === null && (
                <RecipeSelector
                  recipes={recipes}
                  onSelect={setSelectedRecipeIndex}
                  selectedIndex={selectedRecipeIndex}
                />
              )}

              {selectedRecipe && (
                <div className="mt-8">
                  <button
                    onClick={() => setSelectedRecipeIndex(null)}
                    className="mb-4 text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 font-medium transition-colors"
                  >
                    ← Back to all options
                  </button>
                  <RecipeDisplay
                    data={selectedRecipe}
                    ingredients={ingredients}
                    preferences={preferences}
                  />
                </div>
              )}
            </>
          )}

          {activeTab === 'recipes' && <SavedRecipes />}

          {activeTab === 'mealplan' && <MealPlanner />}

          {activeTab === 'shopping' && (
            <ShoppingList currentRecipe={selectedRecipe?.recipe} currentIngredients={ingredients} />
          )}
        </div>

        <footer className="mt-16 pb-24 text-center text-xs text-gray-400 dark:text-gray-600">
          Built with Next.js &amp; Google Gemini · Recipes are AI-generated — always taste and adjust as you cook.
        </footer>
      </div>

      {/* Floating Cooking Timer */}
      <CookingTimer />
    </main>
  );
}
