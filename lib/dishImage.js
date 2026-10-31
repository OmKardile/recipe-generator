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
/** Misses are re-tryable soon: a transient 429/timeout must not blank a
 * dish's photo for a whole day. Real photos, once found, cache long. */
const NEGATIVE_CACHE_TTL_MS = 5 * 60 * 1000;
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

async function fetchOnce(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      cache: "no-store",
    });
    if (res.ok) return { value: await res.json(), retryable: false };
    // 404 = genuine miss (never retried); 429/5xx = transient → retry once.
    return { value: null, retryable: res.status === 429 || res.status >= 500 };
  } catch {
    return { value: null, retryable: true }; // timeout / network hiccup
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, timeoutMs = FETCH_TIMEOUT_MS) {
  const first = await fetchOnce(url, timeoutMs);
  if (first.value !== null || !first.retryable) return first.value;
  // One polite retry after a short backoff — Wikipedia rate-limits bursts, and
  // a single blip should never cost a dish its photo.
  await new Promise((r) => setTimeout(r, 600));
  const second = await fetchOnce(url, timeoutMs);
  return second.value;
}

/* ─────────────────────── Wikipedia (REST summary API) ────────────────────── */

/** Descriptions that mean "this article is NOT about food". */
const NON_FOOD_DESCRIPTION_RE =
  /(film|movie|album|song|band|video game|novel|tv series|television series|politician|actor|actress|cricket|footballer|village|city|town|district|river|mountain|species|genus|surname|given name|motor vehicle|automobile|car|truck|motorcycle|aircraft|airliner|ship|submarine|train|locomotive|software|website|company|corporation|brand|ecoregion|desert|festival|holiday|ethnic group|language|surname|football club|stadium|airport|station)/i;

/** Descriptions / titles that mean "this article IS about food". */
const FOODISH_PAGE_RE =
  /\b(dish|dishes|food|foods|cuisine|culinary|recipe|recipes|snack|snacks|curry|curries|rice|breads?|flatbread|sweet|dessert|desserts|soup|stew|pickle|pickles|porridge|pancake|fritters?|dumplings?|gravy|masala|dal|biryani|pulao|pulav|roti|paratha|naan|idli|dosa|vada|kebab|tikka|paneer|kofta|kheer|halwa|sabzi|chaat|chutney|lassi|bhorta|bhuna|thoran|pachadi|raita|raitha|sambar|rasam|appam|bonda|pakora|bhaji|samosa|kachori|barfi|laddu|ladu|jalebi|kulfi|falooda)\b/i;

/** Generic "this search hit is a disambiguation stub" descriptions. */
const DISAMBIGUATION_HINT_RE =
  /(topics referred to by the same term|disambiguation|may refer to)/i;

/** Title words so generic that sharing them proves nothing ("fry", "curry"…):
 * "Bhindi fry" must never pass for "Bombil fry" just because both say "fry". */
const GENERIC_TITLE_WORDS = new Set([
  "fry", "curry", "masala", "dry", "gravy", "snack", "sweet", "dish",
  "food", "style", "spicy", "hot", "mix", "fried", "cooked", "recipe",
]);

/** Significant (non-generic) words of a dish name, for relevance matching. */
function significantTitleWords(name) {
  return (name || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w) && !GENERIC_TITLE_WORDS.has(w));
}

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

/**
 * Search fallback for dishes whose article lives under a different title —
 * e.g. "Poha" (a disambiguation page) whose photo lives on "Flattened rice"
 * or "Indori poha", or "Bonda" whose article is "Bonda (snack)". We ask
 * Wikipedia's search which result is the FOOD article, then resolve its
 * summary photo.
 *
 * A result qualifies only when it carries its own photo (disambiguation
 * stubs never do), isn't a "List of…", isn't a film/person/place, and reads
 * food-ish — so we never drift off-topic.
 */
async function fromWikipediaSearch(name) {
  if (!name) return null;
  const data = await paced(() =>
    fetchJson(
      `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(name)}&limit=6`
    )
  );
  const pages = Array.isArray(data?.pages) ? data.pages : [];
  const queryWords = significantTitleWords(name);

  // Relevance scoring: a food-ish DESCRIPTION beats a food-ish title ("Subaru
  // Sambar" contains "sambar" but its description says "motor vehicle"), and
  // the hit must share at least one NON-generic word with the dish name, so
  // close cousins like "Bhindi fry" can never stand in for "Bombil fry".
  const scored = [];
  for (const p of pages) {
    const rawKey = String(p.key || "");
    const title = rawKey.replace(/_/g, " ");
    if (!rawKey || /^list[_ ]of/i.test(rawKey) || /[:/]/.test(rawKey)) continue;
    const description = String(p.description || "");
    if (DISAMBIGUATION_HINT_RE.test(description)) continue;
    if (NON_FOOD_DESCRIPTION_RE.test(description)) continue;
    if (!p.thumbnail?.url) continue; // no photo → no point

    const descFoodish = FOODISH_PAGE_RE.test(description);
    const titleFoodish = FOODISH_PAGE_RE.test(title);
    if (!descFoodish && !titleFoodish) continue;

    const titleWords = new Set(
      title.toLowerCase().replace(/\(.*?\)/g, " ").split(/[^a-z]+/).filter(Boolean)
    );
    const shared = queryWords.filter((w) => titleWords.has(w));
    if (shared.length === 0) continue; // off-topic hit — never stand in

    scored.push({ key: rawKey, score: (descFoodish ? 2 : 0) + shared.length });
  }

  // Try the top two candidates — a transient failure on one shouldn't sink
  // the lookup. Stable sort keeps Wikipedia's own ranking for ties.
  scored.sort((a, b) => b.score - a.score);
  for (const { key } of scored.slice(0, 2)) {
    const image = await fromWikipedia(key);
    if (image) return image;
  }
  return null;
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
  if (dishName && /[^s]s$/i.test(dishName) && dishName.length > 4) {
    push(dishName.slice(0, -1)); // plural → singular: "Thorans" → "Thoran"
  }
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
    // Article title ≠ dish name ("Poha" → "Flattened rice"): let Wikipedia's
    // search pick the food article, then take its photo.
    const primary = candidatesFor(dishName, title)[0];
    image = await fromWikipediaSearch(primary);
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
  resolutionCache.set(key, {
    image,
    expires: Date.now() + (image ? CACHE_TTL_MS : NEGATIVE_CACHE_TTL_MS),
  });
  return image;
}
