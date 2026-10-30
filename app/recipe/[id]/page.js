import ReactMarkdown from 'react-markdown';
import {
  Clock, Users, Flame, Info, ArrowLeft, MapPin, Gauge, Carrot, Activity,
} from 'lucide-react';
import Link from 'next/link';
import { getRecipe } from '@/lib/sharedStore';
import RecipeMedia from '@/components/RecipeMedia';

/**
 * Reads the in-memory shared store DIRECTLY on the server.
 * The old version HTTP-fetched `http://localhost:3000/api/recipes/[id]`,
 * which only ever worked on a local dev machine and broke on any real deploy
 * (and made generateMetadata fire a pointless self-request per render).
 */

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const recipe = getRecipe(id);
  if (!recipe) {
    return { title: 'Recipe Not Found — AI Recipe Generator' };
  }
  return {
    title: `${recipe.title} | AI Recipe Generator`,
    description:
      recipe.structured?.description ||
      `Check out this shared recipe: ${recipe.title}`,
  };
}

export default async function SharedRecipePage({ params }) {
  const { id } = await params;
  const recipe = getRecipe(id);

  if (!recipe) {
    return (
      <main className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8 transition-colors">
        <div className="max-w-4xl mx-auto text-center py-20">
          <h1 className="font-display text-4xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">
            Recipe Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            This share link has expired (shared recipes are stored in memory and reset when the
            server restarts).
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-medium"
          >
            <ArrowLeft size={20} />
            Back to Recipe Generator
          </Link>
        </div>
      </main>
    );
  }

  const structured = recipe.structured;
  const media = {
    youtubeVideoId: recipe.youtubeVideoId,
    youtubeChannel: recipe.youtubeChannel,
    videoVerified: recipe.videoVerified,
    canonicalDish: recipe.canonicalDish,
    title: recipe.title,
  };

  return (
    <main className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-medium mb-8"
        >
          <ArrowLeft size={20} />
          Back to Recipe Generator
        </Link>

        <div className="bg-white/85 dark:bg-gray-800/85 backdrop-blur-md rounded-3xl shadow-2xl shadow-emerald-900/10 overflow-hidden border border-emerald-900/10 dark:border-gray-700/80 transition-colors">
          <div className="bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 h-2.5"></div>

          <div className="p-8 md:p-10">
            {media.youtubeVideoId && (
              <div className="mb-8">
                <RecipeMedia recipe={media} variant="hero" />
              </div>
            )}

            {structured && (
              <div className="flex flex-wrap gap-2 mb-6">
                {structured.cuisine && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    <MapPin size={12} /> {structured.cuisine}
                  </span>
                )}
                {structured.difficulty && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                    <Gauge size={12} /> {structured.difficulty}
                  </span>
                )}
                {structured.totalTimeMinutes != null && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                    <Clock size={12} /> {structured.totalTimeMinutes} min
                  </span>
                )}
                {structured.servings != null && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300">
                    <Users size={12} /> {structured.servings} servings
                  </span>
                )}
              </div>
            )}

            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => (
                  <h1
                    className="font-display text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-6 tracking-tight border-b border-emerald-100 dark:border-gray-700 pb-4"
                    {...props}
                  />
                ),
                h2: ({ node, ...props }) => {
                  const text = String(props.children ?? '').toLowerCase();
                  let Icon = Carrot;
                  if (text.includes('instruction') || text.includes('step')) Icon = Flame;
                  if (text.includes('time') || text.includes('serving')) Icon = Clock;
                  if (text.includes('nutrition')) Icon = Activity;
                  return (
                    <div className="flex items-center gap-3 mt-8 mb-4 px-1">
                      <div className="bg-emerald-100 dark:bg-emerald-900/40 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
                        <Icon size={22} />
                      </div>
                      <h2
                        className="text-xl font-bold text-gray-800 dark:text-gray-100"
                        {...props}
                      />
                    </div>
                  );
                },
                p: ({ node, ...props }) => (
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4 px-1" {...props} />
                ),
                ul: ({ node, ...props }) => (
                  <ul
                    className="space-y-3 mb-6 bg-emerald-50/60 dark:bg-gray-900/60 p-5 rounded-xl border border-emerald-100 dark:border-gray-700 list-none"
                    {...props}
                  />
                ),
                ol: ({ node, ...props }) => (
                  <ol
                    className="list-decimal marker:text-emerald-600 dark:marker:text-emerald-400 marker:font-bold space-y-3 mb-6 pl-6"
                    {...props}
                  />
                ),
                li: ({ node, ...props }) => (
                  <li className="text-gray-700 dark:text-gray-200 leading-relaxed" {...props} />
                ),
                strong: ({ node, ...props }) => (
                  <strong className="font-bold text-gray-900 dark:text-white" {...props} />
                ),
              }}
            >
              {recipe.recipe}
            </ReactMarkdown>
          </div>

          {recipe.nutrition && (
            <div className="px-8 md:px-10 pb-6">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-xl p-6 border border-emerald-100 dark:border-emerald-800">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="text-emerald-600 dark:text-emerald-400" size={20} />
                  <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-300">
                    Nutrition per Serving
                  </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    ['Calories', recipe.nutrition.calories, ''],
                    ['Protein', recipe.nutrition.protein, 'g'],
                    ['Carbs', recipe.nutrition.carbs, 'g'],
                    ['Fat', recipe.nutrition.fat, 'g'],
                  ].map(([label, value, unit]) => (
                    <div key={label} className="text-center">
                      <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                        {value}
                        {unit}
                      </div>
                      <div className="text-sm text-emerald-600 dark:text-emerald-500">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="bg-emerald-50/50 dark:bg-gray-900/60 p-4 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-emerald-100 dark:border-gray-700">
            Shared via AI Recipe Generator · Photo from a real cooking video
          </div>
        </div>
      </div>
    </main>
  );
}
