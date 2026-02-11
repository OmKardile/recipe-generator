import { NextResponse } from 'next/server';
import model from '@/lib/gemini';

export async function POST(request) {
  try {
    if (!model) {
      throw new Error("Missing GEMINI_API_KEY environment variable");
    }

    const { ingredients, preferences } = await request.json();

    if (!ingredients || ingredients.length === 0) {
      return NextResponse.json(
        { error: 'Ingredients are required' },
        { status: 400 }
      );
    }

    const prompt = `
      Create a detailed recipe using the following ingredients: ${ingredients.join(', ')}.
      Preferences: ${preferences || 'None'}.
      
      Format the response in Markdown with the following sections:
      - Title
      - Description
      - Ingredients List (with measurements)
      - Instructions (step-by-step)
      - Cooking Time & Servings
      - Nutritional Info (estimated)
      
      Make it creative and delicious!
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const recipe = response.text();

    return NextResponse.json({ recipe });
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
