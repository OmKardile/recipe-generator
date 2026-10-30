"use client";

import { useEffect, useState } from "react";
import { PiCookingPotFill } from "react-icons/pi";

const STATUS_MESSAGES = [
  "Roasting the spices…",
  "Tempering the tadka…",
  "Kneading the dough…",
  "Simmering the curry…",
  "Whisking the yogurt…",
  "Garnishing with coriander…",
  "Plating it beautifully…",
];

/** Shimmering skeleton shown while the AI generates recipes. */
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
    <div className="mt-12" aria-live="polite" aria-busy="true">
      <div className="mb-9 flex items-center justify-center gap-3">
        <span className="relative inline-flex">
          <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 gap-[3px]" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="block h-3 w-1 rounded-full bg-herb-400/80 animate-steam"
                style={{ animationDelay: `${i * 0.55}s` }}
              />
            ))}
          </span>
          <PiCookingPotFill className="text-3xl text-herb-600 dark:text-herb-300" aria-hidden />
        </span>
        <p className="font-display text-lg font-medium tabular-nums text-body">
          {STATUS_MESSAGES[messageIndex]}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {[0, 1, 2].map((card) => (
          <div
            key={card}
            className="animate-fade-up space-y-4 rounded-3xl border border-line bg-elev p-6 shadow-card"
            style={{ animationDelay: `${card * 150}ms` }}
          >
            <div className="flex items-start justify-between">
              <div className="shimmer h-12 w-12 rounded-2xl" />
              <div className="shimmer h-5 w-16 rounded-full" />
            </div>
            <div className="shimmer h-3 w-24 rounded-full" />
            <div className="shimmer h-6 w-full rounded-lg" />
            <div className="shimmer h-4 w-5/6 rounded-full" />
            <div className="shimmer h-4 w-2/3 rounded-full" />
            <div className="flex gap-2 pt-2">
              <div className="shimmer h-6 w-20 rounded-full" />
              <div className="shimmer h-6 w-14 rounded-full" />
              <div className="shimmer h-6 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
