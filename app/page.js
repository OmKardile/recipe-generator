"use client";

import { useState, useRef, useEffect } from "react";
import IngredientInput from "@/components/IngredientInput";
import RecipeDisplay from "@/components/RecipeDisplay";
import RecipeSelector from "@/components/RecipeSelector";
import RecipeSkeleton from "@/components/RecipeSkeleton";
import SavedRecipes from "@/components/SavedRecipes";
import ShoppingList from "@/components/ShoppingList";
import MealPlanner from "@/components/MealPlanner";
import ThemeToggle from "@/components/ThemeToggle";
import CookingTimer from "@/components/CookingTimer";
import { RefreshCw } from "lucide-react";

const TABS = [
  { key: "generate", label: "Generate" },
  { key: "recipes", label: "My Recipes" },
  { key: "mealplan", label: "Meal Plan" },
  { key: "shopping", label: "Shopping" },
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

  /* On phones the four tabs overflow their scroller (scrollbar deliberately
     hidden). When they do, an edge fade tells the user there is more to
     swipe to; measured, not assumed, so wide screens keep clean edges. */
  const tiersRef = useRef(null);
  const [tiersOverflow, setTiersOverflow] = useState(false);
  useEffect(() => {
    const el = tiersRef.current;
    if (!el) return;
    const measure = () => setTiersOverflow(el.scrollWidth - el.clientWidth > 8);
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
    <>
      {/* ── The lid: sticky header. Wordmark left, tiers right. ── */}
      <header className="lid">
        <div className="lid__brand">
          <span className="lid__mark">
            Indian Recipe <em>Generator</em>
          </span>
          <span className="lid__sub">Real dishes · real photos · verified videos</span>
        </div>
        <div className="lid__tools">
          <nav
            ref={tiersRef}
            className={`tiers${tiersOverflow ? " tiers--fade" : ""}`}
            role="tablist"
            aria-label="App sections"
          >
            {TABS.map(({ key, label }, index) => {
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  id={`tab-${key}`}
                  role="tab"
                  aria-selected={active}
                  aria-controls={`panel-${key}`}
                  tabIndex={active ? 0 : -1}
                  onKeyDown={(e) => handleTabKeyDown(e, index)}
                  onClick={() => setActiveTab(key)}
                  className="tier"
                >
                  <span className="tier__num">{String(index + 1).padStart(2, "0")}</span>
                  {label}
                </button>
              );
            })}
          </nav>
          <ThemeToggle />
        </div>
      </header>

      {/* Floating REAL-photo preview for index rows (fine pointers only) */}
      <div className="preview" aria-hidden="true">
        <img alt="" />
      </div>

      <div className="stage">
        {/* ── Tier panels: each settles into place on mount ── */}
        <div
          key={activeTab}
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          className="tier-panel in"
          style={{ animationDelay: "0.06s" }}
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
                <div className="notice in" role="alert">
                  <span>{error}</span>
                  <button
                    onClick={generateRecipe}
                    disabled={ingredients.length === 0}
                    className="btn"
                    data-fill
                  >
                    <span className="fill" aria-hidden="true" />
                    <RefreshCw size={14} />
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
                <div className="in" style={{ animationDelay: "0.1s" }}>
                  <button
                    onClick={() => setSelectedRecipeIndex(null)}
                    className="back-link"
                  >
                    ← All three options
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
        </div>

        {/* Corner meta under the first tier */}
        {activeTab === "generate" && !selectedRecipe && (
          <div className="corner-meta in" style={{ animationDelay: "0.25s" }}>
            <span>Real dishes · real photos</span>
            <span>Kitchen · {ingredients.length} ingredient{ingredients.length === 1 ? "" : "s"}</span>
          </div>
        )}
      </div>

      {/* ── Finale ── */}
      <footer className="finale">
        <p className="finale__line in">
          Real food, from <span className="accent">what you&apos;ve got.</span>
        </p>
        <div className="finale__meta">
          <span>Indian Recipe Generator</span>
          <span>Built with Next.js &amp; Google Gemini</span>
          <span>Always taste and adjust as you cook</span>
        </div>
      </footer>

      {/* Floating cooking timer */}
      <CookingTimer />
    </>
  );
}
