'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import IngredientInput from '@/components/IngredientInput';
import RecipeDisplay from '@/components/RecipeDisplay';
import RecipeSelector from '@/components/RecipeSelector';
import RecipeSkeleton from '@/components/RecipeSkeleton';
import SavedRecipes from '@/components/SavedRecipes';
import ShoppingList from '@/components/ShoppingList';
import MealPlanner from '@/components/MealPlanner';
import ThemeToggle from '@/components/ThemeToggle';
import CookingTimer from '@/components/CookingTimer';
import AmbientBackground from '@/components/AmbientBackground';
import {
  CookingPot, Sparkles, BookOpen, CalendarDays, ShoppingCart,
  AlertTriangle, RefreshCw, Leaf,
} from 'lucide-react';

const TABS = [
  { key: 'generate', label: 'Generate', icon: Sparkles },
  { key: 'recipes', label: 'My Recipes', icon: BookOpen },
  { key: 'mealplan', label: 'Meal Plan', icon: CalendarDays },
  { key: 'shopping', label: 'Shopping', icon: ShoppingCart },
];

/* Shared choreography — springy, confident, never bouncy-cheap. */
const EASE = [0.22, 1, 0.36, 1];
const containerStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};
const riseIn = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } },
};

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

  // When a recipe is chosen, bring it into view smoothly.
  useEffect(() => {
    if (selectedRecipeIndex !== null) {
      requestAnimationFrame(() =>
        window.scrollTo({ top: 0, behavior: 'smooth' })
      );
    }
  }, [selectedRecipeIndex]);

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
    <main className="relative min-h-screen bg-background py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <AmbientBackground />

      <div className="max-w-4xl mx-auto">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <motion.header
          variants={containerStagger}
          initial="hidden"
          animate="show"
          className="flex items-start justify-between gap-4 mb-10"
        >
          <div className="text-center sm:text-left flex-1">
            <div className="flex justify-center sm:justify-start mb-4">
              <motion.div
                variants={riseIn}
                whileHover={{ rotate: -8, scale: 1.06 }}
                transition={{ type: 'spring', stiffness: 320, damping: 15 }}
                className="bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700 p-3.5 rounded-[1.25rem] shadow-xl shadow-emerald-600/30 ring-1 ring-emerald-300/40"
              >
                <CookingPot className="h-8 w-8 text-white" />
              </motion.div>
            </div>
            <motion.h1
              variants={riseIn}
              className="font-display text-4xl sm:text-5xl font-black leading-[1.05] tracking-tight mb-3 headline-gradient"
            >
              Indian Recipe Generator
            </motion.h1>
            <motion.p
              variants={riseIn}
              className="text-base sm:text-lg text-emerald-900/70 dark:text-emerald-100/60 max-w-xl mx-auto sm:mx-0"
            >
              From Biryani to Butter Chicken — three chef-crafted recipes from whatever&apos;s
              in your kitchen,{' '}
              <span className="font-medium text-emerald-700 dark:text-emerald-300">
                each with a real video of a proven cook
              </span>{' '}
              making the very same dish.
            </motion.p>
            <motion.div
              variants={riseIn}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-600/10 dark:bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
            >
              <Leaf size={12} />
              Real photos · Real videos · Never AI-imagined
            </motion.div>
          </div>
          <motion.div variants={riseIn}>
            <ThemeToggle />
          </motion.div>
        </motion.header>

        {/* ── Navigation tabs — sliding emerald pill ─────────────────── */}
        <motion.nav
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6, ease: EASE }}
          className="flex flex-wrap justify-center gap-2 mb-8"
          role="tablist"
          aria-label="App sections"
        >
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(key)}
                className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-colors duration-300 ${
                  active
                    ? 'text-white'
                    : 'bg-white/70 dark:bg-gray-800/70 text-gray-600 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-300 border border-gray-200/80 dark:border-gray-700/80 backdrop-blur-sm'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="tab-pill"
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-600 to-green-700 shadow-lg shadow-emerald-600/30"
                    transition={{ type: 'spring', bounce: 0.28, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon size={16} />
                  {label}
                </span>
              </button>
            );
          })}
        </motion.nav>

        {/* ── Tab content — crossfades between sections ──────────────── */}
        <div role="tabpanel">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
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
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, ease: EASE }}
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
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 active:scale-95 disabled:opacity-50 transition-all"
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
                      <motion.button
                        onClick={() => setSelectedRecipeIndex(null)}
                        whileHover={{ x: -4 }}
                        whileTap={{ scale: 0.97 }}
                        className="mb-4 inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-medium transition-colors"
                      >
                        ← Back to all options
                      </motion.button>
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
                <ShoppingList
                  currentRecipe={selectedRecipe?.recipe}
                  currentIngredients={ingredients}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="mt-16 pb-24 text-center text-xs text-emerald-900/40 dark:text-emerald-100/30">
          Built with Next.js &amp; Google Gemini · Every dish is paired with a real,
          human-cooked video · Always taste and adjust as you cook.
        </footer>
      </div>

      {/* Floating Cooking Timer */}
      <CookingTimer />
    </main>
  );
}
