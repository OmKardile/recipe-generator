'use client';

import { Clock, Flame, ChefHat, Check } from 'lucide-react';

export default function RecipeSelector({ recipes, onSelect, selectedIndex }) {
  if (!recipes || recipes.length === 0) return null;

  const getPreview = (recipeText) => {
    // Extract description (text after title, before first section)
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
        if (description.length > 100) break;
      }
    }
    
    return description.trim() || 'A delicious recipe';
  };

  const extractTime = (recipeText) => {
    const timeMatch = recipeText.match(/(?:Prep|Cook|Total)[:\s]*(\d+\s*(?:min|hour|hrs|minutes))/i);
    return timeMatch ? timeMatch[1] : null;
  };

  const extractServings = (recipeText) => {
    const servingsMatch = recipeText.match(/Servings[:\s]*(\d+)/i);
    return servingsMatch ? servingsMatch[1] : null;
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
        Choose a Recipe
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-6 text-center">
        We found {recipes.length} recipes for you
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recipes.map((recipe, index) => {
          const isSelected = selectedIndex === index;
          const preview = getPreview(recipe.recipe);
          const time = extractTime(recipe.recipe);
          const servings = extractServings(recipe.recipe);
          
          return (
            <button
              key={recipe.id}
              onClick={() => onSelect(index)}
              className={`text-left p-5 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-lg scale-[1.02]'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="bg-gradient-to-br from-orange-400 to-red-500 p-2 rounded-lg">
                  <ChefHat size={20} className="text-white" />
                </div>
                {isSelected && (
                  <div className="bg-blue-500 rounded-full p-1">
                    <Check size={14} className="text-white" />
                  </div>
                )}
              </div>
              
              <h3 className={`font-bold text-lg mb-2 line-clamp-2 ${
                isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'
              }`}>
                {recipe.title}
              </h3>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                {preview}
              </p>
              
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                {time && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {time}
                  </span>
                )}
                {servings && (
                  <span className="flex items-center gap-1">
                    <Flame size={12} />
                    {servings} servings
                  </span>
                )}
                {recipe.nutrition && (
                  <span className="text-green-600 dark:text-green-400 font-medium">
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
