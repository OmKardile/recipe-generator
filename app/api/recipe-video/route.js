import { NextResponse } from "next/server";
import { buildVideoQuery } from "@/lib/prompts";
import { searchMealDb } from "@/lib/mealDb";

/**
 * POST /api/recipe-video — find a REAL video tutorial for a recipe.
 *
 * Honesty chain (never a hallucinated URL):
 *   1. YouTube Data API v3 — when YOUTUBE_API_KEY is configured, ranked toward
 *      actual "recipe / how to" uploads. Returns a specific watch URL.
 *   2. TheMealDB — curated tutorial links for well-known dishes (name-verified).
 *   3. Honest fallback — a precise youtube.com/results search link. Always
 *      relevant, never fake.
 */

export const maxDuration = 30;

const YT_TIMEOUT_MS = 8_000;

const memo = new Map(); // cacheKey → { payload, ts }
const MEMO_TTL_MS = 6 * 60 * 60 * 1000;
const MEMO_MAX = 120;

function validate(body) {
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : "";
  if (!title) return null;
  return {
    title,
    cuisine: typeof body?.cuisine === "string" ? body.cuisine.trim().slice(0, 60) : "",
  };
}

function extractYoutubeId(url) {
  const match = String(url || "").match(
    /(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function fromVideoId(id, { title, channel, source, thumbnail, searchQuery }) {
  return {
    videoId: id,
    url: `https://www.youtube.com/watch?v=${id}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`,
    thumbnail: thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    title: title || "",
    channel: channel || "",
    source,
    searchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery || "easy recipe")}`,
  };
}

async function youtubeSearch(query, apiKey) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), YT_TIMEOUT_MS);
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "video");
    url.searchParams.set("maxResults", "6");
    url.searchParams.set("q", query);
    url.searchParams.set("key", apiKey);

    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;

    const data = await res.json();
    const items = Array.isArray(data?.items)
      ? data.items.filter((i) => i?.id?.videoId)
      : [];
    if (items.length === 0) return null;

    // Rank toward genuine recipe tutorials rather than vlogs or shorts compilations.
    const score = (item) => {
      const haystack = `${item.snippet?.title || ""} ${item.snippet?.channelTitle || ""}`.toLowerCase();
      let s = 0;
      if (haystack.includes("recipe")) s += 3;
      if (haystack.includes("how to") || haystack.includes("how to make")) s += 2;
      if (haystack.includes("easy") || haystack.includes("homemade") || haystack.includes("restaurant style")) s += 1;
      return s;
    };
    const best = [...items].sort((a, b) => score(b) - score(a))[0];

    return fromVideoId(best.id.videoId, {
      title: best.snippet?.title || "",
      channel: best.snippet?.channelTitle || "",
      source: "youtube",
      searchQuery: query,
      thumbnail:
        best.snippet?.thumbnails?.high?.url ||
        `https://i.ytimg.com/vi/${best.id.videoId}/hqdefault.jpg`,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input = validate(body);
  if (!input) {
    return NextResponse.json({ error: "A recipe title is required." }, { status: 400 });
  }

  const cacheKey = input.title.toLowerCase();
  const cached = memo.get(cacheKey);
  if (cached && Date.now() - cached.ts < MEMO_TTL_MS) {
    return NextResponse.json(cached.payload);
  }

  const query = buildVideoQuery(input);
  let payload = null;

  // 1. YouTube Data API (optional key) — a specific, ranked, real video.
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey) {
    payload = await youtubeSearch(query, apiKey);
  }

  // 2. TheMealDB curated tutorial for known dishes.
  if (!payload) {
    const meal = await searchMealDb(input.title);
    const id = meal?.youtube ? extractYoutubeId(meal.youtube) : null;
    if (id) {
      payload = fromVideoId(id, {
        title: `${meal.name} — video tutorial`,
        channel: meal.category || meal.area || "",
        source: "themealdb",
        searchQuery: query,
      });
    }
  }

  // 3. Honest search link — relevant results, zero fake URLs.
  if (!payload) {
    payload = {
      videoId: null,
      url: null,
      embedUrl: null,
      thumbnail: null,
      title: "",
      channel: "",
      source: "search",
      searchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
    };
  }

  if (memo.size >= MEMO_MAX) {
    const oldest = memo.keys().next().value;
    memo.delete(oldest);
  }
  memo.set(cacheKey, { payload, ts: Date.now() });

  return NextResponse.json(payload);
}
