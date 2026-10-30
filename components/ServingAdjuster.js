"use client";

import { PiMinus, PiPlus, PiUsersThreeFill, PiArrowCounterClockwiseFill } from "react-icons/pi";

export default function ServingAdjuster({ servings, baseServings = 4, onServingsChange }) {
  const isModified = servings !== baseServings;

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-line bg-elev2 px-2 py-1 dark:bg-herb-950/50">
      <PiUsersThreeFill size={14} className="ml-1 text-body" aria-hidden />
      <span className="hidden text-[11px] font-bold uppercase tracking-[0.12em] text-body sm:inline">
        Servings
      </span>
      <button
        onClick={() => onServingsChange(Math.max(1, servings - 1))}
        disabled={servings <= 1}
        aria-label="Decrease servings"
        className="grid h-7 w-7 place-items-center rounded-full text-body transition-all hover:bg-herb-100 hover:text-herb-700 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-herb-900 dark:hover:text-herb-300"
      >
        <PiMinus size={12} aria-hidden />
      </button>
      <span
        className="w-6 text-center font-display text-base font-semibold tabular-nums"
        aria-live="polite"
      >
        {servings}
      </span>
      <button
        onClick={() => onServingsChange(Math.min(24, servings + 1))}
        disabled={servings >= 24}
        aria-label="Increase servings"
        className="grid h-7 w-7 place-items-center rounded-full text-body transition-all hover:bg-herb-100 hover:text-herb-700 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-herb-900 dark:hover:text-herb-300"
      >
        <PiPlus size={12} aria-hidden />
      </button>
      {isModified && (
        <button
          onClick={() => onServingsChange(baseServings)}
          title={`Reset to base ${baseServings} servings`}
          aria-label={`Reset to ${baseServings} servings`}
          className="grid h-7 w-7 place-items-center rounded-full text-herb-600 transition-all hover:rotate-[-120deg] hover:bg-herb-100 dark:text-herb-400 dark:hover:bg-herb-900"
        >
          <PiArrowCounterClockwiseFill size={12} aria-hidden />
        </button>
      )}
    </div>
  );
}
