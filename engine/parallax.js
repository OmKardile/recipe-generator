/**
 * Engine: parallax — the page-wide depth driver.
 *
 * One gsap.ticker loop lerps the pointer (or the phone's gyro tilt) into
 * normalized --px / --py in [-1, 1] custom properties on <html>, plus --sy
 * (page scroll progress, 0..1). CSS layers then consume the vars:
 *
 *   · .aurora  — the far layer: glow blobs drift against the pointer and
 *                sink slowly as the page scrolls (globals.css)
 *   · .hero    — the mid layer: the paper counter-drifts a few px against
 *                the magnet field, so the magnets read as floating IN FRONT
 *   · .finale  — a whisper of the same drift, so the page never fully
 *                "freezes" at the bottom
 *
 * Garnish.js keeps its own deeper per-magnet math on the same inputs — the
 * constellation is the near layer and travels farthest.
 *
 * Why custom properties instead of per-element GSAP tweens: the tier tabs
 * remount their panels (key={activeTab}), which would orphan any tween bound
 * to the old DOM nodes. Vars on <html> apply to whatever elements exist,
 * whenever they exist — the parallax survives every remount for free.
 *
 * Touch devices: deviceorientation drives the vars (works out of the box on
 * Android; iOS 13+ needs an explicit permission prompt we deliberately skip,
 * so there it is a silent no-op — the app degrades to the static background).
 * Both listeners run side by side and the event's own pointerType separates
 * them: real mice/pens drive the pointer targets, touch drags are ignored so
 * scrolling on a phone never flings the wallpaper. (Media queries are NOT
 * trusted here — headless and remote-desktop browsers report hover:none
 * while still firing perfectly good mouse pointermove events.)
 *
 * Reduced motion: the module never starts; the vars stay unset and every
 * calc(var(--px, 0)) consumer collapses to identity.
 */
import { gsap } from "gsap";
import { prefersReducedMotion } from "./env";

export function initParallax() {
  if (prefersReducedMotion()) return;

  const root = document.documentElement;
  let tx = 0; // target, normalized [-1, 1]
  let ty = 0;
  let cx = 0; // lerped current — the weight that makes it feel physical
  let cy = 0;
  let last = ""; // last written var triple, to skip no-op style writes

  const onMove = (e) => {
    // Touch drags must not drive the parallax (they scroll the page); a real
    // mouse or pen always identifies itself via pointerType.
    if (e.pointerType === "touch") return;
    tx = (e.clientX / innerWidth) * 2 - 1;
    ty = (e.clientY / innerHeight) * 2 - 1;
  };
  addEventListener("pointermove", onMove, { passive: true });

  // Gyro tilt: gamma = left/right lean, beta = front/back (~45° at rest
  // in the hand). Centered on a comfortable holding angle. Fires on phones,
  // never on desktops — safe to leave always-on.
  const onOrient = (e) => {
    if (e.gamma == null || e.beta == null) return;
    const clamp = (v) => Math.min(1, Math.max(-1, v));
    tx = clamp(e.gamma / 28);
    ty = clamp((e.beta - 42) / 28);
  };
  addEventListener("deviceorientation", onOrient, { passive: true });

  const tick = () => {
    cx += (tx - cx) * 0.07;
    cy += (ty - cy) * 0.07;
    const max = root.scrollHeight - innerHeight;
    const sy = max > 0 ? Math.min(1, scrollY / max) : 0;
    const next = `${cx.toFixed(4)} ${cy.toFixed(4)} ${sy.toFixed(4)}`;
    if (next === last) return;
    last = next;
    root.style.setProperty("--px", cx.toFixed(4));
    root.style.setProperty("--py", cy.toFixed(4));
    root.style.setProperty("--sy", sy.toFixed(4));
  };
  gsap.ticker.add(tick);
}
