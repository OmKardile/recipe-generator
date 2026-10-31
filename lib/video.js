/**
 * YouTube helpers — REAL videos only.
 *
 * The product rule: this app never shows AI-generated imagery. The video layer
 * is built exclusively from REAL, well-known YouTube cooking videos:
 *
 *   1. The AI may propose an exact video ID only when it is certain (the
 *      prompt forbids guessing; uncertain → null).
 *   2. The SERVER then independently verifies every proposed ID with a cheap
 *      HTTP HEAD against the i.ytimg.com thumbnail CDN — a 404 means the
 *      video does not exist (or was removed), and the ID is silently dropped.
 *   3. The client only ever renders IDs that survived verification. When no
 *      verified video exists, the UI links to a YouTube *search* for the
 *      canonical dish name — a link that can never 404.
 */

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const VERIFY_TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // verified-valid results hold for a day
/** A failed check may have been a transient network blip — re-check sooner. */
const NEGATIVE_CACHE_TTL_MS = 5 * 60 * 1000;

/** Verified-invalid / verified-valid results, keyed by video id. */
const verificationCache = new Map();
const MAX_CACHE = 500;

export function isValidVideoIdShape(videoId) {
  return typeof videoId === "string" && VIDEO_ID_RE.test(videoId);
}

/**
 * Verify that a YouTube video actually exists by requesting its thumbnail.
 * i.ytimg.com answers 404 for deleted / private / never-existed videos and
 * 200 (with image bytes) for real ones — a free, keyless existence check.
 *
 * @param {string} videoId
 * @returns {Promise<boolean>}
 */
export async function verifyVideoExists(videoId) {
  if (!isValidVideoIdShape(videoId)) return false;

  const cached = verificationCache.get(videoId);
  if (cached && cached.expires > Date.now()) return cached.valid;

  let valid = false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);
    const res = await fetch(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, {
      method: "HEAD",
      signal: controller.signal,
      // A descriptive UA — ytimg is fine with HEAD, but be a good citizen.
      headers: { "User-Agent": "recipe-generator/1.0 (+https://github.com/OmKardile/recipe-generator)" },
      cache: "no-store",
    });
    clearTimeout(timer);
    valid = res.ok;
  } catch {
    // Network error / timeout → treat as unverified (never show a broken id).
    valid = false;
  }

  if (verificationCache.size >= MAX_CACHE) {
    const oldest = verificationCache.keys().next().value;
    verificationCache.delete(oldest);
  }
  verificationCache.set(videoId, {
    valid,
    expires: Date.now() + (valid ? CACHE_TTL_MS : NEGATIVE_CACHE_TTL_MS),
  });
  return valid;
}

/** Canonical watch URL for a verified video id. */
export function youtubeWatchUrl(videoId) {
  return isValidVideoIdShape(videoId) ? `https://www.youtube.com/watch?v=${videoId}` : null;
}

/** A search-results URL for the dish — the fallback that can never break. */
export function youtubeSearchUrl(dishName) {
  const query = `${dishName || ""} recipe`.trim().replace(/\s+/g, " ");
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

/** Thumbnail candidates for a verified video, best quality first. */
export function youtubeThumbnailSources(videoId) {
  if (!isValidVideoIdShape(videoId)) return [];
  return [
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
  ];
}
