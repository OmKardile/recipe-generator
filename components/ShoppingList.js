'use client';

import { useState } from 'react';
import { useRecipes } from '@/context/RecipeContext';
import { ShoppingCart, Copy, Check, Printer, Calendar } from 'lucide-react';

export default function ShoppingList({ currentRecipe, currentIngredients }) {
  const { savedRecipes, mealPlan, mounted } = useRecipes();
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('single'); // 'single' or 'weekly'

  if (!mounted) return null;

  const extractIngredientsFromMarkdown = (markdown) => {
    if (!markdown) return [];
    const lines = markdown.split('\n');
    const ingredients = [];
    let inIngredients = false;

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes('## ingredients') || lower.includes('### ingredients')) {
        inIngredients = true;
        continue;
      }
      if (inIngredients && (lower.startsWith('## ') || lower.startsWith('### '))) {
        break;
      }
      if (inIngredients && line.trim().startsWith('- ')) {
        ingredients.push(line.trim().slice(2));
      }
    }
    return ingredients;
  };

  const getIngredientsFromRecipe = (recipeEntry) => {
    if (recipeEntry?.ingredients?.length > 0) return recipeEntry.ingredients;
    return extractIngredientsFromMarkdown(recipeEntry?.recipe || '');
  };

  // Weekly shopping list - aggregate from meal plan
  const getWeeklyIngredients = () => {
    const ingredientMap = new Map();
    
    mealPlan.forEach((entry) => {
      const ingredients = getIngredientsFromRecipe(entry.recipe);
      ingredients.forEach((ing) => {
        const key = ing.toLowerCase().trim();
        if (ingredientMap.has(key)) {
          ingredientMap.set(key, {
            text: ing,
            count: ingredientMap.get(key).count + 1,
          });
        } else {
          ingredientMap.set(key, { text: ing, count: 1 });
        }
      });
    });

    return Array.from(ingredientMap.values());
  };

  const weeklyIngredients = getWeeklyIngredients();

  // Single recipe mode
  const allRecipes = currentRecipe
    ? [{ id: '__current', title: 'Current Recipe', recipe: currentRecipe, ingredients: currentIngredients }, ...savedRecipes]
    : savedRecipes;

  const selectedRecipe = allRecipes.find((r) => r.id === selectedRecipeId) || allRecipes[0];
  const singleIngredients = getIngredientsFromRecipe(selectedRecipe);

  const ingredients = viewMode === 'weekly' ? weeklyIngredients.map((i) => i.text) : singleIngredients;

  const toggleItem = (index) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedItems(newChecked);
  };

  const copyToClipboard = async () => {
    const text = ingredients.map((ing) => `☐ ${ing}`).join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const printList = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head><title>Shopping List</title></head>
        <body>
          <h1>${viewMode === 'weekly' ? 'Weekly Shopping List' : 'Shopping List'}</h1>
          <ul>
            ${ingredients.map((ing) => `<li>${ing}</li>`).join('')}
          </ul>
        </body>
      </html>
    `);
    printWindow.document.close();
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-green-400 to-emerald-500 h-3"></div>
        
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {viewMode === 'weekly' ? 'Weekly Shopping List' : 'Shopping List'}
            </h2>
            <div className="flex gap-2">
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
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setViewMode('single')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'single'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Single Recipe
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              disabled={mealPlan.length === 0}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'weekly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              Weekly ({mealPlan.length} meals)
            </button>
          </div>

          {viewMode === 'single' && allRecipes.length > 1 && (
            <select
              value={selectedRecipeId}
              onChange={(e) => setSelectedRecipeId(e.target.value)}
              className="w-full mb-6 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-700"
            >
              {allRecipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title || 'Untitled Recipe'}
                </option>
              ))}
            </select>
          )}

          <ul className="space-y-2">
            {ingredients.map((ingredient, index) => (
              <li
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                onClick={() => toggleItem(index)}
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    checkedItems.has(index)
                      ? 'bg-green-500 border-green-500'
                      : 'border-gray-300 dark:border-gray-500'
                  }`}
                >
                  {checkedItems.has(index) && (
                    <Check size={12} className="text-white" />
                  )}
                </div>
                <span
                  className={`flex-1 text-gray-700 dark:text-gray-300 ${
                    checkedItems.has(index) ? 'line-through text-gray-400 dark:text-gray-500' : ''
                  }`}
                >
                  {ingredient}
                </span>
                {viewMode === 'weekly' && weeklyIngredients[index]?.count > 1 && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    x{weeklyIngredients[index].count}
                  </span>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 text-center">
            {checkedItems.size} of {ingredients.length} items checked
          </div>
        </div>
      </div>
    </div>
  );
}
