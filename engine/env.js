/**
 * Engine: env — media queries + the shared easing vocabulary.
 * Ported from the awwwards motion engine (plain JS for this repo).
 * No DOM access at import time: SSR-safe.
 */

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const isTouch = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(hover: none), (pointer: coarse)").matches;

export const isMobile = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(max-width: 767px)").matches;

// Shared easing family. "Lift and settle" lives here: expo entrances with
// a whisper of overshoot on the things that "land".
export const ease = {
  out: "expo.out", // default entrance
  settle: "back.out(1.2)", // steel landing: 1-2% overshoot, used sparingly
  inOut: "expo.inOut", // loader, panels
  soft: "power3.out", // small UI
};
