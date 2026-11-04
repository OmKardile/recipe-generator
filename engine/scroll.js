/**
 * Engine: scroll — Lenis smooth scroll on ONE clock (the GSAP ticker).
 * Reduced motion → native scroll. Publishes a scroll feed (y, velocity,
 * progress) for the floating photo preview and future consumers.
 */
import Lenis from "lenis";
import { gsap } from "gsap";
import { prefersReducedMotion } from "./env";

let lenis = null;
const listeners = new Set();
const state = { y: 0, velocity: 0, progress: 0 };

function nativeTick() {
  const max = document.documentElement.scrollHeight - innerHeight;
  state.velocity = scrollY - state.y;
  state.y = scrollY;
  state.progress = max > 0 ? scrollY / max : 0;
  listeners.forEach((fn) => fn(state));
}

export function initScroll() {
  if (lenis || prefersReducedMotion()) {
    if (!lenis) addEventListener("scroll", nativeTick, { passive: true });
    return;
  }
  lenis = new Lenis({
    lerp: 0.1,
    wheelMultiplier: 1,
    touchMultiplier: 1.2,
    anchors: true,
  });
  lenis.on("scroll", (l) => {
    state.y = l.scroll;
    state.velocity = l.velocity;
    state.progress = l.limit > 0 ? l.scroll / l.limit : 0;
    listeners.forEach((fn) => fn(state));
  });
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

export const onScroll = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const scrollState = () => state;
export const stopScroll = () => lenis?.stop();
export const startScroll = () => lenis?.start();

export function resetScroll() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
  else scrollTo(0, 0);
  state.y = 0;
  state.velocity = 0;
}

export function scrollToTarget(target) {
  if (lenis) lenis.scrollTo(target, { duration: 1.2 });
  else if (typeof target === "number") scrollTo({ top: target });
  else document.querySelector(target)?.scrollIntoView();
}
