// In-memory store for shared recipes (development)
// For production, replace with Vercel KV, Upstash Redis, or another database
const sharedRecipes = new Map();

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export function storeRecipe(recipe) {
  const id = generateId();
  const entry = {
    id,
    title: recipe.title || 'Untitled Recipe',
    recipe: recipe.recipe,
    nutrition: recipe.nutrition || null,
    ingredients: recipe.ingredients || [],
    preferences: recipe.preferences || '',
    createdAt: new Date().toISOString(),
    views: 0,
  };
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
