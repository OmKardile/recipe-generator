/**
 * Global motion for this site: registered once from Engine before boot.
 * - loader: mono counter, lid-lift exit (authored per DESIGN.md)
 * - parallax: the --px/--py/--sy depth driver (engine/parallax.js)
 * - data-fill buttons: turmeric fill floods from the pointer's entry point
 *   (delegated, so it also covers buttons rendered later)
 * - data-index rows with [data-preview]: the REAL photo of the dish floats
 *   beside the cursor and tilts with velocity (fine pointers only)
 * All motion respects prefers-reduced-motion; CSS covers the fallbacks.
 */
import { gsap } from "gsap";
import { onPage } from "./index";
import { ease, prefersReducedMotion, isTouch } from "./env";
import { initParallax } from "./parallax";

export function setupMotion() {
  // Loader counter: plain percentage in mono numerals.
  // Loader exit is authored in CSS + default timeline (lid lift).
  // (setLoaderFormat/setLoaderExit are engine APIs; defaults fit this design.)

  // The page-wide depth driver — starts its own ticker work and gates
  // reduced motion internally, so it runs even before the early return.
  initParallax();

  if (prefersReducedMotion()) return;

  // ── Button fill from the pointer's side ────────────────────────────────
  const fills = new WeakMap(); // btn → { open, x, y }
  const fillFor = (btn) => {
    if (!fills.has(btn)) {
      const fill = btn.querySelector(".fill");
      if (!fill) return null;
      fills.set(btn, { closed: true, x: 0, y: 0 });
    }
    return fills.get(btn);
  };
  const point = (btn, e) => {
    const r = btn.getBoundingClientRect();
    return `${e.clientX - r.left}px ${e.clientY - r.top}px`;
  };
  const open = (btn, at) => {
    const fill = btn.querySelector(".fill");
    const s = fillFor(btn);
    if (!fill || !s) return;
    if (s.closed) gsap.set(fill, { clipPath: `circle(0% at ${at})` });
    s.closed = false;
    btn.classList.add("is-filled");
    gsap.to(fill, { clipPath: `circle(150% at ${at})`, duration: 0.55, ease: ease.soft, overwrite: true });
  };
  const close = (btn, at) => {
    const fill = btn.querySelector(".fill");
    const s = fillFor(btn);
    if (!fill || !s) return;
    btn.classList.remove("is-filled");
    gsap.to(fill, {
      clipPath: `circle(0% at ${at})`,
      duration: 0.45,
      ease: ease.soft,
      overwrite: true,
      onComplete: () => {
        if (s) s.closed = true;
      },
    });
  };

  const onOver = (e) => {
    const btn = e.target.closest?.("[data-fill]");
    if (btn && !btn.disabled) open(btn, point(btn, e));
  };
  const onOut = (e) => {
    const btn = e.target.closest?.("[data-fill]");
    if (btn) close(btn, point(btn, e));
  };
  document.addEventListener("pointerover", onOver, { passive: true });
  document.addEventListener("pointerout", onOut, { passive: true });

  // ── Floating REAL-photo preview over index rows ────────────────────────
  if (!isTouch()) {
    const box = document.querySelector(".preview");
    if (box) {
      const img = box.querySelector("img");
      const x = gsap.quickTo(box, "x", { duration: 0.55, ease: "power3.out" });
      const y = gsap.quickTo(box, "y", { duration: 0.55, ease: "power3.out" });
      const rot = gsap.quickTo(box, "rotate", { duration: 0.7, ease: "power3.out" });
      let lastX = 0;
      let px = 0;
      let py = 0;

      const move = (e) => {
        px = e.clientX;
        py = e.clientY;
        x(px);
        y(py);
        rot(gsap.utils.clamp(-10, 10, (px - lastX) * 0.5));
        lastX = px;
      };
      const show = (e) => {
        const row = e.target.closest?.("[data-preview]");
        if (!row) return;
        const src = row.dataset.preview;
        if (!src || src === "null") return;
        if (img.getAttribute("src") !== src) img.src = src;
        gsap.to(box, { autoAlpha: 1, scale: 1, duration: 0.45, ease: "expo.out" });
      };
      const hide = () => gsap.to(box, { autoAlpha: 0, scale: 0.9, duration: 0.3, ease: "expo.out" });

      document.addEventListener("pointerover", show, { passive: true });
      document.addEventListener("pointermove", move, { passive: true });
      document.addEventListener("pointerout", (e) => {
        if (e.target.closest?.("[data-preview]")) hide();
      }, { passive: true });
      // pointerleave never fires when the page scrolls out from under a still pointer
      addEventListener(
        "scroll",
        () => {
          if (!document.elementFromPoint(px, py)?.closest?.("[data-preview]")) hide();
        },
        { passive: true }
      );
    }
  }
}
