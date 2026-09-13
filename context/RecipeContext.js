'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import {
  getSavedRecipes,
  saveRecipe as storageSaveRecipe,
  deleteRecipe as storageDeleteRecipe,
  updateRecipeTags as storageUpdateRecipeTags,
  getMealPlan,
  addToMealPlan as storageAddToMealPlan,
  removeFromMealPlan as storageRemoveFromMealPlan,
  getTags as storageGetTags,
  addTag as storageAddTag,
} from '@/lib/storage';

const RecipeContext = createContext(null);

export function RecipeProvider({ children }) {
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [mealPlan, setMealPlan] = useState([]);
  const [tags, setTags] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSavedRecipes(getSavedRecipes());
    setMealPlan(getMealPlan());
    setTags(storageGetTags());
  }, []);

  const saveRecipe = (recipe) => {
    const newRecipe = storageSaveRecipe(recipe);
    setSavedRecipes(getSavedRecipes());
    return newRecipe;
  };

  const deleteRecipe = (id) => {
    const updated = storageDeleteRecipe(id);
    setSavedRecipes(updated);
  };

  const updateRecipeTags = (id, recipeTags) => {
    const updated = storageUpdateRecipeTags(id, recipeTags);
    setSavedRecipes(updated);
  };

  const addToMealPlan = (day, meal, recipe) => {
    const updated = storageAddToMealPlan(day, meal, recipe);
    setMealPlan(updated);
  };

  const removeFromMealPlan = (day, meal) => {
    const updated = storageRemoveFromMealPlan(day, meal);
    setMealPlan(updated);
  };

  const addTag = (tag) => {
    const updated = storageAddTag(tag);
    setTags(updated);
  };

  return (
    <RecipeContext.Provider
      value={{
        savedRecipes,
        mealPlan,
        tags,
        mounted,
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
