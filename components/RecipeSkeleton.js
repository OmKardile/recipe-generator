'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CookingPot } from 'lucide-react';

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
        <motion.div
          animate={{ rotate: [0, -6, 6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-full shadow-lg shadow-emerald-600/30"
        >
          <CookingPot className="h-6 w-6 text-white" />
        </motion.div>
        <div className="h-7 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.p
              key={messageIndex}
              initial={{ y: 22, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -22, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="text-lg font-medium text-emerald-900/70 dark:text-emerald-100/70 tabular-nums"
            >
              {STATUS_MESSAGES[messageIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[0, 1, 2].map((card) => (
          <motion.div
            key={card}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: card * 0.15, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl border-2 border-emerald-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 overflow-hidden animate-pulse"
            style={{ animationDelay: `${card * 150}ms` }}
          >
            {/* Where the real photo will land */}
            <div className="aspect-[16/10] bg-gradient-to-br from-emerald-100/70 to-teal-100/70 dark:from-emerald-900/40 dark:to-teal-900/40" />
            <div className="p-5 space-y-4">
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
          </motion.div>
        ))}
      </div>
    </div>
  );
}
