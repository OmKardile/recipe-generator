'use client';

import { useEffect, useState } from 'react';
import { ChefHat } from 'lucide-react';

const STATUS_MESSAGES = [
  'Roasting the spices…',
  'Tempering the tadka…',
  'Kneading the dough…',
  'Simmering the curry…',
  'Whisking the yogurt…',
  'Garnishing with coriander…',
  'Plating it beautifully…',
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
    <div className="w-full max-w-4xl mx-auto mt-10" aria-live="polite" aria-busy="true">
      <div className="flex items-center justify-center gap-3 mb-8">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-full animate-pulse">
          <ChefHat className="h-6 w-6 text-white" />
        </div>
        <p className="text-lg font-medium text-gray-600 dark:text-gray-300 tabular-nums">
          {STATUS_MESSAGES[messageIndex]}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((card) => (
          <div
            key={card}
            className="p-5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-4 animate-pulse"
            style={{ animationDelay: `${card * 150}ms` }}
          >
            <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div className="w-24 h-3 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-6 w-full rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-5/6 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="flex gap-2 pt-2">
              <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="h-5 w-12 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="h-5 w-14 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
