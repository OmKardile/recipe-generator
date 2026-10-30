"use client";

import { useState } from "react";
import {
  PiMagicWandFill,
  PiBookBookmarkFill,
  PiCalendarFill,
  PiShoppingCartSimpleFill,
  PiStarFourFill,
  PiArrowClockwiseFill,
  PiWarningFill,
  PiCookingPotFill,
  PiLeafFill,
} from "react-icons/pi";
import { GiTomato, GiChiliPepper, GiCarrot, GiWhisk, GiChefToque } from "react-icons/gi";
import IngredientInput from "@/components/IngredientInput";
import RecipeDisplay from "@/components/RecipeDisplay";
import RecipeSelector from "@/components/RecipeSelector";
import RecipeSkeleton from "@/components/RecipeSkeleton";
import SavedRecipes from "@/components/SavedRecipes";
import ShoppingList from "@/components/ShoppingList";
import MealPlanner from "@/components/MealPlanner";
import ThemeToggle from "@/components/ThemeToggle";
import CookingTimer from "@/components/CookingTimer";
import { useReveal } from "@/hooks/useReveal";

const TABS = [
  { key: "generate", label: "Studio", icon: PiMagicWandFill },
  { key: "recipes", label: "Collection", icon: PiBookBookmarkFill },
  { key: "mealplan", label: "Meal Plan", icon: PiCalendarFill },
  { key: "shopping", label: "Market", icon: PiShoppingCartSimpleFill },
];

const MARQUEE_DISHES = [
  "Paneer Tikka", "Hyderabadi Biryani", "Masala Dosa", "Dal Makhani",
  "Poha", "Sambar", "Palak Paneer", "Chole Bhature", "Dhokla",
  "Rogan Josh", "Upma", "Butter Chicken",
];

const HERO_STATS = [
  { value: "3", label: "recipes per batch" },
  { value: "12+", label: "regional cuisines" },
  { value: "≤30 min", label: "speed option" },
  { value: "macro", label: "nutrition aware" },
];

const FLOATERS = [
  { Icon: GiTomato, className: "left-[6%] top-16 text-4xl text-chili/70 animate-float", delay: "0s" },
  { Icon: GiChiliPepper, className: "right-[8%] top-24 text-4xl text-herb-500/70 animate-float-slow", delay: "1.2s" },
  { Icon: GiCarrot, className: "left-[12%] bottom-20 text-5xl text-saffron/60 animate-float-slow", delay: "0.6s" },
  { Icon: GiWhisk, className: "right-[14%] bottom-28 text-4xl text-moss/50 animate-float", delay: "2s" },
  { Icon: GiChefToque, className: "right-[26%] top-10 text-3xl text-herb-400/60 animate-float", delay: "1.6s" },
];

function SteamLogo() {
  return (
    <span className="relative inline-flex">
      <span className="absolute -top-2 left-1/2 flex -translate-x-1/2 gap-[3px]" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block h-2.5 w-[3px] rounded-full bg-herb-400/80 dark:bg-herb-300/70 animate-steam"
            style={{ animationDelay: `${i * 0.55}s` }}
          />
        ))}
      </span>
      <PiCookingPotFill className="text-2xl text-herb-600 dark:text-herb-300" />
    </span>
  );
}

