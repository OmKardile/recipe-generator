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
 * The hero variant is a full-width parallax field: a pot medallion at the
 * center while seven colorful ingredient icons float around it, each on its
 * own depth layer. Moving the pointer shifts every icon proportionally to
 * its depth (lerped in rAF for a buttery, weighty feel); scrolling the page
 * lets the field drift upward at per-icon rates. The idle sway (bob + tilt)
 * is pure CSS keyframes on the inner element, so the JS transform (parallax)
 * and the CSS animation (sway) compose instead of fighting.
 *
 * Everything here is decorative (aria-hidden) — the wordmark beside the
 * mark variant carries the meaning. Under prefers-reduced-motion the JS
 * parallax never starts and CSS freezes the sway: icons stay colorful,
 * just still. On touch devices pointer parallax simply never fires; the
 * scroll drift and CSS sway still work.
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

export default function Garnish({ variant = "hero", className = "" }) {
  const fieldRef = useRef(null);

  useEffect(() => {
    if (variant !== "hero") return;
    const field = fieldRef.current;
    if (!field) return;
    /* Reduced motion: no parallax at all — CSS also freezes the sway. */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const floats = Array.from(field.querySelectorAll(".garnish__float"));
    if (floats.length === 0) return;

    let tx = 0; // target pointer position, normalized to [-1, 1]
    let ty = 0;
    let cx = 0; // lerped current position
    let cy = 0;
    let raf = 0;

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
        const dx = cx * d * 34; // px, per depth layer
        const dy = cy * d * 22 - sy * d * 0.055;
        const rz = cx * d * 6; // gentle rotation with the pointer
        el.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) rotate(${rz.toFixed(2)}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onPointer, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onPointer);
      cancelAnimationFrame(raf);
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
          <span className="garnish__float garnish__float--pot" data-depth="0.45">
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
