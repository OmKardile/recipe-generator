"use client";

import { useState } from "react";
import { CookingPot } from "lucide-react";

/**
 * An <img> for REAL remote photos with a graceful degradation chain.
 *
 * `sources` is an ordered list of candidate URLs (e.g. the Wikipedia photo,
 * then a verified YouTube video thumbnail, then a smaller thumbnail). Each
 * onError advances to the next candidate; when all fail — or none were
 * provided — a branded steel placeholder is rendered instead. A broken
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
        className={`media-ph ${className}`}
        style={{ aspectRatio: "16 / 9", width: "100%" }}
        role="img"
        aria-label={alt || "Recipe image unavailable"}
      >
        <CookingPot size={28} strokeWidth={1.25} />
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
      className={className}
      style={{ aspectRatio: "16 / 9", width: "100%", objectFit: "cover" }}
    />
  );
}
