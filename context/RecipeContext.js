'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const RecipeContext = createContext(null);

export function RecipeProvider({ children }) {
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [mealPlan, setMealPlan] = useState([]);
  const [tags, setTags] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [recipesRes, planRes, tagsRes] = await Promise.all([
        fetch('/api/my-recipes'),
        fetch('/api/meal-plan'),
        fetch('/api/tags'),
      ]);

      if (recipesRes.ok) setSavedRecipes(await recipesRes.json());
      if (planRes.ok) setMealPlan(await planRes.json());
      if (tagsRes.ok) setTags(await tagsRes.json());
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveRecipe = async (recipe) => {
    try {
      const res = await fetch('/api/my-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipe),
      });
      const newRecipe = await res.json();
      setSavedRecipes((prev) => [newRecipe, ...prev]);
      return newRecipe;
    } catch (error) {
      console.error('Error saving recipe:', error);
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
      const updated = await res.json();
      setSavedRecipes((prev) => prev.map((r) => (r.id === id ? updated : r)));
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
