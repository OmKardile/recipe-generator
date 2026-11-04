/**
 * Engine: loader — first-load sequence. The lid.
 * Progress follows REAL work (fonts + critical images), eased by GSAP,
 * 1.1s floor (reads as a designed moment), 2.6s cap (usability).
 * Look is authored in markup/CSS; exit choreography via setLoaderExit.
 */
import { gsap } from "gsap";
import { ease, prefersReducedMotion } from "./env";

let format = (p) => String(Math.round(p)).padStart(3, "0");
export const setLoaderFormat = (fn) => {
  format = fn;
};

let exit = null;
export const setLoaderExit = (fn) => {
  exit = fn;
};

const MIN = 1.1;
const MAX = 2.6;

function criticalAssets() {
  const imgs = [
    ...document.querySelectorAll("img[data-critical], [data-intro] img"),
  ];
  return [
    document.fonts.ready,
    ...imgs.map((i) => (i.complete ? Promise.resolve() : i.decode().catch(() => {}))),
  ];
}

const wait = (s) => new Promise((r) => setTimeout(r, s * 1000));

function finish(root) {
  root.hidden = true;
  document.documentElement.classList.add("is-loaded");
}

export async function runLoader() {
  const root = document.getElementById("loader");
  if (!root) return;
  if (prefersReducedMotion()) {
    await Promise.race([Promise.all(criticalAssets()), wait(MAX)]);
    await gsap.to(root, { autoAlpha: 0, duration: 0.3 });
    return finish(root);
  }
  const count = root.querySelector("[data-loader-count]");
  const bar = root.querySelector("[data-loader-bar]");
  const tasks = criticalAssets();
  let done = 0;
  const shown = { v: 0 };
  const target = { v: 0 };
  tasks.forEach((t) =>
    t.then(() => {
      done++;
      target.v = (done / tasks.length) * 100;
    })
  );
  const start = performance.now();

  await new Promise((resolve) => {
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      const timeCap = Math.min(100, (elapsed / MIN) * 100);
      const goal = elapsed > MAX ? 100 : Math.min(target.v, timeCap);
      shown.v += (goal - shown.v) * 0.12;
      if (goal === 100 && shown.v > 99.5) shown.v = 100;
      if (count) count.textContent = format(shown.v);
      if (bar) bar.style.transform = `scaleX(${shown.v / 100})`;
      if (shown.v === 100) {
        gsap.ticker.remove(tick);
        resolve();
      }
    };
    gsap.ticker.add(tick);
  });

  // The lid lifts: counter exits up, then the steel sheet clips off the top.
  if (exit) {
    await exit(root);
    return finish(root);
  }
  await gsap
    .timeline()
    .to(root.querySelectorAll("[data-loader-out]"), {
      yPercent: -110,
      duration: 0.6,
      ease: ease.inOut,
      stagger: 0.05,
    })
    .to(root, { clipPath: "inset(0% 0% 100% 0%)", duration: 0.9, ease: ease.inOut }, "-=0.3");
  finish(root);
}
