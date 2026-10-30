'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Youtube, BadgeCheck, Search, CookingPot } from 'lucide-react';
import { thumbnailUrl, videoHref } from '@/lib/video';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  RECIPE MEDIA — a real photograph of the real dish. Never AI-generated.
 * ══════════════════════════════════════════════════════════════════════════
 *
 *  Renders the actual thumbnail of a REAL, server-verified YouTube cooking
 *  video of the same canonical dish — i.e. a genuine photo taken by a real
 *  cook of the real food. The id was proven to exist (HTTP 200 from
 *  YouTube's CDN) before this component ever receives it.
 *
 *  Defensive layers (an image can NEVER appear broken):
 *  1. No verified video → branded gradient placeholder + YouTube search link.
 *  2. Thumbnail fails to load at runtime → same graceful fallback.
 *
 *  variant="hero"  → large banner for the recipe detail view (clickable).
 *  variant="card"  → compact preview for selector/saved cards (visual only,
 *                    so it can live inside another interactive element).
 */

export default function RecipeMedia({ recipe, variant = 'hero', className = '' }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const id = recipe?.youtubeVideoId || null;
  const verified = Boolean(recipe?.videoVerified);
  const channel = recipe?.youtubeChannel || null;
  const title = recipe?.canonicalDish || recipe?.title || 'this dish';
  const href = videoHref({ youtubeVideoId: id, title: recipe?.canonicalDish || recipe?.title });
  const src = id && !failed ? thumbnailUrl(id) : null;

  /* ── Real photograph path ──────────────────────────────────────────── */
  if (src) {
    const image = (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`Real photo of ${title}${channel ? ` from ${channel}'s kitchen` : ''}`}
          loading={variant === 'card' ? 'lazy' : 'eager'}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${
            loaded ? 'scale-100 opacity-100 blur-0' : 'scale-105 opacity-0 blur-md'
          } group-hover:scale-[1.06]`}
        />
        {!loaded && !failed && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-emerald-200/60 via-green-100/60 to-teal-200/60 dark:from-emerald-900/50 dark:via-green-950/50 dark:to-teal-900/50" />
        )}
        {/* Legibility veil + play affordance */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/40 transition-transform duration-300 group-hover:scale-110">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" />
            <Play size={22} className="translate-x-[1px] fill-white text-white" />
          </span>
        </div>
        {/* Real-video badges */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-2 p-3">
          <div className="flex flex-col gap-1.5">
            {channel && (
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                <Youtube size={13} className="shrink-0 text-red-400" />
                <span className="truncate">{channel}</span>
              </span>
            )}
            {verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                <BadgeCheck size={11} /> Real video
              </span>
            )}
          </div>
          {variant === 'card' && (
            <span className="rounded-full bg-white/90 p-1.5 text-emerald-700 shadow-md">
              <Play size={12} className="fill-emerald-700" />
            </span>
          )}
        </div>
      </>
    );

    if (variant === 'card') {
      return (
        <div className={`group relative aspect-[16/10] w-full overflow-hidden bg-emerald-50 dark:bg-emerald-950/40 ${className}`}>
          {image}
        </div>
      );
    }

    return (
      <motion.a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={`group relative block aspect-video w-full overflow-hidden rounded-2xl bg-emerald-50 shadow-lg shadow-emerald-900/10 ring-1 ring-emerald-900/10 dark:bg-emerald-950/40 dark:ring-emerald-100/10 ${className}`}
        aria-label={`Watch a real ${title} cooking video on YouTube`}
      >
        {image}
      </motion.a>
    );
  }

  /* ── Graceful fallback: no verified video → search, never a blank hole ── */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={`group relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-gradient-to-br from-emerald-100 via-green-50 to-teal-100 dark:from-emerald-900/60 dark:via-green-950/60 dark:to-teal-900/60 ring-1 ring-emerald-600/10 dark:ring-emerald-100/10 ${
        variant === 'hero' ? 'md:aspect-video' : ''
      } ${className}`}
    >
      <CookingPot
        className="absolute -right-4 -bottom-4 h-24 w-24 text-emerald-600/10 dark:text-emerald-300/10"
        aria-hidden="true"
      />
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
          <CookingPot size={20} />
        </span>
        <p className="text-xs font-medium text-emerald-800/80 dark:text-emerald-200/80">
          {variant === 'hero' ? 'Watch a real cook make this' : 'Video available'}
        </p>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md active:scale-95"
        >
          <Search size={12} />
          Find on YouTube
        </a>
      </div>
    </motion.div>
  );
}
