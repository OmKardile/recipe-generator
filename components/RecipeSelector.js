'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Users, Flame, Check, MapPin, Gauge, Zap, Heart, Crown, CookingPot, X } from 'lucide-react';
import MediaImage from './MediaImage';
import useRecipeMedia from '@/hooks/useRecipeMedia';
import { youtubeThumbnailSources } from '@/lib/video';

const DIFFICULTY_STYLES = {
  Easy: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Hard: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const ROLE_META = [
  { icon: Zap, label: 'Quick & easy', tone: 'text-lime-600 dark:text-lime-400' },
  { icon: Heart, label: 'Classic comfort', tone: 'text-teal-600 dark:text-teal-400' },
  { icon: Crown, label: 'Weekend showstopper', tone: 'text-amber-600 dark:text-amber-400' },
];

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.09, type: 'spring', stiffness: 300, damping: 26 },
  }),
};

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

function RecipeCard({ recipe, index, isSelected, onSelect, onSkip, skipped }) {
  const preview = recipe.description || fallbackPreview(recipe.recipe);
  const totalTime = recipe.totalTimeMinutes;
  const role = ROLE_META[index] || ROLE_META[1];
  const RoleIcon = role.icon;

  // Real photo of the real dish (Wikipedia → TheMealDB → video still).
  const { media, loading } = useRecipeMedia({
    dishName: recipe.dishName,
    title: recipe.title,
    youtubeVideoId: recipe.youtubeVideoId,
  });
  const thumbSources = [
    ...(media?.url ? [media.url] : []),
    ...youtubeThumbnailSources(recipe.youtubeVideoId),
  ];

  return (
    <div className="relative">
      <motion.button
        custom={index}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover={{ y: -6 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onSelect(index)}
        aria-pressed={isSelected}
        className={`text-left w-full p-4 rounded-2xl border-2 transition-all group ${
          skipped
            ? 'opacity-50 saturate-[0.6] border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
            : isSelected
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-xl shadow-emerald-500/10'
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-xl'
        }`}
      >
      {/* Real media header */}
      <div className="mb-3 overflow-hidden rounded-xl">
        {loading ? (
          <div
            className="aspect-video w-full bg-gradient-to-br from-emerald-100 via-teal-50 to-lime-100 dark:from-emerald-900/40 dark:via-gray-800 dark:to-teal-900/30 animate-pulse flex items-center justify-center"
            role="status"
            aria-label="Finding a real photo…"
          >
            <CookingPot size={22} className="text-emerald-400/50 dark:text-emerald-500/40" />
          </div>
        ) : (
          <MediaImage
            key={`${recipe.id}-${thumbSources[0] || 'none'}`}
            sources={thumbSources}
            alt={`Real photo of ${recipe.dishName || recipe.title}`}
            rounded="rounded-xl"
          />
        )}
      </div>

      <div className="flex items-start justify-between mb-2 px-1">
        <div
          className={`bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-lg transition-transform group-hover:scale-110 ${
            isSelected ? 'scale-110' : ''
          }`}
        >
          <RoleIcon size={18} className="text-white" />
        </div>
        <div className="flex items-center gap-2">
          {isSelected && (
            <div className="bg-emerald-500 rounded-full p-1">
              <Check size={14} className="text-white" />
            </div>
          )}
        </div>
      </div>

      <div className={`flex items-center gap-1.5 text-xs font-semibold mb-2 px-1 ${role.tone}`}>
        <span>{role.label}</span>
      </div>

      <h3
        className={`font-bold text-lg mb-2 line-clamp-2 px-1 ${
          isSelected
            ? 'text-emerald-700 dark:text-emerald-300'
            : 'text-gray-900 dark:text-white'
        }`}
      >
        {recipe.title}
      </h3>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 px-1">
        {preview}
      </p>

      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 px-1 pb-1">
        {recipe.cuisine && (
          <span className="inline-flex items-center gap-1">
            <MapPin size={12} />
            {recipe.cuisine}
          </span>
        )}
        {recipe.difficulty && (
          <span className={`px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_STYLES[recipe.difficulty] || DIFFICULTY_STYLES.Medium}`}>
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
      </motion.button>

      {/* Skip affordance — an explicit "not today" signal for the learned
          profile. Sibling of the card button (never nested interactive
          elements), overlaying the card corner. */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSkip(index);
        }}
        aria-pressed={skipped}
        aria-label={skipped ? `Undo skip: ${recipe.title}` : `Skip: ${recipe.title} — not interested today`}
        title={skipped ? 'Undo skip' : 'Not interested today'}
        className={`absolute top-2.5 right-2.5 z-10 flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold backdrop-blur-sm transition-colors ${
          skipped
            ? 'bg-gray-900/75 text-white'
            : 'bg-white/85 dark:bg-gray-900/60 text-gray-400 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/40 hover:text-red-500'
        }`}
      >
        {skipped ? 'Skipped' : <X size={13} />}
      </button>
    </div>
  );
}

export default function RecipeSelector({ recipes, onSelect, selectedIndex }) {
  const [skipped, setSkipped] = useState(new Set());

  if (!recipes || recipes.length === 0) return null;

  /** Explicit negative signal — teaches the engine what NOT to suggest. */
  const handleSkip = (index) => {
    const recipe = recipes[index];
    const next = new Set(skipped);
    if (next.has(index)) {
      next.delete(index);
      setSkipped(next);
      return; // undoing a skip records nothing
    }
    next.add(index);
    setSkipped(next);
    fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'recipe_skipped',
        title: recipe.title,
        dishName: recipe.dishName || '',
        cuisine: recipe.cuisine || '',
      }),
    }).catch(() => {});
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full max-w-4xl mx-auto mt-10"
    >
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 text-center">
        Choose a Recipe
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-6 text-center">
        {recipes.length} chef-crafted options for your ingredients — real dishes, real photos
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recipes.map((recipe, index) => (
          <RecipeCard
            key={recipe.id ?? index}
            recipe={recipe}
            index={index}
            isSelected={selectedIndex === index}
            onSelect={onSelect}
            skipped={skipped.has(index)}
            onSkip={handleSkip}
          />
        ))}
      </div>
    </motion.div>
  );
}
