"use client";

import { useState } from "react";
import { useRecipes } from "@/context/RecipeContext";
import { Trash2, ExternalLink, Clock, Tag, X, Search, Check, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import MediaImage from "./MediaImage";
import { youtubeThumbnailSources } from "@/lib/video";

/** Derive a video id back out of a persisted verified watch url. */
function videoIdFromUrl(url) {
  const match = /^https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})$/.exec(url || "");
  return match ? match[1] : null;
}

export default function SavedRecipes({ onViewRecipe }) {
  const { savedRecipes, deleteRecipe, updateRecipeTags, tags, mounted } = useRecipes();
  const [expandedId, setExpandedId] = useState(null);
  const [filterTag, setFilterTag] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTags, setEditingTags] = useState(null);

  if (!mounted) return null;

  const filteredRecipes = savedRecipes.filter((recipe) => {
    const matchesTag = !filterTag || recipe.tags?.includes(filterTag);
    const matchesSearch =
      !searchQuery ||
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
      <div className="empty in">
        <span className="empty__mark empty__mark--amber" aria-hidden="true">
          <BookOpen strokeWidth={2} />
        </span>
        <p className="empty__title">No saved recipes yet</p>
        <p>Generate a recipe and press Save recipe to start your collection.</p>
      </div>
    );
  }

  return (
    <div className="in">
      <div className="section-head">
        <h2 className="section-title">Your collection · {savedRecipes.length}</h2>
        <span className="mono">Real dishes you kept</span>
      </div>

      {/* Search and filter */}
      <div style={{ display: "grid", gap: "var(--u)", marginBottom: "calc(var(--u) * 2)" }}>
        <div className="field">
          <label className="field__label" htmlFor="recipe-search">
            Search
          </label>
          <span className="field__control">
            <input
              id="recipe-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your recipes…"
              style={{ paddingLeft: "2.1rem" }}
            />
            <Search size={15} aria-hidden />
          </span>
        </div>

        <div className="chips">
          <button
            onClick={() => setFilterTag("")}
            aria-pressed={!filterTag}
            className={`chip${!filterTag ? " chip--filled" : ""}`}
          >
            All
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setFilterTag(filterTag === tag ? "" : tag)}
              aria-pressed={filterTag === tag}
              className={`chip${filterTag === tag ? " chip--filled" : ""}`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <ul className="index">
        {filteredRecipes.map((recipe) => (
          <li key={recipe.id} className="saved-card">
            <div className="saved-card__row">
              {/* Real media persisted with the save */}
              <div className="thumb">
                <MediaImage
                  sources={[
                    ...(recipe.media?.url ? [recipe.media.url] : []),
                    ...youtubeThumbnailSources(videoIdFromUrl(recipe.youtubeUrl)),
                  ]}
                  alt={`Real photo of ${recipe.dishName || recipe.title}`}
                />
              </div>
              <div className="saved-card__main">
                <h3 className="saved-card__title">{recipe.title}</h3>
                <div className="index-row__meta" style={{ marginTop: "0.5em" }}>
                  <span>
                    <Clock size={11} aria-hidden /> {new Date(recipe.savedAt).toLocaleDateString()}
                  </span>
                  {recipe.nutrition?.calories > 0 && (
                    <span className="hot">{recipe.nutrition.calories} cal</span>
                  )}
                  {recipe.tags?.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
              <div className="saved-card__actions">
                <button
                  onClick={() => setEditingTags(editingTags === recipe.id ? null : recipe.id)}
                  className="icon-btn"
                  title="Edit tags"
                  aria-label={`Edit tags for ${recipe.title}`}
                >
                  <Tag size={16} />
                </button>
                <button
                  onClick={() => setExpandedId(expandedId === recipe.id ? null : recipe.id)}
                  className="icon-btn"
                  title="View recipe"
                  aria-label={`View ${recipe.title}`}
                  aria-expanded={expandedId === recipe.id}
                >
                  <ExternalLink size={16} />
                </button>
                <button
                  onClick={() => deleteRecipe(recipe.id)}
                  className="icon-btn"
                  title="Delete recipe"
                  aria-label={`Delete ${recipe.title}`}
                  style={{ color: "var(--c-danger)" }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Tag editor */}
            {editingTags === recipe.id && (
              <div style={{ padding: "calc(var(--u) * 0.8) 0.2rem calc(var(--u) * 0.6)", display: "grid", gap: "0.6em" }}>
                <span className="mono">Select tags</span>
                <div className="chips">
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(recipe.id, tag)}
                      aria-pressed={recipe.tags?.includes(tag)}
                      className={`chip${recipe.tags?.includes(tag) ? " chip--filled" : ""}`}
                    >
                      {recipe.tags?.includes(tag) && <Check size={12} />}
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {expandedId === recipe.id && (
              <div style={{ padding: "calc(var(--u) * 0.6) 0.2rem calc(var(--u) * 0.8)" }}>
                <div className="md">
                  <ReactMarkdown
                    components={{
                      h1: ({ node, ...props }) => <h1 {...props} />,
                      h2: ({ node, ...props }) => <h2 {...props} />,
                      p: ({ node, ...props }) => <p {...props} />,
                      ul: ({ node, ...props }) => <ul {...props} />,
                      ol: ({ node, ...props }) => <ol {...props} />,
                      li: ({ node, ...props }) => <li {...props} />,
                      strong: ({ node, ...props }) => <strong {...props} />,
                    }}
                  >
                    {recipe.recipe}
                  </ReactMarkdown>
                </div>
                {recipe.nutrition && (
                  <div className="facts" style={{ marginTop: "var(--u)" }}>
                    <div className="fact">
                      <span className="fact__value">{recipe.nutrition.calories}</span>
                      <span className="fact__label">Calories</span>
                    </div>
                    <div className="fact">
                      <span className="fact__value">
                        {recipe.nutrition.protein}
                        <small> g</small>
                      </span>
                      <span className="fact__label">Protein</span>
                    </div>
                    <div className="fact">
                      <span className="fact__value">
                        {recipe.nutrition.carbs}
                        <small> g</small>
                      </span>
                      <span className="fact__label">Carbs</span>
                    </div>
                    <div className="fact">
                      <span className="fact__value">
                        {recipe.nutrition.fat}
                        <small> g</small>
                      </span>
                      <span className="fact__label">Fat</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {filteredRecipes.length === 0 && (
        <div className="empty">
          <span className="empty__mark empty__mark--amber" aria-hidden="true">
            <BookOpen strokeWidth={2} />
          </span>
          <p className="empty__title">Nothing matches</p>
          <p>No recipes match your search.</p>
        </div>
      )}
    </div>
  );
}
