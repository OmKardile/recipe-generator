import { NextResponse } from 'next/server';
import model from '@/lib/gemini';

export async function POST(request) {
  try {
    if (!model) {
      throw new Error("Missing GEMINI_API_KEY environment variable");
    }

    const { ingredients, preferences, includeNutrition } = await request.json();

    if (!ingredients || ingredients.length === 0) {
      return NextResponse.json(
        { error: 'Ingredients are required' },
        { status: 400 }
      );
    }

    const nutritionSection = includeNutrition
      ? `- Nutritional Info (estimated per serving: calories, protein in grams, carbs in grams, fat in grams)`
      : '';

    const prompt = `
      You are an expert Indian chef. Generate 3 DIFFERENT recipe options using the available ingredients.
      
      Available Ingredients: ${ingredients.join(', ')}
      Preferences: ${preferences || 'None'}
      
      IMPORTANT: Prioritize Indian cuisine. Include classic Indian dishes like Biryani, Curry, Dal, Paneer dishes, Samosa, etc. when ingredients allow.
      
      Return EXACTLY 3 recipes, each separated by ===RECIPE_SEPARATOR===
      
      For EACH recipe, format in Markdown with these sections:
      ## [Recipe Title]
      [Brief 1-2 line description]
      
      ### Ingredients
      - [ingredient with measurement]
      
      ### Instructions
      1. [Step by step instructions]
      
      ### Time & Servings
      - Prep: [time]
      - Cook: [time]  
      - Servings: [number]
      ${includeNutrition ? '- Calories: [number] per serving' : ''}
      
      Make each recipe unique - one could be a biryani, another a curry, another a dry dish. Be creative and authentic!
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Split recipes by separator
    const recipeTexts = text.split(/===RECIPE_SEPARATOR===/).map(r => r.trim()).filter(r => r.length > 0);

    // If we got fewer than 3, try splitting by ## headers
    let recipes = recipeTexts;
    if (recipes.length < 3) {
      recipes = text.split(/(?=^## )/m).map(r => r.trim()).filter(r => r.length > 0 && r.startsWith('##'));
    }

    // Take first 3 recipes
    recipes = recipes.slice(0, 3);

    // Parse each recipe
    const parsedRecipes = recipes.map((recipeText, index) => {
      let nutrition = null;
      let cleanRecipe = recipeText;

      if (includeNutrition) {
        const calMatch = recipeText.match(/(?:Calories|calories)[:\s]*(\d+)/);
        if (calMatch) {
          nutrition = {
            calories: parseInt(calMatch[1]),
            protein: 0,
            carbs: 0,
            fat: 0,
          };
          // Try to extract other macros if present
          const proteinMatch = recipeText.match(/Protein[:\s]*(\d+)/);
          const carbsMatch = recipeText.match(/Carbs[:\s]*(\d+)/);
          const fatMatch = recipeText.match(/Fat[:\s]*(\d+)/);
          if (proteinMatch) nutrition.protein = parseInt(proteinMatch[1]);
          if (carbsMatch) nutrition.carbs = parseInt(carbsMatch[1]);
          if (fatMatch) nutrition.fat = parseInt(fatMatch[1]);
        }
      }

      // Extract title from ## header
      const titleMatch = recipeText.match(/^##\s+(.+)/m);
      const title = titleMatch ? titleMatch[1].replace(/[\[\]]/g, '').trim() : `Recipe Option ${index + 1}`;

      return {
        id: index,
        title,
        recipe: cleanRecipe,
        nutrition,
      };
    });

    return NextResponse.json({ recipes: parsedRecipes });
  } catch (error) {
    console.error('Error generating recipe:', error);
    
    if (error.status === 429 || error.message?.includes('429')) {
      return NextResponse.json(
        { error: 'Gemini API Quota Exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate recipe' },
      { status: 500 }
    );
  }
}
