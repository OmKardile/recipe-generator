'use client';

import { motion } from 'framer-motion';
import {
  Clock, Users, Flame, Check, MapPin, Gauge, Zap, Heart, Crown, Youtube,
} from 'lucide-react';
import RecipeMedia from './RecipeMedia';
import { videoHref } from '@/lib/video';

const DIFFICULTY_STYLES = {
  Easy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Hard: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
};

const ROLE_META = [
  { icon: Zap, label: 'Quick & easy', tone: 'text-lime-600 dark:text-lime-400' },
  { icon: Heart, label: 'Classic comfort', tone: 'text-rose-600 dark:text-rose-400' },
  { icon: Crown, label: 'Weekend showstopper', tone: 'text-teal-600 dark:text-teal-400' },
];

const EASE = [0.22, 1, 0.36, 1];

function fallbackPreview(recipeText) {
  if (!recipeText) return 'A delicious recipe.';
  const lines = recipeText.split('\n');
  let description = '';
  let started = false;
  for (const line of lines) {
    if (line.startsWith('##')) {
      if (started) break;
      started = true;
      continue;
    }
    if (started && line.trim() && !line.startsWith('#')) {
      description += line.trim() + ' ';
      if (description.length > 120) break;
    }
  }
  return description.trim() || 'A delicious recipe.';
}

export default function RecipeSelector({ recipes, onSelect, selectedIndex }) {
  if (!recipes || recipes.length === 0) return null;

  return (
    <div className="w-full max-w-4xl mx-auto mt-10">
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE }}
        className="font-display text-3xl font-black text-gray-900 dark:text-white mb-1 text-center tracking-tight"
      >
        Choose a Recipe
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.12, duration: 0.55 }}
        className="text-emerald-900/60 dark:text-emerald-100/50 mb-8 text-center"
      >
        {recipes.length} chef-crafted options — real photos from real cooking videos
      </motion.p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {recipes.map((recipe, index) => {
          const isSelected = selectedIndex === index;
          const preview = recipe.description || fallbackPreview(recipe.recipe);
          const totalTime = recipe.totalTimeMinutes;
          const role = ROLE_META[index] || ROLE_META[1];
          const RoleIcon = role.icon;
          const hasVideo = Boolean(recipe.youtubeVideoId);

          return (
            <motion.div
              key={recipe.id ?? index}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onClick={() => onSelect(index)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(index);
                }
              }}
              initial={{ opacity: 0, y: 40, rotateX: -6 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ delay: index * 0.14, duration: 0.7, ease: EASE }}
              whileHover={{ y: -8, transition: { duration: 0.3, ease: EASE } }}
              whileTap={{ scale: 0.98 }}
              className={`shine group text-left rounded-2xl border-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm overflow-hidden shadow-md hover:shadow-2xl transition-shadow ${
                isSelected
                  ? 'border-emerald-500 shadow-emerald-500/25'
                  : 'border-gray-200/80 dark:border-gray-700/80 hover:border-emerald-400/70 dark:hover:border-emerald-500/50'
              }`}
            >
              {/* Real photograph of the real dish */}
              <RecipeMedia recipe={recipe} variant="card" />

              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className={`flex items-center gap-1.5 text-xs font-semibold ${role.tone}`}>
                    <RoleIcon size={13} />
                    <span className="capitalize">{role.label}</span>
                  </div>
                  {isSelected && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                      className="bg-emerald-500 rounded-full p-1 shadow-md shadow-emerald-500/40"
                    >
                      <Check size={13} className="text-white" />
                    </motion.span>
                  )}
                </div>

                <h3
                  className={`font-display font-bold text-xl mb-2 line-clamp-2 leading-snug ${
                    isSelected
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {recipe.title}
                </h3>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {preview}
                </p>

                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3">
                  {recipe.cuisine && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={12} />
                      {recipe.cuisine}
                    </span>
                  )}
                  {recipe.difficulty && (
                    <span
                      className={`px-2 py-0.5 rounded-full font-medium ${
                        DIFFICULTY_STYLES[recipe.difficulty] || DIFFICULTY_STYLES.Medium
                      }`}
                    >
                      {recipe.difficulty}
                    </span>
                  )}
                  {totalTime != null && (
                    <span className="inline-flex items-center gap-1">
                      <Clock size={12} />
                      {totalTime} min
                    </span>
                  )}
                  {recipe.servings != null && (
                    <span className="inline-flex items-center gap-1">
                      <Users size={12} />
                      {recipe.servings}
                    </span>
                  )}
                  {recipe.nutrition?.calories > 0 && (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <Flame size={12} />
                      {recipe.nutrition.calories} cal
                    </span>
                  )}
                </div>

                {/* Straight to the real, proven video */}
                <a
                  href={videoHref({
                    youtubeVideoId: recipe.youtubeVideoId,
                    title: recipe.canonicalDish || recipe.title,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                    hasVideo
                      ? 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300'
                      : 'text-gray-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400'
                  }`}
                >
                  <Youtube size={14} />
                  {hasVideo ? `Watch real recipe${recipe.youtubeChannel ? ` · ${recipe.youtubeChannel}` : ''}` : 'Find videos on YouTube'}
                </a>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
