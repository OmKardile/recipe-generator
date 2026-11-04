"use client";

import { useState } from "react";
import { CookingPot } from "lucide-react";

/**
 * An <img> for REAL remote photos with a graceful degradation chain.
 *
 * `sources` is an ordered list of candidate URLs (e.g. the Wikipedia photo,
 * then a verified YouTube video thumbnail, then a smaller thumbnail). Each
 * onError advances to the next candidate; when all fail — or none were
 * provided — a branded emerald placeholder is rendered instead. A broken
 * image icon is never acceptable.
 *
 * Plain <img> on purpose: the sources live on arbitrary real-world hosts
 * (upload.wikimedia.org, themealdb.com, i.ytimg.com), which is exactly what
 * the onError fallback chain handles best.
 *
 * Transition polish (CSS-only — no animation library):
 *   • The outer box always reserves the aspect-video space, and every layer
 *     is absolutely positioned inside it, so loading can never shift layout.
 *   • The placeholder fades in gently when it appears.
 *   • A candidate image stays fully transparent until its `onLoad` fires,
 *     then crossfades over whatever is beneath it (placeholder, or the
 *     previous photo when the source list changes) with a subtle scale
 *     settle. Because it is invisible until painted, a failing candidate can
 *     never flash broken-content at the user, and the previously shown photo
 *     never blinks while a new one loads — it simply sits underneath until
 *     the new photo has painted, then the fade hands over.
 *   • `prefers-reduced-motion` disables all of the above in globals.css
 *     (see the .media-* rules) so motion-sensitive users get instant,
 *     non-animated swaps.
 *
 * Give it a `key` tied to the recipe when it can be reused across dishes.
 */
export default function MediaImage({
  sources,
  alt,
  className = "",
  rounded = "rounded-2xl",
  placeholderIcon: Icon = CookingPot,
  eager = false,
}) {
  const list = (Array.isArray(sources) ? sources : []).filter(Boolean);
  const [index, setIndex] = useState(0);

  // Reset the fallback chain when the caller swaps the source list — the
  // render-time adjustment pattern recommended by the React docs.
  const signature = list.join("|");
  const [lastSignature, setLastSignature] = useState(signature);
  if (lastSignature !== signature) {
    setLastSignature(signature);
    setIndex(0);
  }

  const candidate = index < list.length ? list[index] : null;
  const failed = !candidate;

  // Crossfade layers. `photo` is the last URL that painted — it stays on the
  // base layer so a source swap never blanks the box while the new photo
  // loads. The candidate rides on top, hidden (opacity 0) until onLoad.
  const [photo, setPhoto] = useState(null);
  const [topUrl, setTopUrl] = useState(null);
  const [topReady, setTopReady] = useState(false);

  // When the candidate changes: a painted top layer is promoted to the base
  // (kept visible while the next candidate loads), and the new candidate
  // starts hidden. An unpainted one (it errored) is dropped silently.
  if (topUrl !== (candidate || null)) {
    if (topUrl && topReady) setPhoto(topUrl);
    setTopUrl(candidate || null);
    setTopReady(false);
  }

  // Total failure (or no sources at all) → branded placeholder, as before.
  if (failed) {
    return (
      <div
        className={`relative aspect-video w-full ${rounded} overflow-hidden ${className}`}
        role="img"
        aria-label={alt || "Recipe image unavailable"}
      >
        <div className="media-placeholder-in absolute inset-0 flex items-center justify-center select-none bg-gradient-to-br from-emerald-100 via-teal-50 to-lime-100 dark:from-emerald-900/40 dark:via-gray-800 dark:to-teal-900/30">
          <Icon className="h-10 w-10 text-emerald-400/60 dark:text-emerald-500/40" />
        </div>
      </div>
    );
  }

  const showTop = candidate !== photo;

  return (
    <div
      className={`relative aspect-video w-full ${rounded} overflow-hidden ${className}`}
      role="img"
      aria-label={alt || "Real photo of this dish"}
    >
      {/* Base layer: the last painted photo, or the placeholder beneath it. */}
      {photo ? (
        <img
          src={photo}
          alt=""
          aria-hidden="true"
          onError={() => setPhoto(null)}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className="media-placeholder-in absolute inset-0 flex items-center justify-center select-none bg-gradient-to-br from-emerald-100 via-teal-50 to-lime-100 dark:from-emerald-900/40 dark:via-gray-800 dark:to-teal-900/30"
          aria-hidden="true"
        >
          <Icon className="h-10 w-10 text-emerald-400/60 dark:text-emerald-500/40" />
        </div>
      )}

      {/* Top layer: the current candidate, revealed only once painted. */}
      {showTop && (
        <img
          key={candidate}
          src={candidate}
          alt=""
          aria-hidden="true"
          data-loaded={topReady ? "true" : "false"}
          onLoad={() => setTopReady(true)}
          onError={() => setIndex((i) => i + 1)}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          draggable={false}
          className="media-img absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}
