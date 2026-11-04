"use client";

import { useEffect, useState } from "react";

const STATUS_MESSAGES = [
  "Roasting the spices",
  "Tempering the tadka",
  "Kneading the dough",
  "Simmering the curry",
  "Whisking the yogurt",
  "Garnishing with coriander",
  "Plating it beautifully",
];

/** Steel skeleton shown while the AI generates recipes. */
export default function RecipeSkeleton() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(
      () => setMessageIndex((i) => (i + 1) % STATUS_MESSAGES.length),
      2200
    );
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{ marginTop: "calc(var(--u) * 5)", display: "grid", gap: "calc(var(--u) * 2)" }}
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="section-head"
        style={{ marginBottom: 0 }}
      >
        <h2 className="section-title">Three for tonight</h2>
        <span className="mono" style={{ color: "var(--c-accent)" }}>
          {STATUS_MESSAGES[messageIndex]}…
        </span>
      </div>
      <ul className="index" aria-hidden="true">
        {[0, 1, 2].map((row) => (
          <li key={row} className="index-row" style={{ pointerEvents: "none" }}>
            <span className="index-row__num skel" style={{ width: "1.5rem" }}>
              &nbsp;
            </span>
            <span className="index-row__main">
              <span
                className="index-row__title skel"
                style={{ maxWidth: `${70 - row * 12}%`, display: "block" }}
              >
                &nbsp;
              </span>
              <span className="index-row__meta">
                <span className="skel" style={{ display: "inline-block", width: "5rem" }}>
                  &nbsp;
                </span>
                <span className="skel" style={{ display: "inline-block", width: "3.5rem" }}>
                  &nbsp;
                </span>
                <span className="skel" style={{ display: "inline-block", width: "4.5rem" }}>
                  &nbsp;
                </span>
              </span>
            </span>
            <span className="index-row__arrow skel" style={{ width: "1.2rem" }}>
              &nbsp;
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
