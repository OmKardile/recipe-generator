"use client";

import { motion } from "framer-motion";
import { PlayCircle, Youtube, Camera, CookingPot } from "lucide-react";
import MediaImage from "./MediaImage";
import { youtubeWatchUrl, youtubeSearchUrl, youtubeThumbnailSources } from "@/lib/video";

/**
 * The real-media hero for a recipe.
 *
 * HARD PRODUCT RULE — REAL MEDIA ONLY:
 *   • The photo is a REAL photograph of this real dish (Wikipedia/Commons →
 *     TheMealDB → thumbnail of a server-verified YouTube video of the dish).
 *   • Nothing here is ever AI-generated; when no real photo exists a branded
 *     emerald placeholder is shown instead.
 *   • The video layer only ever links a verified video id, or a YouTube
 *     search for the canonical dish name — a link that can never 404.
 */
export default function RecipeMedia({ dishName, title, youtubeVideoId, media, loading }) {
  const watchUrl = youtubeWatchUrl(youtubeVideoId);
  const isLoading = Boolean(loading);
  const searchUrl = youtubeSearchUrl(dishName || title);
  const videoThumbs = youtubeThumbnailSources(youtubeVideoId);

  // Ordered fallback chain: clean dish photo first, then the verified
  // video's thumbnails (still real images of the real dish).
  const heroSources = [...(media?.url ? [media.url] : []), ...videoThumbs];
  const usingPhoto = Boolean(media?.url);
  const credit = usingPhoto
    ? media.credit
    : videoThumbs.length
      ? "Video still · YouTube"
      : "";

  return (
    <div className="mb-8">
      <motion.div
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="group relative overflow-hidden rounded-2xl shadow-lg shadow-emerald-900/10 ring-1 ring-black/5 dark:ring-white/10"
      >
        {isLoading ? (
          <div
            className="aspect-video w-full bg-gradient-to-br from-emerald-100 via-teal-50 to-lime-100 dark:from-emerald-900/40 dark:via-gray-800 dark:to-teal-900/30 animate-pulse flex items-center justify-center"
            role="status"
            aria-label="Finding a real photo of this dish…"
          >
            <div className="flex flex-col items-center gap-2 text-emerald-500/70 dark:text-emerald-400/50">
              <Camera size={28} />
              <span className="text-xs font-medium tracking-wide">
                Finding a real photo…
              </span>
            </div>
          </div>
        ) : (
          <>
            <MediaImage
              sources={heroSources}
              alt={`Real photo of ${dishName || title}`}
              rounded="rounded-none"
              eager
            />
            {/* Bottom scrim + credit chip on top of the photo */}
            {credit && (
              <>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 to-transparent" />
                <span className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/45 text-white/95 backdrop-blur-sm px-3 py-1 text-[11px] font-medium tracking-wide">
                  <CookingPot size={11} />
                  {credit}
                </span>
              </>
            )}
          </>
        )}
      </motion.div>

      {/* Video layer — verified video, or a search that can never break */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <a
          href={watchUrl || searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={
            watchUrl
              ? "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all hover:-translate-y-0.5 hover:shadow-md"
              : "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all hover:-translate-y-0.5 hover:shadow-md"
          }
        >
          {watchUrl ? (
            <>
              <PlayCircle size={16} />
              Watch this dish on YouTube
            </>
          ) : (
            <>
              <Youtube size={16} />
              Find video recipes on YouTube
            </>
          )}
        </a>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {watchUrl
            ? "Real cooking video · server-verified"
            : "Search results for the real dish name"}
        </span>
      </div>
    </div>
  );
}
