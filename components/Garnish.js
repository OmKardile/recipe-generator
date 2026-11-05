"use client";

import { useEffect, useRef } from "react";
import {
  CookingPot,
  Leaf,
  Citrus,
  Cherry,
  Grape,
  Carrot,
  Salad,
  Croissant,
  Soup,
} from "lucide-react";

/**
 * The garnish constellation — this app's signature and its visual headline.
 *
 * The hero variant is a full-width magnet field: a pot medallion at the
 * center while seven colorful ingredient icons float around it, each on its
 * own depth layer. Moving the pointer shifts every icon proportionally to
 * its depth (lerped in rAF for a buttery, weighty feel); scrolling the page
 * lets the field drift upward at per-icon rates. The idle sway (bob + tilt)
 * is pure CSS keyframes on the inner element, so the JS transform (parallax
 * + drag) and the CSS animation (sway) compose instead of fighting.
 *
 * Every magnet is DRAGGABLE: pointerdown on a sticker picks it up (it lifts,
 * scales and casts a bigger shadow), pointermove drags it — clamped inside
 * the field so it can never be flung off the page — and pointerup pins it
 * where you dropped it, with a little settle wobble. Positions persist in
 * localStorage (as fractions of the field, so they survive resizes) and a
 * double-click sends a magnet back home. Because dragging is user-initiated
 * it works under prefers-reduced-motion too — only the passive parallax,
 * sway and wobble freeze there.
 *
 * Everything here is decorative (aria-hidden) — the wordmark beside the
 * mark variant carries the meaning. On touch devices the pointer parallax
 * simply never fires; the sway and the drag still work.
 */

/* depth: parallax multiplier — far layers (small values) barely move,
   near layers (large values) travel far. aux icons are hidden on the
   narrowest screens to keep the field airy on phones. */
const HERO_ICONS = [
  { Icon: Leaf, cls: "garnish__leaf", depth: 0.75 },
  { Icon: Citrus, cls: "garnish__citrus", depth: 1.25 },
  { Icon: Cherry, cls: "garnish__cherry", depth: 1.55 },
  { Icon: Grape, cls: "garnish__grape", depth: 0.9 },
  { Icon: Carrot, cls: "garnish__carrot", depth: 1.1 },
  { Icon: Salad, cls: "garnish__salad", depth: 0.6, aux: true },
  { Icon: Croissant, cls: "garnish__croissant", depth: 1.0, aux: true },
  { Icon: Soup, cls: "garnish__soup", depth: 1.15 },
];

const MAGNET_STORE_KEY = "recipe-generator:magnets";

