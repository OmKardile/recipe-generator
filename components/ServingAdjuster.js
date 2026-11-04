"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";

export default function ServingAdjuster({ servings, baseServings = 4, onServingsChange }) {
  const isModified = servings !== baseServings;

  return (
    <span className="stepper">
      <span className="mono" style={{ marginRight: "0.4em" }}>
        Servings
      </span>
      <button
        onClick={() => onServingsChange(Math.max(1, servings - 1))}
        disabled={servings <= 1}
        aria-label="Decrease servings"
      >
        <Minus size={12} aria-hidden />
      </button>
      <span
        style={{
          minWidth: "1.6em",
          textAlign: "center",
          fontFamily: "var(--f-mono)",
          fontWeight: 500,
          fontVariantNumeric: "tabular-nums",
        }}
        aria-live="polite"
      >
        {servings}
      </span>
      <button
        onClick={() => onServingsChange(Math.min(24, servings + 1))}
        disabled={servings >= 24}
        aria-label="Increase servings"
      >
        <Plus size={12} aria-hidden />
      </button>
      {isModified && (
        <button
          onClick={() => onServingsChange(baseServings)}
          title={`Reset to base ${baseServings} servings`}
          aria-label={`Reset to ${baseServings} servings`}
        >
          <RotateCcw size={12} aria-hidden />
        </button>
      )}
    </span>
  );
}
