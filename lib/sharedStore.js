// In-memory store for shared recipes (development / single-instance deploys)
// For production, replace with Vercel KV, Upstash Redis, or another database.
// Note: entries are ephemeral on serverless platforms (per-instance memory).
//
// The Map lives on globalThis, NOT on the module: Next.js production builds
// bundle route handlers and pages separately, so a module-level Map would be
// TWO different maps — POST /api/recipes would store into one and the
// /recipe/[id] page would read from the other, answering "not found" for a
// link created seconds earlier. globalThis is shared by the whole process,
// which keeps the store whole on single-instance servers.
const sharedRecipes = (globalThis.__recipeSharedRecipes ??= new Map());
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
    dishName: typeof recipe.dishName === 'string' ? recipe.dishName.slice(0, 80) : '',
    recipe: recipe.recipe,
    nutrition: recipe.nutrition || null,
    // REAL media attached at share time: a real photo of the real dish +
    // a server-verified YouTube link. Never AI-generated.
    media:
      recipe.media && typeof recipe.media.url === 'string'
        ? {
            url: recipe.media.url.slice(0, 500),
            source: String(recipe.media.source || '').slice(0, 40),
            credit: String(recipe.media.credit || '').slice(0, 120),
          }
        : null,
    youtubeUrl: typeof recipe.youtubeUrl === 'string' && /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/.test(recipe.youtubeUrl)
      ? recipe.youtubeUrl
      : null,
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
