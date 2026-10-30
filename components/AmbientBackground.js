'use client';

import { motion } from 'framer-motion';

/**
 * The living background: three emerald aurora orbs drifting on slow,
 * opposing sine paths behind the content, plus a film-grain veil (the
 * grain itself is pure CSS in globals.css `.aurora`). Feels organic —
 * like steam and herbs in a sunlit kitchen — without distracting.
 */
const ORBS = [
  {
    className: 'left-[-12%] top-[-10%] h-[46vmax] w-[46vmax] bg-emerald-400/25 dark:bg-emerald-500/12',
    animate: { x: [0, 70, -30, 0], y: [0, 45, 90, 0], scale: [1, 1.12, 0.96, 1] },
    duration: 26,
  },
  {
    className: 'right-[-16%] top-[22%] h-[40vmax] w-[40vmax] bg-teal-400/20 dark:bg-teal-400/10',
    animate: { x: [0, -80, 40, 0], y: [0, 70, -20, 0], scale: [1, 0.92, 1.1, 1] },
    duration: 32,
  },
  {
    className: 'left-[28%] bottom-[-22%] h-[44vmax] w-[44vmax] bg-lime-400/16 dark:bg-lime-400/8',
    animate: { x: [0, 50, -60, 0], y: [0, -60, 30, 0], scale: [1, 1.08, 0.94, 1] },
    duration: 38,
  },
];

export default function AmbientBackground() {
  return (
    <div className="aurora" aria-hidden="true">
      {ORBS.map((orb, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full blur-3xl ${orb.className}`}
          animate={orb.animate}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
