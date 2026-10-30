import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const RECIPES_FILE = path.join(DATA_DIR, 'recipes.json');
const MEAL_PLAN_FILE = path.join(DATA_DIR, 'mealplan.json');
const TAGS_FILE = path.join(DATA_DIR, 'tags.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

const DEFAULT_TAGS = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Quick', 'Healthy', 'Vegetarian', 'Vegan'];

async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

async function readJSON(filePath, defaultValue) {
  try {
    await ensureDataDir();
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return defaultValue;
  }
}

async function writeJSON(filePath, data) {
  await ensureDataDir();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Recipes
export async function getRecipes() {
  return readJSON(RECIPES_FILE, []);
}

export async function saveRecipes(recipes) {
  await writeJSON(RECIPES_FILE, recipes);
}

export async function addRecipe(recipe) {
  if (!recipe || typeof recipe !== 'object' || !recipe.recipe) {
    throw new Error('Recipe content is required');
  }
  const recipes = await getRecipes();
  const newRecipe = {
    id: `local_${Date.now()}`,
    title: (typeof recipe.title === 'string' && recipe.title.trim()) || extractTitle(recipe.recipe),
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.slice(0, 40) : [],
    preferences: typeof recipe.preferences === 'string' ? recipe.preferences.slice(0, 500) : '',
    recipe: recipe.recipe,
    nutrition: recipe.nutrition || null,
    structured: recipe.structured || null,
    baseServings: recipe.baseServings || recipe.servings || 4,
    tags: Array.isArray(recipe.tags) ? recipe.tags : [],
    servings: recipe.servings || 4,
    savedAt: new Date().toISOString(),
  };
  recipes.unshift(newRecipe);
  // Keep the store bounded — localStorage/filesystem both hate unbounded growth.
  await saveRecipes(recipes.slice(0, 500));
  return newRecipe;
}

export async function updateRecipe(id, updates) {
  const recipes = await getRecipes();
  const index = recipes.findIndex((r) => r.id === id);
  if (index >= 0) {
    // Whitelist the fields a client may actually change.
    const safe = {};
    if (Array.isArray(updates.tags)) safe.tags = updates.tags.slice(0, 30);
    if (typeof updates.title === 'string' && updates.title.trim()) safe.title = updates.title.trim().slice(0, 120);
    recipes[index] = { ...recipes[index], ...safe };
    await saveRecipes(recipes);
  }
  return recipes;
}

export async function deleteRecipe(id) {
  const recipes = await getRecipes();
  const filtered = recipes.filter((r) => r.id !== id);
  await saveRecipes(filtered);
  return filtered;
}

// Meal Plan
export async function getMealPlan() {
  return readJSON(MEAL_PLAN_FILE, []);
}

export async function saveMealPlan(plan) {
  await writeJSON(MEAL_PLAN_FILE, plan);
}

export async function addToMealPlan(day, meal, recipe) {
  const plan = await getMealPlan();
  const existing = plan.findIndex((p) => p.day === day && p.meal === meal);
  const entry = { day, meal, recipeId: recipe.id, recipe };
  if (existing >= 0) {
    plan[existing] = entry;
  } else {
    plan.push(entry);
  }
  await saveMealPlan(plan);
  return plan;
}

export async function removeFromMealPlan(day, meal) {
  const plan = await getMealPlan();
  const filtered = plan.filter((p) => !(p.day === day && p.meal === meal));
  await saveMealPlan(filtered);
  return filtered;
}

// Tags
export async function getTags() {
  return readJSON(TAGS_FILE, DEFAULT_TAGS);
}

export async function saveTags(tags) {
  await writeJSON(TAGS_FILE, tags);
}

export async function addTag(tag) {
  const tags = await getTags();
  if (!tags.includes(tag)) {
    tags.push(tag);
    await saveTags(tags);
  }
  return tags;
}

// Settings
export async function getSettings() {
  return readJSON(SETTINGS_FILE, { theme: 'system' });
}

export async function saveSettings(settings) {
  await writeJSON(SETTINGS_FILE, settings);
}

function extractTitle(markdown) {
  const match = markdown.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : 'Untitled Recipe';
}
