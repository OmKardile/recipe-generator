'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRecipes } from '@/context/RecipeContext';
import {
  Trash2, ExternalLink, Clock, Bookmark, Tag, X, Search, Check, Youtube,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { thumbnailUrl, videoHref } from '@/lib/video';

const EASE = [0.22, 1, 0.36, 1];

export default function SavedRecipes({ onViewRecipe }) {
  const { savedRecipes, deleteRecipe, updateRecipeTags, tags, mounted } = useRecipes();
  const [expandedId, setExpandedId] = useState(null);
  const [filterTag, setFilterTag] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTags, setEditingTags] = useState(null);

  if (!mounted) return null;

  const filteredRecipes = savedRecipes.filter((recipe) => {
    const matchesTag = !filterTag || recipe.tags?.includes(filterTag);
    const matchesSearch = !searchQuery ||
      recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTag && matchesSearch;
  });

  const toggleTag = (recipeId, tag) => {
    const recipe = savedRecipes.find((r) => r.id === recipeId);
    if (!recipe) return;
    const currentTags = recipe.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];
    updateRecipeTags(recipeId, newTags);
  };

  if (savedRecipes.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="w-full max-w-3xl mx-auto mt-12 text-center py-16"
      >
        <div className="bg-emerald-100 dark:bg-emerald-900/40 p-4 rounded-full inline-block mb-4">
          <Bookmark className="h-10 w-10 text-emerald-500" />
        </div>
        <h3 className="font-display text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          No saved recipes yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Generate a recipe and click &quot;Save Recipe&quot; to add it to your collection.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto mt-12">
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="font-display text-3xl font-black text-gray-900 dark:text-white mb-6 tracking-tight"
      >
        Your Recipe Collection ({savedRecipes.length})
      </motion.h2>

      {/* Search and Filter */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recipes..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-black dark:text-white dark:bg-gray-800 transition"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterTag('')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !filterTag
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
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
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredRecipes.map((recipe, index) => {
          const thumb = recipe.youtubeVideoId ? thumbnailUrl(recipe.youtubeVideoId) : null;
          const watch = videoHref({
            youtubeVideoId: recipe.youtubeVideoId,
            title: recipe.canonicalDish || recipe.title,
          });
          return (
            <motion.div
              key={recipe.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.06, 0.3), duration: 0.5, ease: EASE }}
              className="bg-white/85 dark:bg-gray-800/85 backdrop-blur-sm rounded-2xl shadow-md border border-emerald-900/10 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 flex gap-4">
                    {/* Real photograph of the saved dish */}
                    {thumb && (
                      <a
                        href={watch}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative hidden sm:block h-[76px] w-[128px] shrink-0 overflow-hidden rounded-xl shadow-md ring-1 ring-emerald-900/10"
                        title={`Watch a real ${recipe.canonicalDish || recipe.title} video`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={thumb}
                          alt={`Real photo of ${recipe.canonicalDish || recipe.title}`}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                          <Youtube size={22} className="text-white" />
                        </span>
                      </a>
                    )}
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
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            {recipe.nutrition.calories} cal
                          </span>
                        )}
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {recipe.tags?.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      {recipe.youtubeVideoId && (
                        <a
                          href={watch}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                        >
                          <Youtube size={13} />
                          Watch the real video
                          {recipe.youtubeChannel ? ` · ${recipe.youtubeChannel}` : ''}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingTags(editingTags === recipe.id ? null : recipe.id)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                      title="Edit tags"
                    >
                      <Tag size={18} />
                    </button>
                    <button
                      onClick={() => setExpandedId(expandedId === recipe.id ? null : recipe.id)}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
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
                  <div className="mt-4 p-3 bg-emerald-50/60 dark:bg-gray-700 rounded-xl">
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
                  <div className="mt-4 pt-4 border-t border-emerald-100 dark:border-gray-700">
                    <div className="max-w-none">
                      <ReactMarkdown
                        components={{
                          h1: ({ node, ...props }) => (
                            <h1
                              className="font-display text-2xl font-black text-gray-900 dark:text-white mb-4 tracking-tight border-b border-emerald-100 dark:border-gray-700 pb-3"
                              {...props}
                            />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2
                              className="text-lg font-bold text-gray-800 dark:text-gray-100 mt-6 mb-3"
                              {...props}
                            />
                          ),
                          p: ({ node, ...props }) => (
                            <p
                              className="text-gray-600 dark:text-gray-300 leading-relaxed mb-3"
                              {...props}
                            />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul
                              className="space-y-2 mb-4 bg-emerald-50/60 dark:bg-gray-900/60 p-4 rounded-xl border border-emerald-100 dark:border-gray-700 list-none"
                              {...props}
                            />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol
                              className="list-decimal marker:text-emerald-600 dark:marker:text-emerald-400 marker:font-bold space-y-2 mb-4 pl-5"
                              {...props}
                            />
                          ),
                          li: ({ node, ...props }) => (
                            <li
                              className="text-gray-700 dark:text-gray-200 leading-relaxed text-sm"
                              {...props}
                            />
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
                      <div className="mt-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl p-4">
                        <h4 className="font-semibold text-emerald-800 dark:text-emerald-300 mb-2">
                          Nutrition per Serving
                        </h4>
                        <div className="grid grid-cols-4 gap-4 text-center">
                          <div>
                            <div className="font-bold text-emerald-700 dark:text-emerald-400">
                              {recipe.nutrition.calories}
                            </div>
                            <div className="text-xs text-emerald-600 dark:text-emerald-500">
                              Calories
                            </div>
                          </div>
                          <div>
                            <div className="font-bold text-emerald-700 dark:text-emerald-400">
                              {recipe.nutrition.protein}g
                            </div>
                            <div className="text-xs text-emerald-600 dark:text-emerald-500">
                              Protein
                            </div>
                          </div>
                          <div>
                            <div className="font-bold text-emerald-700 dark:text-emerald-400">
                              {recipe.nutrition.carbs}g
                            </div>
                            <div className="text-xs text-emerald-600 dark:text-emerald-500">
                              Carbs
                            </div>
                          </div>
                          <div>
                            <div className="font-bold text-emerald-700 dark:text-emerald-400">
                              {recipe.nutrition.fat}g
                            </div>
                            <div className="text-xs text-emerald-600 dark:text-emerald-500">Fat</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        {filteredRecipes.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No recipes match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
