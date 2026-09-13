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

    const jsonInstruction = includeNutrition
      ? `\n\nAfter the recipe, include a JSON block on a new line like this (no other text around it):
\`\`\`json
{"nutrition":{"calories":0,"protein":0,"carbs":0,"fat":0}}
\`\`\``
      : '';

    const prompt = `
      Create a detailed recipe using the following ingredients: ${ingredients.join(', ')}.
      Preferences: ${preferences || 'None'}.
      
      Format the response in Markdown with the following sections:
      - Title
      - Description
      - Ingredients List (with measurements)
      - Instructions (step-by-step)
      - Cooking Time & Servings
      ${nutritionSection}
      ${jsonInstruction}
      Make it creative and delicious!
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    let recipe = text;
    let nutrition = null;

    if (includeNutrition) {
      const jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          nutrition = parsed.nutrition || parsed;
          recipe = text.replace(/```json\s*\{[\s\S]*?\}\s*```/, '').trim();
        } catch (e) {
          // If JSON parsing fails, keep full text as recipe
        }
      }
    }

    return NextResponse.json({ recipe, nutrition });
  } catch (error) {
    console.error('Error generating recipe:', error);
    
    // Check for Gemini 429 error (quota exceeded)
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
