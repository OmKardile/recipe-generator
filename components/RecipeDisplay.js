"use client";

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Clock, Users, Flame, ChefHat, Info, Bookmark, Check, Share2, Link2 } from 'lucide-react';
import { useRecipes } from '@/context/RecipeContext';
import ServingAdjuster from './ServingAdjuster';

export default function RecipeDisplay({ recipe, nutrition, ingredients, preferences }) {
  const { saveRecipe } = useRecipes();
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [sharing, setSharing] = useState(false);
  const [servings, setServings] = useState(4);

  if (!recipe) return null;

  const handleSave = () => {
    if (saved) return;
    saveRecipe({ recipe, nutrition, ingredients, preferences, servings });
    setSaved(true);
  };

  const handleShare = async () => {
    if (shared) {
      await navigator.clipboard.writeText(shareUrl);
      return;
    }

    setSharing(true);
    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: recipe.match(/^#\s+(.+)/m)?.[1] || 'Untitled Recipe',
          recipe,
          nutrition,
          ingredients,
          preferences,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        const url = `${window.location.origin}${data.url}`;
        setShareUrl(url);
        setShared(true);
        await navigator.clipboard.writeText(url);
      }
    } catch (error) {
      console.error('Error sharing recipe:', error);
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        {/* Decorative Header */}
        <div className="bg-gradient-to-r from-orange-400 to-red-500 h-3"></div>
        
        <div className="p-8 md:p-10">
          <div className="flex items-center justify-between mb-6">
            <ServingAdjuster servings={servings} onServingsChange={setServings} />
          </div>
          <ReactMarkdown
            components={{
              // Title
              h1: ({ node, ...props }) => (
                <div className="mb-8 border-b pb-6 px-1">
                  <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight" {...props} />
                </div>
              ),
              // Section Headers
              h2: ({ node, ...props }) => {
                const text = props.children?.toString().toLowerCase() || '';
                let Icon = ChefHat;
                if (text.includes('ingredient')) Icon = Users; // Placeholder logic, usually mapped better
                if (text.includes('instruction') || text.includes('step')) Icon = Flame;
                if (text.includes('time') || text.includes('serving')) Icon = Clock;
                if (text.includes('nutrition')) Icon = Info;

                return (
                  <div className="flex items-center gap-3 mt-10 mb-4 px-1">
                    <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                      <Icon size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800" {...props} />
                  </div>
                );
              },
              // Paragraphs
              p: ({ node, ...props }) => (
                <p className="text-gray-600 leading-relaxed mb-4 text-lg px-1" {...props} />
              ),
              // Lists
              ul: ({ node, ...props }) => (
                <ul className="space-y-3 mb-6 bg-gray-50 p-6 rounded-xl border border-gray-100" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="space-y-4 mb-6 pl-2" {...props} />
              ),
              // List Items
              li: ({ node, ...props }) => {
                // Check if parent is ul (ingredients) or ol (instructions)
                const isOrdered = node.position?.start.column === 1; // logical check or parent ref
                
                return (
                  <li className="flex gap-3 text-gray-700 text-lg leading-relaxed group">
                     {/* Custom Bullet/Number styling is handled by container mostly, but we can add icons here if we parse parent */}
                     <span className="mt-1.5 h-2 w-2 rounded-full bg-orange-400 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                     <span>{props.children}</span>
                  </li>
                );
              },
              // Strong/Bold
              strong: ({ node, ...props }) => (
                <strong className="font-bold text-gray-900" {...props} />
              ),
            }}
          >
            {recipe}
          </ReactMarkdown>
        </div>

        {nutrition && (
          <div className="px-8 md:px-10 pb-6">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
              <div className="flex items-center gap-2 mb-4">
                <Flame className="text-green-600" size={20} />
                <h3 className="text-lg font-bold text-green-800">Nutrition per Serving</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">{nutrition.calories}</div>
                  <div className="text-sm text-green-600">Calories</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">{nutrition.protein}g</div>
                  <div className="text-sm text-green-600">Protein</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">{nutrition.carbs}g</div>
                  <div className="text-sm text-green-600">Carbs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">{nutrition.fat}g</div>
                  <div className="text-sm text-green-600">Fat</div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Footer info/decoration */}
        <div className="bg-gray-50 p-4 flex items-center justify-between border-t">
          <span className="text-sm text-gray-500">Generated by Gemini AI</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              disabled={sharing}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                shared
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {shared ? (
                <>
                  <Link2 size={16} />
                  Link Copied!
                </>
              ) : (
                <>
                  <Share2 size={16} />
                  {sharing ? 'Sharing...' : 'Share'}
                </>
              )}
            </button>
            <button
              onClick={handleSave}
              disabled={saved}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                saved
                  ? 'bg-green-100 text-green-700'
                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
              }`}
            >
              {saved ? (
                <>
                  <Check size={16} />
                  Saved
                </>
              ) : (
                <>
                  <Bookmark size={16} />
                  Save Recipe
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
