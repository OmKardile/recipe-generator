// In-memory store for shared recipes (development / single-instance deploys)
// For production, replace with Vercel KV, Upstash Redis, or another database.
// Note: entries are ephemeral on serverless platforms (per-instance memory).
const sharedRecipes = new Map();
const MAX_SHARED = 500;

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

export function storeRecipe(recipe) {
  if (!recipe || !recipe.recipe) throw new Error('Recipe content is required');
  const id = generateId();
  const entry = {
    id,
    title: (typeof recipe.title === 'string' && recipe.title.trim().slice(0, 120)) || 'Untitled Recipe',
    recipe: recipe.recipe,
    nutrition: recipe.nutrition || null,
    structured: recipe.structured || null,
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.slice(0, 40) : [],
    preferences: typeof recipe.preferences === 'string' ? recipe.preferences.slice(0, 500) : '',
    cuisine: typeof recipe.cuisine === 'string' ? recipe.cuisine.slice(0, 60) : '',
    createdAt: new Date().toISOString(),
    views: 0,
  };
  // Bound the store so long-running dev servers don't leak memory.
  if (sharedRecipes.size >= MAX_SHARED) {
    const oldest = sharedRecipes.keys().next().value;
    sharedRecipes.delete(oldest);
  }
  sharedRecipes.set(id, entry);
  return entry;
}

export function getRecipe(id) {
  const recipe = sharedRecipes.get(id);
  if (recipe) {
    recipe.views += 1;
  }
  return recipe;
}

export function deleteRecipe(id) {
  return sharedRecipes.delete(id);
}
