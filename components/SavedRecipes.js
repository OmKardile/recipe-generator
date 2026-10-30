"use client";

import { useState } from "react";
import { useRecipes } from "@/context/RecipeContext";
import {
  PiTrashSimpleFill,
  PiCaretDownFill,
  PiClockFill,
  PiBookBookmarkFill,
  PiTagFill,
  PiX,
  PiMagnifyingGlassFill,
  PiCheckFill,
  PiFireFill,
} from "react-icons/pi";
import ReactMarkdown from "react-markdown";
import { foodArtDataUri } from "@/lib/foodArt";

export default function SavedRecipes({ onViewRecipe }) {
  const { savedRecipes, deleteRecipe, updateRecipeTags, tags, mounted } = useRecipes();
  const [expandedId, setExpandedId] = useState(null);
  const [filterTag, setFilterTag] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
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
      <div className="mx-auto w-full max-w-2xl py-20 text-center">
        <div className="mx-auto mb-5 grid h-20 w-20 animate-float place-items-center rounded-3xl border border-line bg-elev shadow-card">
          <PiBookBookmarkFill className="text-3xl text-herb-400" aria-hidden />
        </div>
        <h3 className="mb-2 font-display text-2xl font-semibold">No saved recipes yet</h3>
        <p className="text-body">
          Generate a recipe and hit &ldquo;Save recipe&rdquo; to start your collection.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-8 text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-herb-600 dark:text-herb-400">
          The collection
        </p>
        <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Your recipe <span className="display-accent text-herb-600 dark:text-herb-300">shelf</span>
          <span className="ml-2 align-middle text-lg text-body">({savedRecipes.length})</span>
        </h2>
      </div>

      {/* Search and Filter */}
      <div className="mb-8 space-y-4">
        <div className="relative">
          <PiMagnifyingGlassFill
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-body"
            aria-hidden
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your collection…"
            className="w-full rounded-full border border-line bg-elev py-3 pl-11 pr-4 text-sm text-ink outline-none transition-all placeholder:text-body/60 focus:border-herb-400 focus:ring-2 focus:ring-herb-400/30 dark:bg-herb-950/40"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterTag("")}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
              !filterTag
                ? "bg-herb-600 text-white shadow-glow"
                : "border border-line bg-elev text-body hover:border-herb-400 hover:text-herb-700 dark:hover:text-herb-300"
            }`}
          >
            All
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setFilterTag(filterTag === tag ? "" : tag)}
              aria-pressed={filterTag === tag}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
                filterTag === tag
                  ? "bg-herb-600 text-white shadow-glow"
                  : "border border-line bg-elev text-body hover:border-herb-400 hover:text-herb-700 dark:hover:text-herb-300"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredRecipes.map((recipe, index) => (
          <article
            key={recipe.id}
            style={{ animationDelay: `${Math.min(index, 8) * 80}ms` }}
            className="animate-fade-up overflow-hidden rounded-3xl border border-line bg-elev shadow-card transition-shadow hover:shadow-lift"
          >
            <div className="flex items-stretch gap-0">
              {/* Deterministic artwork thumb — instant, offline, unique per dish */}
              <div className="hidden w-32 shrink-0 overflow-hidden sm:block" aria-hidden>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={foodArtDataUri(recipe.title, recipe.structured?.cuisine)}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>

              <div className="min-w-0 flex-1 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-lg font-semibold">
                      {recipe.title}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-body">
                      <span className="inline-flex items-center gap-1">
                        <PiClockFill size={12} aria-hidden />
                        {new Date(recipe.savedAt).toLocaleDateString()}
                      </span>
                      {recipe.nutrition?.calories > 0 && (
                        <span className="inline-flex items-center gap-1 font-semibold text-herb-600 dark:text-herb-400">
                          <PiFireFill size={12} aria-hidden />
                          {recipe.nutrition.calories} cal
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {recipe.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-herb-200/70 bg-herb-100/60 px-2 py-0.5 text-[11px] font-semibold text-herb-700 dark:border-herb-800 dark:bg-herb-900/50 dark:text-herb-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => setEditingTags(editingTags === recipe.id ? null : recipe.id)}
                      className="grid h-9 w-9 place-items-center rounded-xl text-body transition-colors hover:bg-herb-100 hover:text-herb-700 dark:hover:bg-herb-900 dark:hover:text-herb-300"
                      title="Edit tags"
                      aria-label={`Edit tags for ${recipe.title}`}
                    >
                      <PiTagFill size={16} aria-hidden />
                    </button>
                    <button
                      onClick={() => setExpandedId(expandedId === recipe.id ? null : recipe.id)}
                      className="grid h-9 w-9 place-items-center rounded-xl text-body transition-colors hover:bg-herb-100 hover:text-herb-700 dark:hover:bg-herb-900 dark:hover:text-herb-300"
                      title="View recipe"
                      aria-label={`View ${recipe.title}`}
                      aria-expanded={expandedId === recipe.id}
                    >
                      <PiCaretDownFill
                        size={16}
                        className={`transition-transform duration-300 ${expandedId === recipe.id ? "rotate-180" : ""}`}
                        aria-hidden
                      />
                    </button>
                    <button
                      onClick={() => deleteRecipe(recipe.id)}
                      className="grid h-9 w-9 place-items-center rounded-xl text-body transition-colors hover:bg-chili/10 hover:text-chili"
                      title="Delete recipe"
                      aria-label={`Delete ${recipe.title}`}
                    >
                      <PiTrashSimpleFill size={16} aria-hidden />
                    </button>
                  </div>
                </div>

                {/* Tag Editor */}
                {editingTags === recipe.id && (
                  <div className="animate-fade-in mt-4 rounded-2xl border border-line bg-elev2/60 p-3 dark:bg-herb-950/40">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-body">
                      Select tags
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(recipe.id, tag)}
                          aria-pressed={recipe.tags?.includes(tag)}
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold transition-all ${
                            recipe.tags?.includes(tag)
                              ? "bg-herb-600 text-white shadow-glow"
                              : "border border-line bg-elev text-body hover:border-herb-400 hover:text-herb-700 dark:hover:text-herb-300"
                          }`}
                        >
                          {recipe.tags?.includes(tag) && <PiCheckFill size={11} aria-hidden />}
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {expandedId === recipe.id && (
                  <div className="animate-fade-in mt-4 border-t border-line pt-4">
                    <div className="max-w-none">
                      <ReactMarkdown
                        components={{
                          h1: ({ node, ...props }) => (
                            <h1 className="mb-4 border-b border-line pb-3 font-display text-2xl font-semibold tracking-tight" {...props} />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2 className="mb-3 mt-6 font-display text-lg font-semibold" {...props} />
                          ),
                          p: ({ node, ...props }) => (
                            <p className="mb-3 leading-relaxed text-body" {...props} />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul className="mb-4 list-none space-y-1 rounded-2xl border border-line bg-elev2/60 p-3 dark:bg-herb-950/40" {...props} />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol className="mb-4 list-decimal space-y-2 pl-5 marker:font-bold marker:text-herb-600 dark:marker:text-herb-400" {...props} />
                          ),
                          li: ({ node, ...props }) => (
                            <li className="text-sm leading-relaxed text-body" {...props} />
                          ),
                          strong: ({ node, ...props }) => (
                            <strong className="font-semibold text-ink" {...props} />
                          ),
                        }}
                      >
                        {recipe.recipe}
                      </ReactMarkdown>
                    </div>
                    {recipe.nutrition && (
                      <div className="mt-4 rounded-2xl border border-herb-200/70 bg-herb-50 p-4 dark:border-herb-800 dark:bg-herb-900/30">
                        <h4 className="mb-3 flex items-center gap-1.5 text-sm font-bold uppercase tracking-[0.14em] text-herb-700 dark:text-herb-300">
                          <PiFireFill size={13} aria-hidden /> Nutrition per serving
                        </h4>
                        <div className="grid grid-cols-4 gap-4 text-center">
                          {[
                            ["Calories", recipe.nutrition.calories, ""],
                            ["Protein", recipe.nutrition.protein, "g"],
                            ["Carbs", recipe.nutrition.carbs, "g"],
                            ["Fat", recipe.nutrition.fat, "g"],
                          ].map(([label, value, unit]) => (
                            <div key={label}>
                              <div className="font-display text-xl font-semibold text-herb-700 dark:text-herb-300">
                                {value}
                                {unit}
                              </div>
                              <div className="text-[11px] uppercase tracking-[0.12em] text-body">{label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}

        {filteredRecipes.length === 0 && (
          <div className="py-10 text-center">
            <p className="flex items-center justify-center gap-2 text-body">
              <PiX size={14} aria-hidden />
              No recipes match your search.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
