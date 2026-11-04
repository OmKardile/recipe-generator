"use client";

import { PlayCircle, Youtube, Camera } from "lucide-react";
import MediaImage from "./MediaImage";
import { youtubeWatchUrl, youtubeSearchUrl, youtubeThumbnailSources } from "@/lib/video";

/**
 * The real-media hero for a recipe.
 *
 * HARD PRODUCT RULE — REAL MEDIA ONLY:
 *   • The photo is a REAL photograph of this real dish (Wikipedia/Commons →
 *     TheMealDB → thumbnail of a server-verified YouTube video of the dish).
 *   • Nothing here is ever AI-generated; when no real photo exists a branded
 *     placeholder is shown instead.
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
    <div className="media-slot">
      {isLoading ? (
        <div
          className="media-ph dish__photo"
          role="status"
          aria-label="Finding a real photo of this dish…"
        >
          <Camera size={26} />
        </div>
      ) : (
        <>
          <MediaImage
            sources={heroSources}
            alt={`Real photo of ${dishName || title}`}
            eager
          />
          {credit && <span className="media-slot__credit">{credit}</span>}
        </>
      )}

      {/* Video layer — verified video, or a search that can never break */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.9em", marginTop: "0.9em" }}>
        <a
          href={watchUrl || searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn--ghost"
          data-fill
        >
          <span className="fill" aria-hidden="true" />
          {watchUrl ? (
            <>
              <PlayCircle size={15} />
              Watch this dish on YouTube
            </>
          ) : (
            <>
              <Youtube size={15} />
              Find video recipes on YouTube
            </>
          )}
        </a>
        <span className="mono" style={{ textTransform: "none", letterSpacing: "0.02em" }}>
          {watchUrl
            ? "Real cooking video · server-verified"
            : "Search results for the real dish name"}
        </span>
      </div>
    </div>
  );
}
