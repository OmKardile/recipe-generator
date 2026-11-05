import fs from 'fs/promises';
import path from 'path';

/**
 * Read-only view of the RETIRED server file store. Saved recipes, meal
 * plans and tags now live in each visitor's browser CacheStorage
 * (lib/cacheStore.js), which works on read-only/serverless deploys and
 * keeps collections private per visitor. These getters remain only so
 * the GET /api/my-recipes, /api/meal-plan and /api/tags endpoints can
 * serve as a one-time migration source for `data/*.json` files created
 * by earlier local-dev versions.
 */

const DATA_DIR = path.join(process.cwd(), 'data');
const RECIPES_FILE = path.join(DATA_DIR, 'recipes.json');
const MEAL_PLAN_FILE = path.join(DATA_DIR, 'mealplan.json');
const TAGS_FILE = path.join(DATA_DIR, 'tags.json');

const DEFAULT_TAGS = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Quick', 'Healthy', 'Vegetarian', 'Vegan'];

async function readJSON(filePath, defaultValue) {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return defaultValue;
  }
}

export async function getRecipes() {
  return readJSON(RECIPES_FILE, []);
}

export async function getMealPlan() {
  return readJSON(MEAL_PLAN_FILE, []);
}

export async function getTags() {
  return readJSON(TAGS_FILE, DEFAULT_TAGS);
}
