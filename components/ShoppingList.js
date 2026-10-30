'use client';

import { useState } from 'react';
import { useRecipes } from '@/context/RecipeContext';
import {
  ShoppingCart, Copy, Check, Printer, Calendar, Apple, Milk, Wheat,
  FlaskConical, Package, RotateCcw,
} from 'lucide-react';
import {
  ingredientLine, categorizeIngredient, SHOPPING_CATEGORIES, escapeHtml,
} from '@/lib/recipeUtils';

const CATEGORY_ICONS = {
  produce: Apple,
  protein: Milk,
  pantry: Wheat,
  spices: FlaskConical,
  other: Package,
};

export default function ShoppingList({ currentRecipe, currentIngredients }) {
  const { savedRecipes, mealPlan, mounted } = useRecipes();
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  // Checks are keyed per list ("<listKey>#<index>") so switching recipes or
  // modes naturally shows a clean list without effect-driven state resets.
  const [checkedKeys, setCheckedKeys] = useState(new Set());
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('single'); // 'single' | 'weekly'

  if (!mounted) return null;

  const extractIngredientsFromMarkdown = (markdown) => {
    if (!markdown) return [];
    const lines = markdown.split('\n');
    const ingredients = [];
    let inIngredients = false;

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.startsWith('## ingredients') || lower.startsWith('### ingredients')) {
        inIngredients = true;
        continue;
      }
      if (inIngredients && (lower.startsWith('## ') || lower.startsWith('### '))) break;
      if (inIngredients && line.trim().startsWith('- ')) {
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
    return extractIngredientsFromMarkdown(recipeEntry?.recipe || '');
  };

  /** Weekly mode: aggregate, summing structured amounts by name+unit. */
  const getWeeklyIngredients = () => {
    const textMap = new Map();
    const structuredMap = new Map();

    mealPlan.forEach((entry) => {
      const recipe = entry.recipe;
      if (recipe?.structured?.ingredients?.length) {
        recipe.structured.ingredients.forEach((ing) => {
          const key = `${(ing.name || '').toLowerCase().trim()}|${(ing.unit || '').toLowerCase()}`;
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
        { id: '__current', title: 'Current Recipe', recipe: currentRecipe, ingredients: currentIngredients },
        ...savedRecipes,
      ]
    : savedRecipes;

  const selectedRecipe = allRecipes.find((r) => r.id === selectedRecipeId) || allRecipes[0];

  const listKey =
    viewMode === 'weekly' ? 'weekly' : selectedRecipe?.id || 'none';

  const items =
    viewMode === 'weekly'
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
    const text = items.map((item) => `☐ ${item.text}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard unavailable — still show feedback, list remains on screen
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const printList = () => {
    const printWindow = window.open('', '_blank', 'width=420,height=640');
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
          <h1>${viewMode === 'weekly' ? 'Weekly Shopping List' : 'Shopping List'}</h1>
          ${grouped
            .map(
              (group) => `
            <h2>${escapeHtml(group.label)}</h2>
            <ul>
              ${group.items.map((item) => `<li>${escapeHtml(item.text)}</li>`).join('')}
            </ul>`
            )
            .join('')}
          <p class="meta">${items.length} items · AI Recipe Generator</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (viewMode === 'weekly' && mealPlan.length === 0) {
    return (
      <div className="w-full max-w-3xl mx-auto mt-12 text-center py-16">
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full inline-block mb-4">
          <Calendar className="h-10 w-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No meals planned</h3>
        <p className="text-gray-500 dark:text-gray-400">
          Add recipes to your meal plan to generate a weekly shopping list.
        </p>
      </div>
    );
  }

  if (viewMode === 'single' && !selectedRecipe?.recipe) {
    return (
      <div className="w-full max-w-3xl mx-auto mt-12 text-center py-16">
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full inline-block mb-4">
          <ShoppingCart className="h-10 w-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No recipe selected</h3>
        <p className="text-gray-500 dark:text-gray-400">
          Generate a recipe or select a saved recipe to view its shopping list.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto mt-12">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="bg-gradient-to-r from-green-400 to-emerald-500 h-3"></div>

        <div className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {viewMode === 'weekly' ? 'Weekly Shopping List' : 'Shopping List'}
            </h2>
            <div className="flex gap-2">
              {checkedCount > 0 && (
                <button
                  onClick={uncheckAll}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Uncheck all"
                >
                  <RotateCcw size={15} />
                </button>
              )}
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={printList}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <Printer size={16} />
                Print
              </button>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2 mb-6" role="tablist" aria-label="Shopping list mode">
            <button
              onClick={() => setViewMode('single')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'single'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              role="tab"
              aria-selected={viewMode === 'single'}
            >
              Single Recipe
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              disabled={mealPlan.length === 0}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                viewMode === 'weekly'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              role="tab"
              aria-selected={viewMode === 'weekly'}
            >
              Weekly ({mealPlan.length} meals)
            </button>
          </div>

          {viewMode === 'single' && allRecipes.length > 1 && (
            <select
              value={selectedRecipeId}
              onChange={(e) => setSelectedRecipeId(e.target.value)}
              aria-label="Choose recipe for shopping list"
              className="w-full mb-6 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
            >
              {allRecipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title || 'Untitled Recipe'}
                </option>
              ))}
            </select>
          )}

          {grouped.map(({ key, label, items: groupItems }) => {
            const GroupIcon = CATEGORY_ICONS[key] || Package;
            return (
              <div key={key} className="mb-5">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                  <GroupIcon size={13} />
                  {label}
                </h3>
                <ul className="space-y-1">
                  {groupItems.map((item) => (
                    <li
                      key={`${item.index}-${item.text}`}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                      onClick={() => toggleItem(item.index)}
                    >
                      <div
                        className={`w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-colors ${
                          checkedKeys.has(keyOf(item.index))
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300 dark:border-gray-500'
                        }`}
                        aria-hidden="true"
                      >
                        {checkedKeys.has(keyOf(item.index)) && <Check size={12} className="text-white" />}
                      </div>
                      <span
                        className={`flex-1 text-gray-700 dark:text-gray-300 text-sm ${
                          checkedKeys.has(keyOf(item.index))
                            ? 'line-through text-gray-400 dark:text-gray-500'
                            : ''
                        }`}
                      >
                        {item.text}
                      </span>
                      {item.count > 1 && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                          ×{item.count}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 text-center">
            {checkedCount} of {items.length} items checked
          </div>
        </div>
      </div>
    </div>
  );
}
