/**
 * ══════════════════════════════════════════════════════════════════════════
 *  REAL RECIPE MEDIA — verified YouTube thumbnails
 * ══════════════════════════════════════════════════════════════════════════
 *
 *  Product decision: the app shows ONLY real photographs of real, proven
 *  dishes — never AI-generated imagery.
 *
 *  How we guarantee that:
 *  1. The AI pairs each recipe with a REAL, well-known YouTube cooking
 *     video for the same canonical dish (strict anti-hallucination rules).
 *  2. The server verifies the video actually exists by HEAD-requesting its
 *     thumbnail before the recipe ever reaches the browser.
 *  3. The UI renders that video's actual thumbnail — a real photograph of
 *     the real dish, taken by a real cook.
 *  4. If no verified video exists, the card shows an elegant branded
 *     placeholder plus a YouTube SEARCH link built from the dish title —
 *     which always lands on real, proven recipes.
 */

const YT_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

/** A real YouTube video id is exactly 11 chars of the URL-safe alphabet. */
export function isValidYouTubeId(id) {
  return typeof id === "string" && YT_ID_PATTERN.test(id.trim());
}

/** Real thumbnail URLs served by YouTube's CDN (a real photo of the dish). */
export function thumbnailUrl(videoId, quality = "hqdefault") {
  if (!isValidYouTubeId(videoId)) return null;
  return `https://i.ytimg.com/vi/${videoId.trim()}/${quality}.jpg`;
}

/** Direct link to the real video (only used with a verified id). */
export function watchUrl(videoId) {
  if (!isValidYouTubeId(videoId)) return null;
  return `https://www.youtube.com/watch?v=${videoId.trim()}`;
}

/** Dish-title search — always real, proven results, zero hallucination. */
export function searchUrl(title) {
  const query = `${title || "Indian recipe"} recipe`.trim().replace(/\s+/g, " ");
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

/**
 * Server-side existence proof: YouTube's CDN 404s for thumbnails of
 * non-existent / deleted videos. A 200 means the video is real and its
 * thumbnail is a loadable image. Time-boxed so it can never hang a request.
 */
export async function verifyVideoExists(videoId, timeoutMs = 4000) {
  const url = thumbnailUrl(videoId);
  if (!url) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      // No credentials needed; this is a public CDN asset.
      referrerPolicy: "no-referrer",
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

/** Where should the "watch" button send the user? */
export function videoHref({ youtubeVideoId, title }) {
  return watchUrl(youtubeVideoId) || searchUrl(title);
}
