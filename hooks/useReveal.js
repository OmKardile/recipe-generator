"use client";

import { useEffect, useRef } from "react";

/**
 * Scroll-reveal orchestration. Elements marked with `data-reveal` start
 * veiled (see globals.css) and get `.revealed` when they enter the viewport.
 * Stagger siblings with style={{ "--reveal-delay": index }}.
 *
 * @param {*} dep - re-scan when this changes (e.g. the active tab), so
 *                  freshly mounted sections reveal too.
 */
export function useReveal(dep) {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const elements = Array.from(
      root.querySelectorAll("[data-reveal]:not(.revealed)")
    );
    if (elements.length === 0) return;

    if (typeof IntersectionObserver === "undefined") {
      elements.forEach((el) => el.classList.add("revealed"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -48px 0px" }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [dep]);

  return ref;
}
