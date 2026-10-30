'use client';

import { Clock, Users, Flame, ChefHat, Check, MapPin, Gauge, Zap, Heart, Crown } from 'lucide-react';

const DIFFICULTY_STYLES = {
  Easy: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Hard: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const ROLE_META = [
  { icon: Zap, label: 'Quick & easy', tone: 'text-yellow-600 dark:text-yellow-400' },
  { icon: Heart, label: 'Classic comfort', tone: 'text-rose-600 dark:text-rose-400' },
  { icon: Crown, label: 'Weekend showstopper', tone: 'text-purple-600 dark:text-purple-400' },
];

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
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 text-center">
        Choose a Recipe
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-6 text-center">
        {recipes.length} chef-crafted options for your ingredients
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recipes.map((recipe, index) => {
          const isSelected = selectedIndex === index;
          const preview = recipe.description || fallbackPreview(recipe.recipe);
          const totalTime = recipe.totalTimeMinutes;
          const role = ROLE_META[index] || ROLE_META[1];
          const RoleIcon = role.icon;

          return (
            <button
              key={recipe.id ?? index}
              onClick={() => onSelect(index)}
              aria-pressed={isSelected}
              className={`text-left p-5 rounded-xl border-2 transition-all group ${
                isSelected
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-lg scale-[1.02]'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-orange-300 dark:hover:border-orange-600 hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`bg-gradient-to-br from-orange-400 to-red-500 p-2 rounded-lg transition-transform group-hover:scale-110 ${
                    isSelected ? 'scale-110' : ''
                  }`}
                >
                  <ChefHat size={20} className="text-white" />
                </div>
                <div className="flex items-center gap-2">
                  {isSelected && (
                    <div className="bg-orange-500 rounded-full p-1">
                      <Check size={14} className="text-white" />
                    </div>
                  )}
                </div>
              </div>

              <div className={`flex items-center gap-1.5 text-xs font-semibold mb-2 ${role.tone}`}>
                <RoleIcon size={12} />
                <span className="capitalize">{role.label}</span>
              </div>

              <h3
                className={`font-bold text-lg mb-2 line-clamp-2 ${
                  isSelected
                    ? 'text-orange-700 dark:text-orange-300'
                    : 'text-gray-900 dark:text-white'
                }`}
              >
                {recipe.title}
              </h3>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                {preview}
              </p>

              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
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
                  <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                    <Flame size={12} />
                    {recipe.nutrition.calories} cal
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
