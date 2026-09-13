const SAVED_RECIPES_KEY = 'recipe-generator-saved';
const MEAL_PLAN_KEY = 'recipe-generator-mealplan';
const TAGS_KEY = 'recipe-generator-tags';

const DEFAULT_TAGS = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Quick', 'Healthy', 'Vegetarian', 'Vegan'];

export function getTags() {
  if (typeof window === 'undefined') return DEFAULT_TAGS;
  try {
    const data = localStorage.getItem(TAGS_KEY);
    return data ? JSON.parse(data) : DEFAULT_TAGS;
  } catch {
    return DEFAULT_TAGS;
  }
}

export function addTag(tag) {
  const tags = getTags();
  if (!tags.includes(tag)) {
    tags.push(tag);
    localStorage.setItem(TAGS_KEY, JSON.stringify(tags));
  }
  return tags;
}

export function getSavedRecipes() {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(SAVED_RECIPES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveRecipe(recipe) {
  const recipes = getSavedRecipes();
  const newRecipe = {
    id: `local_${Date.now()}`,
    title: extractTitle(recipe.recipe),
    ingredients: recipe.ingredients,
    preferences: recipe.preferences,
    recipe: recipe.recipe,
    nutrition: recipe.nutrition,
    tags: recipe.tags || [],
    servings: recipe.servings || 4,
    savedAt: new Date().toISOString(),
  };
  recipes.unshift(newRecipe);
  localStorage.setItem(SAVED_RECIPES_KEY, JSON.stringify(recipes));
  return newRecipe;
}

export function updateRecipeTags(id, tags) {
  const recipes = getSavedRecipes();
  const index = recipes.findIndex((r) => r.id === id);
  if (index >= 0) {
    recipes[index].tags = tags;
    localStorage.setItem(SAVED_RECIPES_KEY, JSON.stringify(recipes));
  }
  return recipes;
}

export function deleteRecipe(id) {
  const recipes = getSavedRecipes();
  const filtered = recipes.filter((r) => r.id !== id);
  localStorage.setItem(SAVED_RECIPES_KEY, JSON.stringify(filtered));
  return filtered;
}

export function getMealPlan() {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(MEAL_PLAN_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveMealPlan(plan) {
  localStorage.setItem(MEAL_PLAN_KEY, JSON.stringify(plan));
}

export function addToMealPlan(day, meal, recipe) {
  const plan = getMealPlan();
  const existing = plan.findIndex((p) => p.day === day && p.meal === meal);
  const entry = { day, meal, recipeId: recipe.id, recipe };
  if (existing >= 0) {
    plan[existing] = entry;
  } else {
    plan.push(entry);
  }
  saveMealPlan(plan);
  return plan;
}

export function removeFromMealPlan(day, meal) {
  const plan = getMealPlan();
  const filtered = plan.filter((p) => !(p.day === day && p.meal === meal));
  saveMealPlan(filtered);
  return filtered;
}

function extractTitle(markdown) {
  const match = markdown.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : 'Untitled Recipe';
}
