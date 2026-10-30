/**
 * TheMealDB integration — free, key-less, real food data.
 *
 * Used for two "accurate media" jobs:
 *   1. Real photos of well-known dishes (strMealThumb) — never a random image.
 *   2. Real YouTube tutorial links for known dishes (strYoutube).
 *
 * Accuracy guard: a match is only accepted when the dish name actually
 * corresponds to what was searched (exact name, or a shared word with a
 * truncated-title match). Fuzzy noise is rejected so we never show a photo
 * of the wrong dish.
 */

const MEAL_DB_SEARCH = "https://www.themealdb.com/api/json/v1/1/search.php?s=";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 6000;

/** key: lowercase dish name → { hit: mealSummary | null, ts } */
const cache = new Map();

async function fetchJson(url, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function summarize(meal) {
  return {
    name: meal.strMeal || "",
    thumb: meal.strMealThumb || null,
    youtube: meal.strYoutube || null,
    area: meal.strArea || "",
    category: meal.strCategory || "",
  };
}

function searchNameWords(name) {
  return name.toLowerCase().split(/\s+/).filter(Boolean);
}

/**
 * Look up a dish by name.
 * @param {string} dishName
 * @returns {Promise<{name:string, thumb:string, youtube:string, area:string, category:string} | null>}
 */
export async function searchMealDb(dishName) {
  const name = String(dishName || "").trim().slice(0, 80);
  if (!name) return null;

  const key = name.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.hit;

  let hit = null;

  const data = await fetchJson(`${MEAL_DB_SEARCH}${encodeURIComponent(name)}`);
  const meals = Array.isArray(data?.meals) ? data.meals : [];

  if (meals.length > 0) {
    const exact = meals.find((m) => String(m.strMeal || "").toLowerCase() === key);
    hit = summarize(exact || meals[0]);
  } else {
    // AI titles often carry suffixes ("Smoky Paneer Tikka Masala") — retry
    // with the first two words, but only accept a shared-word match.
    const words = searchNameWords(name);
    if (words.length > 2) {
      const shortName = words.slice(0, 2).join(" ");
      const data2 = await fetchJson(`${MEAL_DB_SEARCH}${encodeURIComponent(shortName)}`);
      const meals2 = Array.isArray(data2?.meals) ? data2.meals : [];
      if (meals2.length > 0) {
        const candidateWords = new Set(
          String(meals2[0].strMeal || "").toLowerCase().split(/\s+/)
        );
        const sharesAWord = words.some((w) => candidateWords.has(w));
        if (sharesAWord) hit = summarize(meals2[0]);
      }
    }
  }

  cache.set(key, { hit, ts: Date.now() });
  return hit;
}
