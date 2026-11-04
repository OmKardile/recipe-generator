'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const RecipeContext = createContext(null);

export function RecipeProvider({ children }) {
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [mealPlan, setMealPlan] = useState([]);
  const [tags, setTags] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  /* Lazy data loading: the saved-recipes / meal-plan / tags JSON is only
     fetched once a tab that actually consumes it mounts (My Recipes, Meal
     Plan, Grocery). The default Generate tab only uses the write methods,
     so a fresh page load fires zero recipe-data API requests. */
  const loadStartedRef = useRef(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [recipesRes, planRes, tagsRes] = await Promise.all([
        fetch('/api/my-recipes'),
        fetch('/api/meal-plan'),
        fetch('/api/tags'),
      ]);

      if (recipesRes.ok) setSavedRecipes(await recipesRes.json());
      if (planRes.ok) setMealPlan(await planRes.json());
      if (tagsRes.ok) setTags(await tagsRes.json());
      return true;
    } catch (error) {
      console.error('Error loading data:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /** Idempotent: the first consumer mounts → one fetch for all three
      resources; a total failure clears the guard so the next consumer
      mount retries instead of showing permanently empty data. */
  const ensureDataLoaded = useCallback(() => {
    if (loadStartedRef.current) return;
    loadStartedRef.current = true;
    loadData().then((ok) => {
      if (!ok) loadStartedRef.current = false;
    });
  }, [loadData]);

  const saveRecipe = async (recipe) => {
    try {
      const res = await fetch('/api/my-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipe),
      });
      const newRecipe = await res.json();
      // Never inject an error payload into the saved list.
      if (!res.ok || !newRecipe?.id) throw new Error(newRecipe?.error || 'Save failed');
      setSavedRecipes((prev) => [newRecipe, ...prev]);
      return newRecipe;
    } catch (error) {
      console.error('Error saving recipe:', error);
      return null;
    }
  };

  const deleteRecipe = async (id) => {
    try {
      await fetch(`/api/my-recipes/${id}`, { method: 'DELETE' });
      setSavedRecipes((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error('Error deleting recipe:', error);
    }
  };

  const updateRecipeTags = async (id, recipeTags) => {
    try {
      const res = await fetch(`/api/my-recipes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: recipeTags }),
      });
      if (!res.ok) throw new Error('Tag update failed');
      const updated = await res.json();
      if (updated?.id) {
        setSavedRecipes((prev) => prev.map((r) => (r.id === id ? updated : r)));
      }
    } catch (error) {
      console.error('Error updating recipe tags:', error);
    }
  };

  const addToMealPlan = async (day, meal, recipe) => {
    try {
      const res = await fetch('/api/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day, meal, recipe }),
      });
      const plan = await res.json();
      setMealPlan(plan);
    } catch (error) {
      console.error('Error adding to meal plan:', error);
    }
  };

  const removeFromMealPlan = async (day, meal) => {
    try {
      const res = await fetch('/api/meal-plan', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day, meal }),
      });
      const plan = await res.json();
      setMealPlan(plan);
    } catch (error) {
      console.error('Error removing from meal plan:', error);
    }
  };

  const addTag = async (tag) => {
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag }),
      });
      const updated = await res.json();
      setTags(updated);
    } catch (error) {
      console.error('Error adding tag:', error);
    }
  };

  return (
    <RecipeContext.Provider
      value={{
        savedRecipes,
        mealPlan,
        tags,
        mounted,
        loading,
        ensureDataLoaded,
        saveRecipe,
        deleteRecipe,
        updateRecipeTags,
        addToMealPlan,
        removeFromMealPlan,
        addTag,
      }}
    >
      {children}
    </RecipeContext.Provider>
  );
}

export function useRecipes() {
  const context = useContext(RecipeContext);
  if (!context) {
    throw new Error('useRecipes must be used within a RecipeProvider');
  }
  return context;
}
