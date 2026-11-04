'use client';

import { useState, useEffect } from 'react';
import { useRecipes } from '@/context/RecipeContext';
import { Trash2, ExternalLink, Clock, Bookmark, Tag, X, Search, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import MediaImage from './MediaImage';
import { youtubeThumbnailSources } from '@/lib/video';

/** Derive a video id back out of a persisted verified watch url. */
function videoIdFromUrl(url) {
  const match = /^https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})$/.exec(url || '');
  return match ? match[1] : null;
}

export default function SavedRecipes({ onViewRecipe }) {
  const { savedRecipes, deleteRecipe, updateRecipeTags, tags, mounted, ensureDataLoaded } = useRecipes();
  const [expandedId, setExpandedId] = useState(null);
  const [filterTag, setFilterTag] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTags, setEditingTags] = useState(null);

  // This tab owns the saved-recipe data: trigger its lazy load on mount
  // (no-op if another tab already fetched it).
  useEffect(() => {
    ensureDataLoaded();
  }, [ensureDataLoaded]);

  if (!mounted) return null;

  const filteredRecipes = savedRecipes.filter((recipe) => {
    const matchesTag = !filterTag || recipe.tags?.includes(filterTag);
    const matchesSearch = !searchQuery || 
      recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTag && matchesSearch;
  });

  const toggleTag = (recipeId, tag) => {
    const recipe = savedRecipes.find(r => r.id === recipeId);
    if (!recipe) return;
    const currentTags = recipe.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    updateRecipeTags(recipeId, newTags);
  };

  if (savedRecipes.length === 0) {
    return (
      <div className="w-full max-w-3xl mx-auto mt-12 text-center py-16">
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full inline-block mb-4">
          <Bookmark className="h-10 w-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No saved recipes yet</h3>
        <p className="text-gray-500 dark:text-gray-400">
          Generate a recipe and click &quot;Save Recipe&quot; to add it to your collection.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto mt-12">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Your Recipe Collection ({savedRecipes.length})
      </h2>

      {/* Search and Filter */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recipes..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-black dark:text-white dark:bg-gray-800"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterTag('')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !filterTag
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            All
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setFilterTag(filterTag === tag ? '' : tag)}
              aria-pressed={filterTag === tag}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filterTag === tag
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredRecipes.map((recipe) => (
          <div
            key={recipe.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden"
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 flex items-start gap-4">
                  {/* Real media persisted with the save */}
                  <div className="w-24 shrink-0">
                    <MediaImage
                      sources={[
                        ...(recipe.media?.url ? [recipe.media.url] : []),
                        ...youtubeThumbnailSources(videoIdFromUrl(recipe.youtubeUrl)),
                      ]}
                      alt={`Real photo of ${recipe.dishName || recipe.title}`}
                      rounded="rounded-xl"
                    />
                  </div>
                  <div className="min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                    {recipe.title}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {new Date(recipe.savedAt).toLocaleDateString()}
                    </span>
                    {recipe.nutrition && (
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        {recipe.nutrition.calories} cal
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {recipe.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingTags(editingTags === recipe.id ? null : recipe.id)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Edit tags"
                  >
                    <Tag size={18} />
                  </button>
                  <button
                    onClick={() => setExpandedId(expandedId === recipe.id ? null : recipe.id)}
                    className="p-2 text-teal-600 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-900/30 rounded-lg transition-colors"
                    title="View recipe"
                  >
                    <ExternalLink size={18} />
                  </button>
                  <button
                    onClick={() => deleteRecipe(recipe.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors"
                    title="Delete recipe"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Tag Editor */}
              {editingTags === recipe.id && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Select tags:</p>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(recipe.id, tag)}
                        aria-pressed={recipe.tags?.includes(tag)}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          recipe.tags?.includes(tag)
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-500'
                        }`}
                      >
                        {recipe.tags?.includes(tag) && <Check size={12} />}
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {expandedId === recipe.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="max-w-none">
                    <ReactMarkdown
                      components={{
                        h1: ({ node, ...props }) => (
                          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight border-b border-gray-100 dark:border-gray-700 pb-3" {...props} />
                        ),
                        h2: ({ node, ...props }) => (
                          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mt-6 mb-3" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-3" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul className="space-y-2 mb-4 bg-gray-50 dark:bg-gray-900/60 p-4 rounded-xl border border-gray-100 dark:border-gray-700 list-none" {...props} />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol className="list-decimal marker:text-emerald-600 dark:marker:text-emerald-400 marker:font-bold space-y-2 mb-4 pl-5" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                          <li className="text-gray-700 dark:text-gray-200 leading-relaxed text-sm" {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                          <strong className="font-bold text-gray-900 dark:text-white" {...props} />
                        ),
                      }}
                    >
                      {recipe.recipe}
                    </ReactMarkdown>
                  </div>
                  {recipe.nutrition && (
                    <div className="mt-4 bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
                      <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2">Nutrition per Serving</h4>
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="font-bold text-green-700 dark:text-green-400">{recipe.nutrition.calories}</div>
                          <div className="text-xs text-green-600 dark:text-green-500">Calories</div>
                        </div>
                        <div>
                          <div className="font-bold text-green-700 dark:text-green-400">{recipe.nutrition.protein}g</div>
                          <div className="text-xs text-green-600 dark:text-green-500">Protein</div>
                        </div>
                        <div>
                          <div className="font-bold text-green-700 dark:text-green-400">{recipe.nutrition.carbs}g</div>
                          <div className="text-xs text-green-600 dark:text-green-500">Carbs</div>
                        </div>
                        <div>
                          <div className="font-bold text-green-700 dark:text-green-400">{recipe.nutrition.fat}g</div>
                          <div className="text-xs text-green-600 dark:text-green-500">Fat</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {filteredRecipes.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No recipes match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
