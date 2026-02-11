"use client";

import { useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';

export default function IngredientInput({
  ingredients,
  setIngredients,
  preferences,
  setPreferences,
  onSubmit,
  isLoading,
}) {
  const [inputValue, setInputValue] = useState('');

  const handleAddIngredient = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setIngredients([...ingredients, inputValue.trim()]);
      setInputValue('');
    }
  };

  const removeIngredient = (index) => {
    const newIngredients = ingredients.filter((_, i) => i !== index);
    setIngredients(newIngredients);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Add Ingredients</h2>
      
      <form onSubmit={handleAddIngredient} className="flex gap-2 mb-4">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="e.g. Chicken, Rice, Tomatoes"
          disabled={isLoading}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-black"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={24} />
        </button>
      </form>

      {ingredients.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {ingredients.map((ing, index) => (
            <span
              key={index}
              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1"
            >
              {ing}
              <button
                onClick={() => removeIngredient(index)}
                disabled={isLoading}
                className="hover:text-blue-600 focus:outline-none"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dietary Preferences / Restrictions (Optional)
        </label>
        <textarea
          value={preferences}
          onChange={(e) => setPreferences(e.target.value)}
          placeholder="e.g. Gluten-free, Spicy, under 30 mins"
          disabled={isLoading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-black h-24 resize-none"
        />
      </div>

      <button
        onClick={onSubmit}
        disabled={ingredients.length === 0 || isLoading}
        className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin" /> Generating...
          </>
        ) : (
          'Generate Recipe'
        )}
      </button>
    </div>
  );
}
