/**
 * Client-side persistence for saved recipes, the meal plan and tags.
 *
 * Storage: the browser's CacheStorage API, holding JSON `Response` bodies
 * under synthetic same-origin URLs (`/__store/<name>.json`). This replaces
 * the old server file store (`data/*.json` via /api/my-recipes), which
 * silently failed on any read-only/serverless filesystem — the "saving
 * doesn't work" bug. Browser-side storage also means each visitor gets a
 * private collection instead of one shared server file.
 *
 * Fallback: where CacheStorage is unavailable (insecure http origins,
 * some private modes) the same JSON payloads are kept in localStorage
 * under `recipe-generator:<name>` — one active store per browser, chosen
 * on first use. Every operation still try/catches: storage failing must
 * never break the UI, only log.
 *
 * Client-only module (imported from 'use client' components); the domain
 * functions mirror the old lib/dataStore.js contract so the context swap
 * stays mechanical.
 */

const CACHE_NAME = 'recipe-generator-v1';

/* Synthetic cache keys — same-origin request URLs that never collide with
   real routes (nothing is ever fetched() from these paths; cache.match
   and cache.put use them directly as storage addresses). */
const KEYS = {
  recipes: '/__store/recipes.json',
  mealPlan: '/__store/meal-plan.json',
  tags: '/__store/tags.json',
};

const LS_PREFIX = 'recipe-generator:'; // localStorage fallback namespace
const MAX_RECIPES = 500; // bounded store — caches and localStorage both hate unbounded growth

export const DEFAULT_TAGS = [
  'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Quick', 'Healthy', 'Vegetarian', 'Vegan',
];

let cacheReadyPromise = null;

/** Open (and memoize) the cache; resolves null when CacheStorage is
    unavailable so callers transparently use the localStorage fallback. */
function openCache() {
  if (!cacheReadyPromise) {
    cacheReadyPromise = (async () => {
      try {
        if (typeof caches === 'undefined') return null;
        return await caches.open(CACHE_NAME);
      } catch {
        return null;
      }
    })();
  }
  return cacheReadyPromise;
}

/** Read one JSON document: CacheStorage first, localStorage fallback,
    then the caller's default. Never throws. */
async function readJSON(name, fallback) {
  try {
    const cache = await openCache();
    if (cache) {
      const hit = await cache.match(KEYS[name]);
      if (hit) return await hit.json();
    }
  } catch {
    /* fall through to localStorage */
  }
  try {
    const raw = window.localStorage.getItem(LS_PREFIX + name);
    if (raw !== null) return JSON.parse(raw);
  } catch {
    /* unreadable — use fallback */
  }
  return fallback;
}

/** Write one JSON document to the active store. Returns false (never
    throws) when both stores are unavailable — callers decide whether
    that is fatal. */
async function writeJSON(name, value) {
  const json = JSON.stringify(value);
  let stored = false;
  try {
    const cache = await openCache();
    if (cache) {
      await cache.put(
        KEYS[name],
        new Response(json, { headers: { 'Content-Type': 'application/json' } })
      );
      stored = true;
    }
  } catch {
    /* try localStorage below */
  }
  if (!stored) {
    try {
      window.localStorage.setItem(LS_PREFIX + name, json);
      stored = true;
    } catch {
      /* out of quota or blocked */
    }
  }
  return stored;
}

/** Has this key ever been written? (Drives one-time migration.) */
async function hasEntry(name) {
  try {
    const cache = await openCache();
    if (cache && (await cache.match(KEYS[name]))) return true;
  } catch {
    /* fall through */
  }
  try {
    return window.localStorage.getItem(LS_PREFIX + name) !== null;
  } catch {
    return false;
  }
}

/**
 * One-time import from the retired server file store. The GET endpoints
 * read `data/*.json`; on a fresh browser with no cache entries yet, pull
 * whatever exists and adopt it as this browser's collection. A successful
 * fetch (even an empty list) marks the migration done by writing the
 * entry; a failed fetch retries on the next visit.
 */
export async function migrateLegacyServerData() {
  const sources = [
    ['recipes', '/api/my-recipes'],
    ['mealPlan', '/api/meal-plan'],
    ['tags', '/api/tags'],
  ];
  await Promise.all(
    sources.map(async ([name, url]) => {
      if (await hasEntry(name)) return;
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) await writeJSON(name, data);
      } catch {
        /* server unreachable — try again next load */
      }
    })
  );
}

/* ── Recipes ── */

export async function getRecipes() {
  return readJSON('recipes', []);
}

export async function addRecipe(recipe) {
  if (!recipe || typeof recipe !== 'object' || !recipe.recipe) {
    throw new Error('Recipe content is required');
  }
  const recipes = await getRecipes();
  const newRecipe = {
    id: `local_${Date.now()}`,
    title: (typeof recipe.title === 'string' && recipe.title.trim()) || extractTitle(recipe.recipe),
    dishName: typeof recipe.dishName === 'string' ? recipe.dishName.slice(0, 80) : '',
    // REAL media persisted with the save: photo of the real dish + verified video.
    media:
      recipe.media && typeof recipe.media.url === 'string'
        ? {
            url: recipe.media.url.slice(0, 500),
            source: String(recipe.media.source || '').slice(0, 40),
            credit: String(recipe.media.credit || '').slice(0, 120),
          }
        : null,
    youtubeUrl:
      typeof recipe.youtubeUrl === 'string' &&
      /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/.test(recipe.youtubeUrl)
        ? recipe.youtubeUrl
        : null,
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
  await writeJSON('recipes', recipes.slice(0, MAX_RECIPES));
  return newRecipe;
}

export async function updateRecipe(id, updates) {
  const recipes = await getRecipes();
  const index = recipes.findIndex((r) => r.id === id);
  if (index >= 0) {
    // Whitelist the fields a client may actually change.
    const safe = {};
    if (Array.isArray(updates.tags)) safe.tags = updates.tags.slice(0, 30);
    if (typeof updates.title === 'string' && updates.title.trim()) {
      safe.title = updates.title.trim().slice(0, 120);
    }
    recipes[index] = { ...recipes[index], ...safe };
    await writeJSON('recipes', recipes);
  }
  return recipes[index] || null;
}

export async function deleteRecipe(id) {
  const recipes = await getRecipes();
  await writeJSON('recipes', recipes.filter((r) => r.id !== id));
}

/* ── Meal plan ── */

export async function getMealPlan() {
  return readJSON('mealPlan', []);
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
  await writeJSON('mealPlan', plan);
  return plan;
}

export async function removeFromMealPlan(day, meal) {
  const plan = await getMealPlan();
  const filtered = plan.filter((p) => !(p.day === day && p.meal === meal));
  await writeJSON('mealPlan', filtered);
  return filtered;
}

/* ── Tags ── */

export async function getTags() {
  return readJSON('tags', DEFAULT_TAGS);
}

export async function addTag(tag) {
  const tags = await getTags();
  if (!tags.includes(tag)) {
    tags.push(tag);
    await writeJSON('tags', tags);
  }
  return tags;
}

function extractTitle(markdown) {
  const match = markdown.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : 'Untitled Recipe';
}
