/**
 * Engine: index — lifecycle core (no GL, no route curtain: this app is a
 * single view with tier tabs, so the adapter only boots).
 * onPage(fn) lets components register per-page motion inside a gsap.context
 * that is reverted cleanly. usePage(fn) (components/EngineUsePage) wraps it.
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { initScroll, startScroll, stopScroll } from "./scroll";
import { initReveals } from "./reveal";
import { runLoader } from "./loader";
import { prefersReducedMotion } from "./env";

gsap.registerPlugin(ScrollTrigger);

export { onScroll, scrollState, scrollToTarget, stopScroll, startScroll } from "./scroll";
export { setLoaderFormat, setLoaderExit } from "./loader";
export { ease, isTouch, isMobile, prefersReducedMotion } from "./env";

const pageFns = new Set();
const cleanups = [];
let ctx = null;
let intro = null;
let ready = false;
let booted = false;

/** Run fn on every page load (and now, if a page is ready). Returns unsubscribe. */
export function onPage(fn) {
  pageFns.add(fn);
  if (ready) runPageFn(fn);
  return () => {
    pageFns.delete(fn);
  };
}

function runPageFn(fn) {
  ctx?.add(() => {
    const c = fn({ intro: intro, path: location.pathname });
    if (typeof c === "function") cleanups.push(c);
  });
}

export function syncFlags() {
  const h = document.documentElement.classList;
  h.add("js");
  h.toggle("motion", !prefersReducedMotion());
}

function initPage() {
  syncFlags();
  ctx = gsap.context(() => {
    intro = initReveals(document);
  });
  ready = true;
  pageFns.forEach(runPageFn);
  requestAnimationFrame(() => ScrollTrigger.refresh());
}

/** First load. `setup` registers global motion (loader exit, fills) before the page. */
export async function boot(setup) {
  if (booted) return;
  booted = true;
  syncFlags();
  initScroll();
  setup?.();
  stopScroll();
  initPage();
  await runLoader();
  startScroll();
  intro?.play();
}

/** Re-init after a big DOM change (tier swap of heavy content). */
export function reinit() {
  if (!booted) return;
  initPage();
}
