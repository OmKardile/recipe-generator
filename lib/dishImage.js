/**
 * Real dish-photo resolver — REAL photos only, zero AI generation.
 *
 * Product rule (non-negotiable): every image shown next to a recipe must be a
 * photograph of that real dish from a real-world source. We resolve photos
 * from two free, keyless, well-established sources, in order:
 *
 *   1. Wikipedia / Wikimedia Commons — canonical photos of famous dishes
 *      (the recipes themselves are constrained to real, established dishes
 *      with canonical names, so coverage is excellent for Indian cuisine).
 *   2. TheMealDB — a free open database of real recipe photographs.
 *
 * If neither has a photo, we return null and the UI renders a branded
 * placeholder — never an AI-generated image, never a random unrelated photo.
 */

const FETCH_TIMEOUT_MS = 4500;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE = 300;

/** Wikimedia only serves these thumbnail widths to hotlinkers (see w.wiki/GHai). */
const ALLOWED_THUMB_WIDTHS = [20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840];

/** Politeness queue: Wikipedia rate-limits bursts, so outbound candidate
 *  fetches are spaced ~350ms apart process-wide. */
let pacedQueue = Promise.resolve();
function paced(task) {
  const run = pacedQueue.then(async () => {
    await new Promise((r) => setTimeout(r, 350));
    return task();
  });
  pacedQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

const USER_AGENT =
  "recipe-generator/1.0 (+https://github.com/OmKardile/recipe-generator)";

/** dish-key → { image, expires } (null results are cached too). */
const resolutionCache = new Map();

/* ─────────────────────────── small fetch helpers ─────────────────────────── */

async function fetchJson(url, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
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

/* ─────────────────────── Wikipedia (REST summary API) ────────────────────── */

/** Descriptions that mean "this article is NOT about food". */
const NON_FOOD_DESCRIPTION_RE =
  /(film|movie|album|song|band|video game|novel|tv series|television series|politician|actor|actress|cricket|footballer|village|city|town|district|river|mountain|species|genus|surname|given name)/i;

/**
 * Wikimedia thumbnail URLs look like
 *   .../commons/thumb/a/ab/File.jpg/330px-File.jpg?utm_source=...
 * Only standard widths are served to hotlinkers, so we snap the width up to
 * the nearest allowed size (500px makes a crisp hero image). Query strings
 * are preserved. Returns the original URL when it doesn't match the pattern.
 */
function upscaleWikimediaThumb(url, targetWidth = 500) {
  return url.replace(
    /\/(\d{2,4})px-([^/?#]+)(\?[^#]*)?$/,
    (match, width, rest, query = "") => {
      const current = Number(width);
      if (current >= targetWidth) return match;
      const snapped =
        ALLOWED_THUMB_WIDTHS.find((w) => w >= targetWidth) ??
        ALLOWED_THUMB_WIDTHS[ALLOWED_THUMB_WIDTHS.length - 1];
      return `/${snapped}px-${rest}${query}`;
    }
  );
}

async function fromWikipedia(name) {
  if (!name) return null;
  const data = await paced(() =>
    fetchJson(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`
    )
  );
  if (!data || data.type === "disambiguation") return null;
  if (NON_FOOD_DESCRIPTION_RE.test(data.description || "")) return null;

  const thumb = data.thumbnail?.source || data.originalimage?.source;
  if (!thumb) return null;

  return {
    url: upscaleWikimediaThumb(thumb),
    source: "wikipedia",
    credit: "Photo via Wikimedia Commons",
  };
}

/* ───────────────────────────── TheMealDB (free) ──────────────────────────── */

const STOPWORDS = new Set([
  "the", "and", "with", "style", "quick", "easy", "homestyle", "best",
  "restaurant", "smoky", "spicy", "authentic", "classic", "fresh",
]);

function significantWords(name) {
  return (name || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .split(/[^a-z]+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

async function fromMealDb(name) {
  if (!name) return null;
  const core = (name || "").replace(/\(.*?\)/g, " ").trim();
  if (!core) return null;

  const data = await paced(() =>
    fetchJson(
      `https://themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(core)}`
    )
  );
  const meals = data?.meals;
  if (!Array.isArray(meals) || meals.length === 0) return null;

  const wanted = new Set(significantWords(core));
  // Require real word overlap so "paneer tikka" never matches "tikka masala pasta".
  const match =
    meals.find((m) => {
      const words = significantWords(m.strMeal || "");
      const overlap = words.filter((w) => wanted.has(w)).length;
      return overlap >= Math.min(wanted.size, 2);
    }) || null;
  if (!match?.strMealThumb) return null;

  return {
    url: match.strMealThumb,
    source: "themealdb",
    credit: "Photo via TheMealDB",
  };
}

/* ───────────────────────────── public resolution ─────────────────────────── */

/** Build the ordered list of names worth trying for this dish. */
function candidatesFor(dishName, title) {
  const names = [];
  const push = (v) => {
    const clean = (v || "").replace(/\s+/g, " ").trim();
    if (clean && !names.includes(clean)) names.push(clean.slice(0, 80));
  };

  push(dishName);
  if (dishName) push(dishName.replace(/\s*\([^)]*\)\s*/g, " ").trim()); // "Sambar (dish)" → "Sambar"
  push(title?.replace(/^\d+[\s-]*[-\w]*\s+/, "")); // "15-Minute Garlic Dal Tadka" → "Garlic Dal Tadka"

  return names.slice(0, 3);
}

/**
 * Resolve a REAL photo for a dish.
 * @param {string} dishName canonical dish name, e.g. "Paneer tikka"
 * @param {string} [title] full recipe title as fallback
 * @returns {Promise<{url:string, source:string, credit:string}|null>}
 */
export async function resolveDishImage(dishName, title) {
  const key = `${(dishName || "").toLowerCase()}|${(title || "").toLowerCase()}`;
  const cached = resolutionCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.image;

  let image = null;
  for (const name of candidatesFor(dishName, title)) {
    image = await fromWikipedia(name);
    if (image) break;
  }
  if (!image) {
    for (const name of candidatesFor(dishName, title)) {
      image = await fromMealDb(name);
      if (image) break;
    }
  }

  if (resolutionCache.size >= MAX_CACHE) {
    const oldest = resolutionCache.keys().next().value;
    resolutionCache.delete(oldest);
  }
  resolutionCache.set(key, { image, expires: Date.now() + CACHE_TTL_MS });
  return image;
}
