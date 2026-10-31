"use client";

import { useEffect, useState } from "react";

/**
 * Client-side cache of resolved real photos, shared between the recipe
 * selector cards and the full recipe view so each dish is fetched once.
 * key → { url, source, credit } | null
 */
const mediaCache = new Map();
const MAX_CACHE = 120;

/**
 * Resolve the REAL photo for a recipe's canonical dish.
 *
 * @param {{dishName?: string, title?: string, youtubeVideoId?: string|null}} recipe
 * @returns {{ media: {url:string, source:string, credit:string}|null, loading: boolean }}
 */
export default function useRecipeMedia({ dishName, title, youtubeVideoId }) {
  const key = (dishName || title || "").toLowerCase();

  // State is keyed by dish; when the dish changes we synchronously re-derive
  // from the cache (render-time adjustment, the pattern React recommends).
  const [state, setState] = useState(() => ({
    key,
    media: mediaCache.get(key) ?? null,
    loading: key ? !mediaCache.has(key) : false,
  }));

  if (state.key !== key) {
    setState({
      key,
      media: mediaCache.get(key) ?? null,
      loading: key ? !mediaCache.has(key) : false,
    });
  }

  useEffect(() => {
    if (!key || mediaCache.has(key)) return;

    let cancelled = false;

    (async () => {
      let image = null;
      try {
        const params = new URLSearchParams({ dish: dishName || "", title: title || "" });
        const res = await fetch(`/api/recipe-media?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.image?.url) image = data.image;
        }
      } catch {
        // Network hiccup → placeholder; the YouTube layer still works.
      }
      if (cancelled) return;

      if (mediaCache.size >= MAX_CACHE) {
        const oldest = mediaCache.keys().next().value;
        mediaCache.delete(oldest);
      }
      mediaCache.set(key, image);
      setState({ key, media: image, loading: false });
    })();

    return () => {
      cancelled = true;
    };
  }, [key, dishName, title, youtubeVideoId]);

  return { media: state.media, loading: state.loading };
}
