"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import IngredientInput from "@/components/IngredientInput";
import RecipeDisplay from "@/components/RecipeDisplay";
import RecipeSelector from "@/components/RecipeSelector";
import RecipeSkeleton from "@/components/RecipeSkeleton";
import SavedRecipes from "@/components/SavedRecipes";
import ShoppingList from "@/components/ShoppingList";
import MealPlanner from "@/components/MealPlanner";
import ThemeToggle from "@/components/ThemeToggle";
import CookingTimer from "@/components/CookingTimer";
import AmbientBackground from "@/components/AmbientBackground";
import {
  CookingPot, Sparkles, BookOpen, CalendarDays, ShoppingBasket,
  AlertTriangle, RefreshCw, Leaf, Carrot, Citrus,
} from "lucide-react";

const TABS = [
  { key: "generate", label: "Generate", icon: CookingPot },
  { key: "recipes", label: "My Recipes", icon: BookOpen },
  { key: "mealplan", label: "Meal Plan", icon: CalendarDays },
  { key: "shopping", label: "Shopping", icon: ShoppingBasket },
];

export default function Home() {
  const [ingredients, setIngredients] = useState([]);
  const [preferences, setPreferences] = useState("");
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [includeNutrition, setIncludeNutrition] = useState(false);
  const [activeTab, setActiveTab] = useState("generate");
  const tabRefs = useRef([]);

  const prefersReducedMotion = useReducedMotion();

  const selectedRecipe = selectedRecipeIndex !== null ? recipes[selectedRecipeIndex] : null;

  /** ARIA tabs keyboard pattern: roving focus with Arrow/Home/End keys. */
  const handleTabKeyDown = (e, index) => {
    let next = null;
    if (e.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    if (next === null) return;
    e.preventDefault();
    setActiveTab(TABS[next].key);
    tabRefs.current[next]?.focus();
  };

  const generateRecipe = async () => {
    if (ingredients.length === 0) return;
    setLoading(true);
    setError(null);
    setRecipes([]);
    setSelectedRecipeIndex(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients, preferences, includeNutrition }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate recipes. Please try again.");
      }

      setRecipes(data.recipes || []);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-transparent py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      {/* Living emerald aurora — sits behind all content */}
      <AmbientBackground />
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex items-start justify-between gap-4 mb-10"
        >
          <div className="text-center sm:text-left flex-1">
            <div className="relative flex justify-center sm:justify-start mb-3">
              <motion.div
                animate={prefersReducedMotion ? undefined : { y: [0, -7, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-2xl shadow-lg shadow-emerald-500/30"
              >
                <CookingPot className="h-8 w-8 text-white" />
              </motion.div>
              {/* Floating garnish — pure decoration, anchored to the logo */}
              <motion.span
                aria-hidden="true"
                animate={prefersReducedMotion ? undefined : { y: [0, 6, 0], rotate: [0, 14, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                className="absolute -left-5 top-4 text-emerald-300 dark:text-emerald-700"
              >
                <Leaf size={18} />
              </motion.span>
              <motion.span
                aria-hidden="true"
                animate={prefersReducedMotion ? undefined : { y: [0, -5, 0], rotate: [0, -12, 0] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
                className="absolute -right-6 -top-1 text-lime-400 dark:text-lime-700"
              >
                <Citrus size={16} />
              </motion.span>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl mb-1.5 tracking-tight bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 dark:from-emerald-400 dark:via-teal-300 dark:to-emerald-400 bg-clip-text text-transparent">
              Indian Recipe Generator
            </h1>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400">
              From Biryani to Butter Chicken — three real, chef-crafted dishes from whatever&apos;s in your kitchen.
            </p>
          </div>
          <ThemeToggle />
        </motion.header>

        {/* Navigation Tabs — the active pill slides between tabs */}
        <nav
          className="flex flex-wrap justify-center gap-2 mb-8"
          role="tablist"
          aria-label="App sections"
        >
          {TABS.map(({ key, label, icon: Icon }, index) => {
            const active = activeTab === key;
            return (
              <motion.button
                key={key}
                ref={(el) => { tabRefs.current[index] = el; }}
                id={`tab-${key}`}
                role="tab"
                aria-selected={active}
                aria-controls={`panel-${key}`}
                tabIndex={active ? 0 : -1}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
                onClick={() => setActiveTab(key)}
                whileTap={{ scale: 0.96 }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-colors ${
                  active
                    ? "text-white"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-gray-700 hover:text-emerald-700 dark:hover:text-emerald-300 border border-gray-200 dark:border-gray-700"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="tab-active-pill"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full shadow-md shadow-emerald-600/30"
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon size={17} />
                  {label}
                </span>
              </motion.button>
            );
          })}
        </nav>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            role="tabpanel"
            id={`panel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            {activeTab === "generate" && (
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
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
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
                  </motion.div>
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
                      className="mb-4 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium transition-colors"
                    >
                      ← Back to all options
                    </button>
                    <RecipeDisplay
                      // Keyed by selection so servings scaling, cook-mode
                      // checkmarks and the saved flag reset when the user
                      // switches to a different recipe (state would otherwise
                      // leak from Recipe A into Recipe B).
                      key={selectedRecipe.id ?? selectedRecipeIndex}
                      data={selectedRecipe}
                      ingredients={ingredients}
                      preferences={preferences}
                    />
                  </div>
                )}
              </>
            )}

            {activeTab === "recipes" && <SavedRecipes />}

            {activeTab === "mealplan" && <MealPlanner />}

            {activeTab === "shopping" && (
              <ShoppingList currentRecipe={selectedRecipe?.recipe} currentIngredients={ingredients} />
            )}
          </motion.div>
        </AnimatePresence>

        <footer className="mt-16 pb-24 text-center text-xs text-gray-400 dark:text-gray-600">
          Built with Next.js &amp; Google Gemini · Real dishes, real photos, verified videos — always taste and adjust as you cook.
        </footer>
      </div>

      {/* Floating Cooking Timer */}
      <CookingTimer />
    </main>
  );
}