export default function Home() {
  const [ingredients, setIngredients] = useState([]);
  const [preferences, setPreferences] = useState("");
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [includeNutrition, setIncludeNutrition] = useState(false);
  const [activeTab, setActiveTab] = useState("generate");

  const revealRoot = useReveal(activeTab);

  const selectedRecipe = selectedRecipeIndex !== null ? recipes[selectedRecipeIndex] : null;

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
    <div ref={revealRoot} className="relative min-h-screen bg-paper font-sans text-ink">
      {/* Ambient kitchen haze — slow morphing gradient blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-40 -top-40 h-[36rem] w-[36rem] animate-blob bg-herb-300/30 blur-3xl dark:bg-herb-500/10" />
        <div className="absolute -right-44 top-1/4 h-[30rem] w-[30rem] animate-blob bg-zest/25 blur-3xl [animation-delay:5s] dark:bg-herb-400/10" />
        <div className="absolute bottom-0 left-1/4 h-[26rem] w-[26rem] animate-blob bg-saffron/15 blur-3xl [animation-delay:10s] dark:bg-herb-700/20" />
      </div>

      {/* ─── Navigation ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <a href="#" className="group flex items-center gap-2.5" aria-label="Rasoi — AI Recipe Studio">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-herb-200/70 bg-herb-100/70 shadow-card transition-transform duration-500 group-hover:rotate-6 dark:border-herb-800 dark:bg-herb-900/60">
              <SteamLogo />
            </span>
            <span className="leading-none">
              <span className="block font-display text-xl font-semibold tracking-tight">
                Rasoi
              </span>
              <span className="block text-[10px] uppercase tracking-[0.28em] text-body">
                AI Recipe Studio
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-1 rounded-full border border-line bg-elev/70 p-1 shadow-card sm:flex" role="tablist" aria-label="App sections">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                role="tab"
                aria-selected={activeTab === key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                  activeTab === key
                    ? "bg-herb-600 text-white shadow-glow"
                    : "text-body hover:bg-herb-100/70 hover:text-herb-700 dark:hover:bg-herb-900/60 dark:hover:text-herb-200"
                }`}
              >
                <Icon size={15} aria-hidden />
                {label}
              </button>
            ))}
          </nav>

          <ThemeToggle />
        </div>

        {/* Compact tab strip for small screens */}
        <nav className="flex gap-1 overflow-x-auto border-t border-line px-3 py-2 sm:hidden" role="tablist" aria-label="App sections">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={activeTab === key}
              onClick={() => setActiveTab(key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                activeTab === key
                  ? "bg-herb-600 text-white"
                  : "bg-herb-100/60 text-body dark:bg-herb-900/50"
              }`}
            >
              <Icon size={13} aria-hidden />
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div role="tabpanel">
          {activeTab === "generate" && (
            <>
              {/* ─── Hero ─────────────────────────────────────────── */}
              <section className="relative pb-8 pt-14 text-center sm:pt-20">
                <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
                  {FLOATERS.map(({ Icon, className, delay }, i) => (
                    <Icon key={i} className={`absolute ${className}`} style={{ animationDelay: delay }} />
                  ))}
                </div>

                <div data-reveal className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-herb-200/80 bg-herb-100/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-herb-700 dark:border-herb-800 dark:bg-herb-900/50 dark:text-herb-300">
                  <PiLeafFill className="animate-wiggle" aria-hidden />
                  Gemini-powered Indian kitchen AI
                </div>

                <h1 data-reveal style={{ "--reveal-delay": 1 }} className="mx-auto max-w-4xl font-display text-5xl font-semibold leading-[1.04] tracking-tight sm:text-6xl md:text-7xl">
                  Cook <span className="display-accent bg-gradient-to-r from-herb-600 via-herb-500 to-zest-deep bg-clip-text text-transparent dark:from-herb-300 dark:via-zest dark:to-herb-400">magic</span> from
                  <br />
                  what&rsquo;s in your kitchen.
                </h1>

                <p data-reveal style={{ "--reveal-delay": 2 }} className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-body sm:text-lg">
                  Rasoi studies the ingredients you already have and writes three
                  chef-crafted recipes — plated with photography, macros, video
                  tutorials and smart serving scaling.
                </p>

                <dl data-reveal style={{ "--reveal-delay": 3 }} className="mx-auto mt-10 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
                  {HERO_STATS.map(({ value, label }) => (
                    <div key={label} className="rounded-2xl border border-line bg-elev/70 px-3 py-4 backdrop-blur-sm">
                      <dt className="order-2 mt-1 block text-[11px] uppercase tracking-[0.14em] text-body">{label}</dt>
                      <dd className="order-1 block font-display text-2xl font-semibold text-herb-700 dark:text-herb-300">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {/* ─── Signature dishes marquee ─────────────────────── */}
              <div data-reveal className="relative mb-12 overflow-hidden border-y border-line py-3.5" aria-hidden>
                <div className="flex w-max animate-marquee">
                  {[...MARQUEE_DISHES, ...MARQUEE_DISHES].map((dish, i) => (
                    <span key={i} className="mx-7 flex items-center gap-7 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.24em] text-herb-600/70 dark:text-herb-300/60">
                      {dish}
                      <PiStarFourFill className="text-zest-deep/80" aria-hidden />
                    </span>
                  ))}
                </div>
                <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-paper to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-paper to-transparent" />
              </div>

              {/* ─── Ingredient studio ────────────────────────────── */}
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
                  className="animate-fade-up mx-auto mt-8 flex max-w-md flex-col items-center gap-3 rounded-3xl border border-chili/30 bg-chili/5 p-5 text-center"
                  role="alert"
                >
                  <div className="flex items-center gap-2 text-chili">
                    <PiWarningFill size={18} aria-hidden />
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                  <button
                    onClick={generateRecipe}
                    disabled={ingredients.length === 0}
                    className="btn-shine flex items-center gap-2 rounded-full bg-herb-600 px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-50"
                  >
                    <PiArrowClockwiseFill size={14} aria-hidden />
                    Try again
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
                <div className="mt-10 animate-fade-up">
                  <button
                    onClick={() => setSelectedRecipeIndex(null)}
                    className="link-underline mb-5 inline-flex items-center gap-2 text-sm font-semibold text-herb-700 dark:text-herb-300"
                  >
                    <PiArrowClockwiseFill size={14} className="-scale-x-100" aria-hidden />
                    Back to all three options
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

          {activeTab === "recipes" && (
            <div className="animate-fade-up pt-8">
              <SavedRecipes />
            </div>
          )}

          {activeTab === "mealplan" && (
            <div className="animate-fade-up pt-8">
              <MealPlanner />
            </div>
          )}

          {activeTab === "shopping" && (
            <div className="animate-fade-up pt-8">
              <ShoppingList currentRecipe={selectedRecipe?.recipe} currentIngredients={ingredients} />
            </div>
          )}
        </div>
      </main>

      {/* ─── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-line bg-elev/50">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-10 text-center sm:px-6">
          <div className="flex items-center gap-2 text-herb-600 dark:text-herb-300">
            <SteamLogo />
            <span className="font-display text-lg font-semibold">Rasoi</span>
          </div>
          <p className="max-w-xl text-xs leading-relaxed text-body">
            Dish photography is AI-styled with Gemini · known-dish photos and
            tutorials via <a href="https://www.themealdb.com" target="_blank" rel="noopener noreferrer" className="link-underline font-medium">TheMealDB</a> ·
            videos via <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer" className="link-underline font-medium">YouTube</a>.
            Recipes are AI-generated — always taste and adjust as you cook.
          </p>
          <p className="text-[11px] uppercase tracking-[0.24em] text-body/70">
            Built with Next.js &amp; Google Gemini
          </p>
        </div>
      </footer>

      {/* Floating Cooking Timer */}
      <CookingTimer />
    </div>
  );
}
