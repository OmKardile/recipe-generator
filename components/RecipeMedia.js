"use client";

import { useEffect, useState } from "react";
import {
  PiSparkleFill,
  PiCameraFill,
  PiPaletteFill,
  PiPlayFill,
  PiYoutubeLogoFill,
  PiArrowSquareOutFill,
} from "react-icons/pi";
import { foodArtDataUri } from "@/lib/foodArt";

/**
 * Accurate media for a recipe:
 *  - Image: /api/recipe-image (AI photograph of THIS dish → real MealDB photo
 *    of the named dish → deterministic artwork). Never a random image.
 *  - Video: /api/recipe-video (real YouTube tutorial via API key or MealDB,
 *    else an honest search link). Never a hallucinated URL.
 */

const IMAGE_STATUS = [
  "Styling the dish…",
  "Focusing the lens…",
  "Adjusting the lighting…",
];

const SOURCE_BADGES = {
  "ai-generated": { label: "AI-styled photo", Icon: PiSparkleFill },
  themealdb: { label: "Photo · TheMealDB", Icon: PiCameraFill },
  artwork: { label: "Kitchen artwork", Icon: PiPaletteFill },
};

export default function RecipeMedia({ recipe }) {
  const title = recipe?.title || "";
  const cuisine = recipe?.cuisine || "";
  const description = recipe?.description || "";
  const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];

  const mediaKey = `${title}::${cuisine}`;

  const [loadedKey, setLoadedKey] = useState(mediaKey);
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [imgShown, setImgShown] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);

  // Render-phase adjustment (the React-endorsed way to reset on prop change):
  // when the dish changes, clear the previous media so skeletons reappear.
  if (mediaKey !== loadedKey) {
    setLoadedKey(mediaKey);
    setImage(null);
    setVideo(null);
    setImgShown(false);
    setPlaying(false);
  }

  const imageLoading = !image || !imgShown;
  const videoLoading = !video;

  useEffect(() => {
    if (!title) return;
    let cancelled = false;

    fetch("/api/recipe-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, cuisine, description, ingredients, mode: "hero" }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("image failed"))))
      .then((data) => {
        if (!cancelled && data?.image) setImage(data);
        else if (!cancelled) throw new Error("no image");
      })
      .catch(() => {
        if (!cancelled) {
          setImage({ image: foodArtDataUri(title, cuisine), source: "artwork", alt: title });
        }
      });

    fetch("/api/recipe-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, cuisine }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("video failed"))))
      .then((data) => {
        if (!cancelled) setVideo(data);
      })
      .catch(() => {
        if (!cancelled) {
          setVideo({
            source: "search",
            searchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(
              `${title} recipe`
            )}`,
          });
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaKey]);

  useEffect(() => {
    if (!imageLoading) return;
    const interval = setInterval(
      () => setStatusIndex((i) => (i + 1) % IMAGE_STATUS.length),
      2400
    );
    return () => clearInterval(interval);
  }, [imageLoading]);

  if (!title) return null;

  const badge = image ? SOURCE_BADGES[image.source] || SOURCE_BADGES.artwork : null;

  return (
    <div className="space-y-4">
      {/* ── Dish photograph ─────────────────────────────────────────── */}
      <figure className="group relative aspect-[4/3] overflow-hidden rounded-3xl border border-line bg-elev2 shadow-card">
        {imageLoading && (
          <div className="absolute inset-0 grid place-items-center" aria-live="polite" aria-busy="true">
            <div className="shimmer absolute inset-0" aria-hidden />
            <div className="relative flex flex-col items-center gap-3 px-6 text-center">
              <span className="relative inline-flex" aria-hidden>
                <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 gap-[3px]">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="block h-3 w-1 rounded-full bg-herb-400/80 animate-steam"
                      style={{ animationDelay: `${i * 0.55}s` }}
                    />
                  ))}
                </span>
                <PiCameraFill className="text-4xl text-herb-600/80 dark:text-herb-300/80" />
              </span>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-body">
                {IMAGE_STATUS[statusIndex]}
              </p>
            </div>
          </div>
        )}

        {image && (
          <>
            {/* Remote MealDB URLs + data URIs from the image chain — a plain img
                is the only loader that handles both without extra config. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.image}
              alt={image.alt || title}
              className={`h-full w-full object-cover transition-all duration-700 ease-out ${
                imgShown ? "scale-100 opacity-100 group-hover:scale-[1.04]" : "scale-105 opacity-0"
              }`}
              onLoad={() => setImgShown(true)}
              loading="eager"
              decoding="async"
            />
            {badge && (
              <figcaption className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-herb-950/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zest backdrop-blur-sm">
                <badge.Icon size={11} aria-hidden />
                {badge.label}
              </figcaption>
            )}
          </>
        )}
      </figure>

      {/* ── Video tutorial ──────────────────────────────────────────── */}
      {videoLoading ? (
        <div className="flex h-[70px] items-center gap-3 rounded-2xl border border-line bg-elev px-4">
          <div className="shimmer h-9 w-9 rounded-xl" aria-hidden />
          <div className="flex-1 space-y-2">
            <div className="shimmer h-3 w-2/3 rounded-full" aria-hidden />
            <div className="shimmer h-2.5 w-1/3 rounded-full" aria-hidden />
          </div>
        </div>
      ) : video?.videoId ? (
        <div className="overflow-hidden rounded-2xl border border-line bg-elev shadow-card">
          {playing ? (
            <div className="relative aspect-video w-full">
              <iframe
                src={video.embedUrl}
                title={`${title} video tutorial`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="group relative block w-full text-left"
              aria-label={`Play video tutorial for ${title}`}
            >
              <span className="relative flex aspect-video items-center justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={video.thumbnail}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  loading="lazy"
                  decoding="async"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-herb-950/80 via-herb-950/20 to-transparent" />
                <span className="relative grid h-16 w-16 place-items-center rounded-full bg-herb-600/95 text-white shadow-glow transition-transform duration-300 group-hover:scale-110 animate-pulse-ring">
                  <PiPlayFill size={26} className="translate-x-[2px]" aria-hidden />
                </span>
              </span>
              <span className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-chili dark:text-herb-300">
                    <PiYoutubeLogoFill size={12} aria-hidden />
                    Video tutorial
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-semibold text-ink">
                    {video.title || title}
                  </span>
                  {video.channel && (
                    <span className="block truncate text-xs text-body">{video.channel}</span>
                  )}
                </span>
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 rounded-full border border-line p-2 text-body transition-colors hover:border-herb-400 hover:text-herb-600"
                  title="Watch on YouTube"
                  aria-label="Watch on YouTube (opens in a new tab)"
                >
                  <PiArrowSquareOutFill size={15} aria-hidden />
                </a>
              </span>
            </button>
          )}
        </div>
      ) : (
        video?.searchUrl && (
          <a
            href={video.searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-3 rounded-2xl border border-line bg-elev px-4 py-3.5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-chili/50 hover:shadow-lift"
          >
            <span className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-chili/10 text-chili transition-transform duration-300 group-hover:scale-110">
                <PiYoutubeLogoFill size={20} aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">
                  Find the perfect tutorial
                </span>
                <span className="block text-xs text-body">
                  Curated YouTube search for this exact dish
                </span>
              </span>
            </span>
            <PiArrowSquareOutFill
              size={16}
              className="shrink-0 text-body transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-chili"
              aria-hidden
            />
          </a>
        )
      )}
    </div>
  );
}
