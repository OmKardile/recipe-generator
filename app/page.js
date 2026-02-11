"use client";

import { useState } from 'react';
import IngredientInput from '@/components/IngredientInput';
import RecipeDisplay from '@/components/RecipeDisplay';
import { ChefHat } from 'lucide-react';

export default function Home() {
  const [ingredients, setIngredients] = useState([]);
  const [preferences, setPreferences] = useState('');
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateRecipe = async () => {
    setLoading(true);
    setError(null);
    setRecipe(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ingredients, preferences }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate recipe');
      }

      setRecipe(data.recipe);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <ChefHat className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl mb-2">
            AI Recipe Generator
          </h1>
          <p className="text-lg text-gray-600">
            Tell us what you have, and we'll cook up something amazing!
          </p>
        </div>

        <IngredientInput
          ingredients={ingredients}
          setIngredients={setIngredients}
          preferences={preferences}
          setPreferences={setPreferences}
          onSubmit={generateRecipe}
          isLoading={loading}
        />

        {error && (
          <div className="mt-8 p-4 bg-red-100 text-red-700 rounded-lg text-center max-w-md mx-auto border border-red-200">
            {error}
          </div>
        )}

        <RecipeDisplay recipe={recipe} />
      </div>
    </main>
  );
}
