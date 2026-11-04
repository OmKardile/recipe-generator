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

  const failed = index >= list.length;

  if (failed || list.length === 0) {
    return (
      <div
        className={`aspect-video w-full ${rounded} bg-gradient-to-br from-emerald-100 via-teal-50 to-lime-100 dark:from-emerald-900/40 dark:via-gray-800 dark:to-teal-900/30 flex items-center justify-center select-none ${className}`}
        role="img"
        aria-label={alt || "Recipe image unavailable"}
      >
        <Icon className="h-10 w-10 text-emerald-400/60 dark:text-emerald-500/40" />
      </div>
    );
  }

  return (
    <img
      src={list[index]}
      alt={alt || "Real photo of this dish"}
      onError={() => setIndex((i) => i + 1)}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      className={`aspect-video w-full object-cover ${rounded} ${className}`}
    />
  );
}
