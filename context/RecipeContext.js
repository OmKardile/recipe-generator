'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import {
  migrateLegacyServerData,
  getRecipes,
  addRecipe,
  updateRecipe,
  deleteRecipe,
  getMealPlan,
  addToMealPlan,
  removeFromMealPlan,
  getTags,
  addTag,
} from '@/lib/cacheStore';

const RecipeContext = createContext(null);

/**
 * Saved recipes, meal plan and tags live in the BROWSER's CacheStorage as
 * JSON (lib/cacheStore.js) — not on the server. The previous design POSTed
 * to /api/my-recipes, which wrote files on the server: fine in local dev,
 * silently broken on any read-only/serverless deploy, and shared across
 * all visitors. Each browser now owns a private collection that works
 * offline and survives restarts.
 */
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
      // One-time import of anything the old server file store had.
      await migrateLegacyServerData();
      const [recipes, plan, tagList] = await Promise.all([
        getRecipes(),
        getMealPlan(),
        getTags(),
      ]);
      setSavedRecipes(recipes);
      setMealPlan(plan);
      setTags(tagList);
    } catch (error) {
      console.error('Error loading saved data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveRecipe = async (recipe) => {
    try {
      const newRecipe = await addRecipe(recipe);
      if (!newRecipe?.id) throw new Error('Save failed');
      setSavedRecipes((prev) => [newRecipe, ...prev]);
      return newRecipe;
    } catch (error) {
      console.error('Error saving recipe:', error);
      return null;
    }
  };

  const deleteSavedRecipe = async (id) => {
    try {
      await deleteRecipe(id);
      setSavedRecipes((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error('Error deleting recipe:', error);
    }
  };

  const updateRecipeTags = async (id, recipeTags) => {
    try {
      const updated = await updateRecipe(id, { tags: recipeTags });
      if (updated?.id) {
        setSavedRecipes((prev) => prev.map((r) => (r.id === id ? updated : r)));
      }
    } catch (error) {
      console.error('Error updating recipe tags:', error);
    }
  };

  const addRecipeToMealPlan = async (day, meal, recipe) => {
    try {
      const plan = await addToMealPlan(day, meal, recipe);
      setMealPlan(plan);
    } catch (error) {
      console.error('Error adding to meal plan:', error);
    }
  };

  const removeRecipeFromMealPlan = async (day, meal) => {
    try {
      const plan = await removeFromMealPlan(day, meal);
      setMealPlan(plan);
    } catch (error) {
      console.error('Error removing from meal plan:', error);
    }
  };

  const createTag = async (tag) => {
    try {
      const updated = await addTag(tag);
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
        deleteRecipe: deleteSavedRecipe,
        updateRecipeTags,
        addToMealPlan: addRecipeToMealPlan,
        removeFromMealPlan: removeRecipeFromMealPlan,
        addTag: createTag,
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
