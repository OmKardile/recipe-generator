"use client";

import { Play, Youtube } from "lucide-react";
import MediaImage from "./MediaImage";
import { youtubeWatchUrl, youtubeSearchUrl, youtubeThumbnailSources } from "@/lib/video";

/**
 * The quiet media row for a recipe.
 *
 * PLACEMENT RULE (user-directed): the photo is NOT the headline. The recipe
 * title, description and data own the top of the page; media lives in a
 * slim row beside the text, sized like a video chip — peripheral, out of
 * the eye's main line. YouTube is the PREFERRED medium, so the video CTA
 * is the visually strong element here and the photo only backs it up.
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

  const linkUrl = watchUrl || searchUrl;

  return (
    <div className="media-row">
      {/* Small, quiet dish thumbnail — links to the same video destination */}
      {isLoading ? (
        <span className="media-row__thumb" role="status" aria-label="Finding a real photo of this dish…">
          <span className="media-row__thumb-loading" />
        </span>
      ) : (
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="media-row__thumb"
          aria-label={`Watch a real video of ${dishName || title} on YouTube`}
        >
          <MediaImage
            sources={heroSources}
            alt={`Real photo of ${dishName || title}`}
            variant="thumb"
            eager
          />
          <span className="media-row__play" aria-hidden="true">
            <Play size={13} fill="currentColor" />
          </span>
        </a>
      )}

      {/* The preferred medium: a clear, recognizable YouTube CTA */}
      <div className="media-row__body">
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn--yt"
          data-fill
        >
          <span className="fill" aria-hidden="true" />
          {watchUrl ? <Play size={15} fill="currentColor" /> : <Youtube size={15} />}
          {watchUrl ? "Watch this dish on YouTube" : "Find video recipes on YouTube"}
        </a>
        <span className="media-row__credit mono">
          {watchUrl ? "Server-verified cooking video" : "Search for the real dish name"}
          {credit ? ` · Photo: ${credit}` : ""}
        </span>
      </div>
    </div>
  );
}