export default function Garnish({ variant = "hero", className = "" }) {
  const fieldRef = useRef(null);

  useEffect(() => {
    if (variant !== "hero") return;
    const field = fieldRef.current;
    if (!field) return;
    const floats = Array.from(field.querySelectorAll(".garnish__float"));
    if (floats.length === 0) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

    /* ── per-magnet drag state (el.__drag) + persisted positions ── */
    for (const el of floats) el.__drag = { x: 0, y: 0 };
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(MAGNET_STORE_KEY) || "{}");
    } catch {
      saved = {};
    }
    const fieldSize = () => field.getBoundingClientRect();
    const restore = () => {
      const fr = fieldSize();
      for (const el of floats) {
        const s = saved[el.dataset.magnet];
        if (!s || typeof s.fx !== "number" || typeof s.fy !== "number") continue;
        el.__drag.x = clamp(s.fx * fr.width, -fr.width, fr.width);
        el.__drag.y = clamp(s.fy * fr.height, -fr.height, fr.height);
      }
    };
    restore();

    /* One transform writer used by both the parallax loop and the drag
       handlers: parallax px/py/rotate + the drag offset, composed. */
    const apply = (el) => {
      const d = el.__drag;
      const p = el.__par || { x: 0, y: 0, r: 0 };
      el.style.transform = `translate3d(${(p.x + d.x).toFixed(2)}px, ${(p.y + d.y).toFixed(2)}px, 0) rotate(${p.r.toFixed(2)}deg)`;
    };

    /* ── the parallax loop (skipped entirely under reduced motion) ── */
    let tx = 0; // target pointer position, normalized to [-1, 1]
    let ty = 0;
    let cx = 0; // lerped current position
    let cy = 0;
    let raf = 0;
    let looping = false;

    const onPointer = (e) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
    };

    const tick = () => {
      cx += (tx - cx) * 0.075;
      cy += (ty - cy) * 0.075;
      const sy = Math.min(window.scrollY, 1200); // scroll drift, clamped
      for (const el of floats) {
        const d = parseFloat(el.dataset.depth || "1");
        el.__par = {
          x: cx * d * 34, // px, per depth layer
          y: cy * d * 22 - sy * d * 0.055,
          r: cx * d * 6, // gentle rotation with the pointer
        };
        apply(el);
      }
      raf = requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (looping || reduced) return;
      looping = true;
      window.addEventListener("pointermove", onPointer, { passive: true });
      raf = requestAnimationFrame(tick);
    };
    const stopLoop = () => {
      if (!looping) return;
      looping = false;
      window.removeEventListener("pointermove", onPointer);
      cancelAnimationFrame(raf);
    };
    startLoop();

    /* ── dragging: pick a magnet up, move it, pin it where it lands ── */
    let drag = null; // { el, px, py, dx, dy, cx, cy, minCx, maxCx, minCy, maxCy }
    let wobbleTimer = 0;

    const persist = () => {
      try {
        const fr = fieldSize();
        const out = {};
        for (const el of floats) {
          const d = el.__drag;
          if (!d || (Math.abs(d.x) < 1 && Math.abs(d.y) < 1)) continue;
          out[el.dataset.magnet] = {
            fx: d.x / Math.max(1, fr.width),
            fy: d.y / Math.max(1, fr.height),
          };
        }
        localStorage.setItem(MAGNET_STORE_KEY, JSON.stringify(out));
      } catch {
        /* private mode / quota — positions just won't persist */
      }
    };

    const wobble = (el) => {
      if (reduced) return;
      el.classList.remove("is-settling");
      // restart the keyframe cleanly
      void el.offsetWidth;
      el.classList.add("is-settling");
      clearTimeout(wobbleTimer);
      wobbleTimer = setTimeout(() => el.classList.remove("is-settling"), 600);
    };

    const onDown = (e) => {
      if (e.button !== undefined && e.button !== 0 && e.pointerType === "mouse") return;
      const el = e.currentTarget;
      const fr = field.getBoundingClientRect();
      const ir = el.getBoundingClientRect();
      drag = {
        el,
        px: e.clientX,
        py: e.clientY,
        dx: el.__drag.x,
        dy: el.__drag.y,
        cx: ir.left + ir.width / 2,
        cy: ir.top + ir.height / 2,
        minCx: fr.left + ir.width / 2 + 2,
        maxCx: fr.right - ir.width / 2 - 2,
        minCy: fr.top + ir.height / 2 + 2,
        maxCy: fr.bottom - ir.height / 2 - 2,
      };
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* capture is best-effort; the window fallback below still drags */
      }
      el.classList.add("is-dragging");
      e.preventDefault();
    };

    const onMove = (e) => {
      if (!drag) return;
      const el = drag.el;
      const ncx = clamp(drag.cx + (e.clientX - drag.px), drag.minCx, drag.maxCx);
      const ncy = clamp(drag.cy + (e.clientY - drag.py), drag.minCy, drag.maxCy);
      el.__drag.x = drag.dx + (ncx - drag.cx);
      el.__drag.y = drag.dy + (ncy - drag.cy);
      if (!looping) apply(el); // reduced motion: no rAF loop, write directly
    };

    const onUp = () => {
      if (!drag) return;
      const el = drag.el;
      el.classList.remove("is-dragging");
      wobble(el);
      drag = null;
      persist();
    };

    const onDouble = (e) => {
      const el = e.currentTarget;
      el.__drag.x = 0;
      el.__drag.y = 0;
      if (!looping) apply(el);
      wobble(el);
      persist();
    };

    /* One window-level move/up pair drives every drag: with pointer
       capture the move events retarget to the captured magnet but still
       bubble to the window; without capture (older browsers) the window
       listener is the safety net. Either way the drag state routes it. */
    for (const el of floats) {
      el.addEventListener("pointerdown", onDown);
      el.addEventListener("dblclick", onDouble);
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });

    /* Re-clamp restored magnets when the field resizes (rotation, window
       resize) so a magnet saved on a wide screen never sits off-field. */
    let resizeRaf = 0;
    const onResize = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        const fr = field.getBoundingClientRect();
        for (const el of floats) {
          const ir = el.getBoundingClientRect();
          if (ir.width === 0 || ir.height === 0) continue; // hidden aux magnet
          const cxNow = ir.left + ir.width / 2;
          const cyNow = ir.top + ir.height / 2;
          const ncx = clamp(cxNow, fr.left + ir.width / 2, fr.right - ir.width / 2);
          const ncy = clamp(cyNow, fr.top + ir.height / 2, fr.bottom - ir.height / 2);
          if (ncx !== cxNow || ncy !== cyNow) {
            el.__drag.x += ncx - cxNow;
            el.__drag.y += ncy - cyNow;
            if (!looping) apply(el);
          }
        }
      });
    };
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      stopLoop();
      clearTimeout(wobbleTimer);
      for (const el of floats) {
        el.removeEventListener("pointerdown", onDown);
        el.removeEventListener("dblclick", onDouble);
      }
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(resizeRaf);
    };
  }, [variant]);

  return (
    <div
      ref={fieldRef}
      aria-hidden="true"
      className={`garnish garnish--${variant}${className ? ` ${className}` : ""}`}
    >
      {variant === "hero" ? (
        <>
          {/* The pot: the anchor of the constellation, on a near layer */}
          <span
            className="garnish__float garnish__float--pot"
            data-depth="0.45"
            data-magnet="pot"
          >
            <span className="garnish__bob garnish__bob--pot">
              <span className="garnish__tile">
                <CookingPot className="garnish__pot" strokeWidth={2.1} />
              </span>
            </span>
          </span>
          {HERO_ICONS.map(({ Icon, cls, depth, aux }) => (
            <span
              key={cls}
              className={`garnish__float ${cls}${aux ? " garnish__float--aux" : ""}`}
              data-depth={depth}
              data-magnet={cls.replace("garnish__", "")}
            >
              <span className="garnish__bob">
                <Icon className="garnish__icon" strokeWidth={2.4} />
              </span>
            </span>
          ))}
        </>
      ) : (
        <span className="garnish__tile">
          <CookingPot className="garnish__pot" strokeWidth={2.1} />
        </span>
      )}
    </div>
  );
}
