"use client";

import { useState } from "react";
import { useRecipes } from "@/context/RecipeContext";
import {
  PiShoppingCartSimpleFill,
  PiCopyFill,
  PiCheckFill,
  PiPrinterFill,
  PiCalendarFill,
  PiArrowCounterClockwiseFill,
} from "react-icons/pi";
import { GiChiliPepper } from "react-icons/gi";
import { PiCarrotFill, PiEggFill, PiGrainsFill, PiBasketFill } from "react-icons/pi";
import {
  ingredientLine, categorizeIngredient, SHOPPING_CATEGORIES, escapeHtml,
} from "@/lib/recipeUtils";

const CATEGORY_ICONS = {
  produce: PiCarrotFill,
  protein: PiEggFill,
  pantry: PiGrainsFill,
  spices: GiChiliPepper,
  other: PiBasketFill,
};

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
            body { font-family: Georgia, serif; padding: 24px; color: #1c2a20; }
            h1 { font-size: 22px; border-bottom: 2px solid #3b7a4d; padding-bottom: 8px; }
            h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; color: #55645a; margin: 16px 0 6px; }
            ul { padding-left: 0; list-style: none; }
            li { padding: 4px 0 4px 26px; position: relative; }
            li::before { content: ''; position: absolute; left: 0; top: 7px; width: 12px; height: 12px; border: 1.5px solid #3b7a4d; border-radius: 3px; }
            .meta { color: #5a6b4f; font-size: 12px; margin-top: 16px; }
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
          <p class="meta">${items.length} items · Rasoi AI Recipe Studio</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (viewMode === "weekly" && mealPlan.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl py-20 text-center">
        <div className="mx-auto mb-5 grid h-20 w-20 animate-float place-items-center rounded-3xl border border-line bg-elev shadow-card">
          <PiCalendarFill className="text-3xl text-herb-400" aria-hidden />
        </div>
        <h3 className="mb-2 font-display text-2xl font-semibold">No meals planned</h3>
        <p className="text-body">
          Add recipes to your meal plan to generate a weekly shopping list.
        </p>
      </div>
    );
  }

  if (viewMode === "single" && !selectedRecipe?.recipe) {
    return (
      <div className="mx-auto w-full max-w-2xl py-20 text-center">
        <div className="mx-auto mb-5 grid h-20 w-20 animate-float place-items-center rounded-3xl border border-line bg-elev shadow-card">
          <PiShoppingCartSimpleFill className="text-3xl text-herb-400" aria-hidden />
        </div>
        <h3 className="mb-2 font-display text-2xl font-semibold">No recipe selected</h3>
        <p className="text-body">
          Generate a recipe or select a saved recipe to view its shopping list.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-8 text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-herb-600 dark:text-herb-400">
          The market run
        </p>
        <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
          {viewMode === "weekly" ? "Weekly" : ""} Shopping{" "}
          <span className="display-accent text-herb-600 dark:text-herb-300">list</span>
        </h2>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-line bg-elev shadow-card">

        <div className="p-6 sm:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-herb-100 text-herb-600 dark:bg-herb-900/70 dark:text-herb-300">
                <PiShoppingCartSimpleFill size={20} aria-hidden />
              </span>
              <h2 className="font-display text-xl font-semibold">
                {viewMode === "weekly" ? "Weekly Shopping List" : "Shopping List"}
              </h2>
            </div>
            <div className="flex gap-2">
              {checkedCount > 0 && (
                <button
                  onClick={uncheckAll}
                  className="grid h-10 w-10 place-items-center rounded-full border border-line text-body transition-all hover:rotate-[-120deg] hover:border-herb-400 hover:text-herb-700 dark:hover:text-herb-300"
                  title="Uncheck all"
                  aria-label="Uncheck all items"
                >
                  <PiArrowCounterClockwiseFill size={15} aria-hidden />
                </button>
              )}
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold text-body transition-colors hover:border-herb-400 hover:text-herb-700 dark:hover:text-herb-300"
              >
                {copied ? (
                  <PiCheckFill size={15} className="text-herb-600 dark:text-herb-400" aria-hidden />
                ) : (
                  <PiCopyFill size={15} aria-hidden />
                )}
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={printList}
                className="flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold text-body transition-colors hover:border-herb-400 hover:text-herb-700 dark:hover:text-herb-300"
              >
                <PiPrinterFill size={15} aria-hidden />
                Print
              </button>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="mb-6 flex gap-1 rounded-full border border-line bg-elev2 p-1 dark:bg-herb-950/40" role="tablist" aria-label="Shopping list mode">
            <button
              onClick={() => setViewMode("single")}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                viewMode === "single"
                  ? "bg-herb-600 text-white shadow-glow"
                  : "text-body hover:text-herb-700 dark:hover:text-herb-300"
              }`}
              role="tab"
              aria-selected={viewMode === "single"}
            >
              Single recipe
            </button>
            <button
              onClick={() => setViewMode("weekly")}
              disabled={mealPlan.length === 0}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                viewMode === "weekly"
                  ? "bg-herb-600 text-white shadow-glow"
                  : "text-body hover:text-herb-700 dark:hover:text-herb-300"
              }`}
              role="tab"
              aria-selected={viewMode === "weekly"}
            >
              Weekly ({mealPlan.length} meals)
            </button>
          </div>

          {viewMode === "single" && allRecipes.length > 1 && (
            <select
              value={selectedRecipeId}
              onChange={(e) => setSelectedRecipeId(e.target.value)}
              aria-label="Choose recipe for shopping list"
              className="mb-6 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm text-ink outline-none transition-all focus:border-herb-400 focus:ring-2 focus:ring-herb-400/30 dark:bg-herb-950/40"
            >
              {allRecipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title || "Untitled Recipe"}
                </option>
              ))}
            </select>
          )}

          {grouped.map(({ key, label, items: groupItems }, groupIndex) => {
            const GroupIcon = CATEGORY_ICONS[key] || PiBasketFill;
            return (
              <div key={key} className="mb-6">
                <h3 className="mb-2.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-herb-600 dark:text-herb-400">
                  <GroupIcon size={14} aria-hidden />
                  {label}
                  <span className="ml-1 font-normal text-body/60">({groupItems.length})</span>
                </h3>
                <ul className="space-y-1">
                  {groupItems.map((item) => (
                    <li
                      key={`${item.index}-${item.text}`}
                      style={{ animationDelay: `${Math.min(groupIndex + item.index, 12) * 40}ms` }}
                      className="animate-fade-in flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-herb-100/40 dark:hover:bg-herb-900/30"
                      onClick={() => toggleItem(item.index)}
                    >
                      <span
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition-all ${
                          checkedKeys.has(keyOf(item.index))
                            ? "animate-pop border-herb-600 bg-herb-600 text-white"
                            : "border-line"
                        }`}
                        aria-hidden
                      >
                        {checkedKeys.has(keyOf(item.index)) && <PiCheckFill size={11} />}
                      </span>
                      <span
                        className={`flex-1 text-sm text-body transition-all ${
                          checkedKeys.has(keyOf(item.index))
                            ? "text-body/50 line-through"
                            : ""
                        }`}
                      >
                        {item.text}
                      </span>
                      {item.count > 1 && (
                        <span className="shrink-0 rounded-full bg-herb-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-herb-700 dark:bg-herb-900/70 dark:text-herb-300">
                          ×{item.count}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {/* Progress footer */}
          <div className="mt-2 border-t border-line pt-5">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-body">
              <span>{checkedCount} of {items.length} gathered</span>
              <span className="tabular-nums">
                {Math.round((checkedCount / Math.max(items.length, 1)) * 100)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-herb-950/10 dark:bg-herb-100/10" aria-hidden>
              <div
                className="h-full rounded-full bg-gradient-to-r from-herb-500 to-zest-deep transition-all duration-500"
                style={{ width: `${(checkedCount / Math.max(items.length, 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
