"use client";

import { useState } from "react";
import { useRecipes } from "@/context/RecipeContext";
import { Copy, Check, Printer, RotateCcw } from "lucide-react";
import {
  ingredientLine, categorizeIngredient, SHOPPING_CATEGORIES, escapeHtml,
} from "@/lib/recipeUtils";

export default function ShoppingList({ currentRecipe, currentIngredients }) {
  const { savedRecipes, mealPlan, mounted } = useRecipes();
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  // Checks are keyed per list ("<listKey>#<index>") so switching recipes or
  // modes naturally shows a clean list without effect-driven state resets.
  const [checkedKeys, setCheckedKeys] = useState(new Set());
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState("single"); // 'single' | 'weekly'

  if (!mounted) return null;

  const extractIngredientsFromMarkdown = (markdown) => {
    if (!markdown) return [];
    const lines = markdown.split("\n");
    const ingredients = [];
    let inIngredients = false;

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.startsWith("## ingredients") || lower.startsWith("### ingredients")) {
        inIngredients = true;
        continue;
      }
      if (inIngredients && (lower.startsWith("## ") || lower.startsWith("### "))) break;
      if (inIngredients && line.trim().startsWith("- ")) {
        ingredients.push(line.trim().slice(2));
      }
    }
    return ingredients;
  };

  /** Prefer structured ingredients; fall back to markdown scraping. */
  const getIngredientsFromRecipe = (recipeEntry) => {
    if (recipeEntry?.structured?.ingredients?.length) {
      return recipeEntry.structured.ingredients.map((ing) => ingredientLine(ing));
    }
    if (recipeEntry?.ingredients?.length) return recipeEntry.ingredients;
    return extractIngredientsFromMarkdown(recipeEntry?.recipe || "");
  };

  /** Weekly mode: aggregate, summing structured amounts by name+unit. */
  const getWeeklyIngredients = () => {
    const textMap = new Map();
    const structuredMap = new Map();

    mealPlan.forEach((entry) => {
      const recipe = entry.recipe;
      if (recipe?.structured?.ingredients?.length) {
        recipe.structured.ingredients.forEach((ing) => {
          const key = `${(ing.name || "").toLowerCase().trim()}|${(ing.unit || "").toLowerCase()}`;
          if (structuredMap.has(key)) {
            structuredMap.get(key).amount += ing.amount || 0;
          } else {
            structuredMap.set(key, {
              name: ing.name,
              unit: ing.unit,
              amount: ing.amount || 0,
              note: ing.note,
            });
          }
        });
      } else {
        const lines = getIngredientsFromRecipe(recipe);
        lines.forEach((line) => {
          const key = line.toLowerCase().trim();
          textMap.set(key, (textMap.get(key) || 0) + 1);
        });
      }
    });

    const structuredItems = Array.from(structuredMap.values()).map((ing) => ({
      text: ingredientLine(ing),
      name: ing.name,
      count: null,
    }));
    const textItems = Array.from(textMap.entries()).map(([text, count]) => ({
      text,
      name: text,
      count,
    }));

    return [...structuredItems, ...textItems];
  };

  const weeklyIngredients = getWeeklyIngredients();

  const allRecipes = currentRecipe
    ? [
        { id: "__current", title: "Current Recipe", recipe: currentRecipe, ingredients: currentIngredients },
        ...savedRecipes,
      ]
    : savedRecipes;

  const selectedRecipe = allRecipes.find((r) => r.id === selectedRecipeId) || allRecipes[0];

  const listKey =
    viewMode === "weekly" ? "weekly" : selectedRecipe?.id || "none";

  const items =
    viewMode === "weekly"
      ? weeklyIngredients.map((i) => ({ text: i.text, name: i.name, count: i.count }))
      : getIngredientsFromRecipe(selectedRecipe).map((line) => ({
          text: line,
          name: line,
          count: null,
        }));

  const keyOf = (index) => `${listKey}#${index}`;
  const checkedCount = items.reduce(
    (sum, _, index) => sum + (checkedKeys.has(keyOf(index)) ? 1 : 0),
    0
  );

  // Group items by category for a supermarket-friendly layout.
  const grouped = SHOPPING_CATEGORIES.map(({ key, label }) => ({
    key,
    label,
    items: items
      .map((item, index) => ({ ...item, index }))
      .filter((item) => categorizeIngredient(item.name) === key),
  })).filter((group) => group.items.length > 0);

  const toggleItem = (index) => {
    const key = keyOf(index);
    const newChecked = new Set(checkedKeys);
    if (newChecked.has(key)) newChecked.delete(key);
    else newChecked.add(key);
    setCheckedKeys(newChecked);
  };

  const uncheckAll = () => {
    setCheckedKeys((prev) => {
      const next = new Set(prev);
      [...next].filter((k) => k.startsWith(`${listKey}#`)).forEach((k) => next.delete(k));
      return next;
    });
  };

  const copyToClipboard = async () => {
    const text = items.map((item) => `☐ ${item.text}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard unavailable — still show feedback, list remains on screen
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const printList = () => {
    const printWindow = window.open("", "_blank", "width=420,height=640");
    if (!printWindow) return; // popup blocked — don't crash
    printWindow.document.write(`
      <html>
        <head>
          <title>Shopping List</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            h1 { font-size: 20px; border-bottom: 2px solid #333; padding-bottom: 8px; }
            h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #555; margin: 16px 0 6px; }
            ul { padding-left: 0; list-style: none; }
            li { padding: 4px 0 4px 26px; position: relative; }
            li::before { content: ''; position: absolute; left: 0; top: 7px; width: 12px; height: 12px; border: 1.5px solid #333; }
            .meta { color: #666; font-size: 12px; margin-top: 16px; }
          </style>
        </head>
        <body>
          <h1>${viewMode === "weekly" ? "Weekly Shopping List" : "Shopping List"}</h1>
          ${grouped
            .map(
              (group) => `
            <h2>${escapeHtml(group.label)}</h2>
            <ul>
              ${group.items.map((item) => `<li>${escapeHtml(item.text)}</li>`).join("")}
            </ul>`
            )
            .join("")}
          <p class="meta">${items.length} items · Indian Recipe Generator</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (viewMode === "weekly" && mealPlan.length === 0) {
    return (
      <div className="empty in">
        <p className="empty__title">No meals planned</p>
        <p>Add recipes to your meal plan to generate a weekly shopping list.</p>
      </div>
    );
  }

  if (viewMode === "single" && !selectedRecipe?.recipe) {
    return (
      <div className="empty in">
        <p className="empty__title">No recipe selected</p>
        <p>Generate a recipe or select a saved recipe to view its shopping list.</p>
      </div>
    );
  }

  return (
    <div className="shop in">
      <div className="section-head">
        <h2 className="section-title">
          {viewMode === "weekly" ? "Weekly shopping list" : "Shopping list"}
        </h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {checkedCount > 0 && (
            <button
              onClick={uncheckAll}
              className="icon-btn"
              title="Uncheck all"
              aria-label="Uncheck all items"
            >
              <RotateCcw size={15} />
            </button>
          )}
          <button onClick={copyToClipboard} className="icon-btn" title="Copy list" aria-label="Copy list to clipboard">
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
          <button onClick={printList} className="icon-btn" title="Print list" aria-label="Print list">
            <Printer size={15} />
          </button>
        </div>
      </div>

      {/* View mode toggle */}
      <div className="chips" role="tablist" aria-label="Shopping list mode">
        <button
          onClick={() => setViewMode("single")}
          className={`chip${viewMode === "single" ? " chip--filled" : ""}`}
          role="tab"
          aria-selected={viewMode === "single"}
        >
          Single recipe
        </button>
        <button
          onClick={() => setViewMode("weekly")}
          disabled={mealPlan.length === 0}
          className={`chip${viewMode === "weekly" ? " chip--filled" : ""}`}
          role="tab"
          aria-selected={viewMode === "weekly"}
        >
          Weekly · {mealPlan.length} meals
        </button>
      </div>

      {viewMode === "single" && allRecipes.length > 1 && (
        <div className="field">
          <label className="field__label" htmlFor="shop-recipe">
            Recipe
          </label>
          <select
            id="shop-recipe"
            value={selectedRecipeId}
            onChange={(e) => setSelectedRecipeId(e.target.value)}
            aria-label="Choose recipe for shopping list"
            style={{
              width: "100%",
              background: "transparent",
              border: 0,
              borderBottom: "1px solid var(--c-line-strong)",
              padding: "0.55em 0.1em",
              color: "var(--c-fg)",
            }}
          >
            {allRecipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title || "Untitled Recipe"}
              </option>
            ))}
          </select>
        </div>
      )}

      {grouped.map(({ key, label, items: groupItems }) => (
        <section key={key} aria-labelledby={`shop-${key}`}>
          <h3 className="mono" id={`shop-${key}`} style={{ color: "var(--c-muted)" }}>
            {label}
          </h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {groupItems.map((item) => (
              <li
                key={`${item.index}-${item.text}`}
                role="checkbox"
                aria-checked={checkedKeys.has(keyOf(item.index))}
                tabIndex={0}
                onClick={() => toggleItem(item.index)}
                onKeyDown={(e) => {
                  // Keyboard users must be able to check items off too.
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleItem(item.index);
                  }
                }}
                className={`shop-row${checkedKeys.has(keyOf(item.index)) ? " is-checked" : ""}`}
              >
                <span className="box" aria-hidden="true">
                  ✓
                </span>
                <span className="label">{item.text}</span>
                {item.count > 1 && <span className="qty">×{item.count}</span>}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="mono" style={{ color: "var(--c-muted)" }}>
        {checkedCount} of {items.length} items checked
      </p>
    </div>
  );
}
