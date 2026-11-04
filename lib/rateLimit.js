/**
 * Minimal in-memory rate limiter — no dependencies, per-process.
 * AI generation routes use it to stay polite to the Gemini quota and to
 * shield the app from accidental request storms.
 */

const buckets = new Map();

/**
 * @param {string} key   caller key (e.g. ip + route)
 * @param {number} limit requests allowed per window
 * @param {number} windowMs
 * @returns {boolean} true when the request is allowed
 */
export function rateLimit(key, limit = 8, windowMs = 60_000) {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now - entry.start > windowMs) {
    buckets.set(key, { start: now, count: 1 });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

/** Extract a client IP from Next request headers (best-effort, privacy-safe). */
export function clientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'local';
}

/** Guard map for in-flight AI generations (prevents duplicate submissions). */
const inFlight = new Map();

export function startGeneration(key) {
  if (inFlight.has(key)) return false;
  inFlight.set(key, Date.now());
  // Safety valve: entries older than 5 minutes are stale, clear them.
  for (const [k, t] of inFlight) {
    if (Date.now() - t > 300_000) inFlight.delete(k);
  }
  return true;
}

export function endGeneration(key) {
  inFlight.delete(key);
}
