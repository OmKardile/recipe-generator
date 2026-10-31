import ReactMarkdown from 'react-markdown';
import { Clock, Users, Flame, ChefHat, Info, ArrowLeft, MapPin, Gauge, Carrot, CookingPot, Lightbulb, Activity, PlayCircle, Youtube } from 'lucide-react';
import Link from 'next/link';
import { getRecipe } from '@/lib/sharedStore';
import MediaImage from '@/components/MediaImage';
import { youtubeSearchUrl, youtubeThumbnailSources } from '@/lib/video';

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
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
        <div className="max-w-4xl mx-auto text-center py-20">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Recipe Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            This share link has expired (shared recipes are stored in memory and reset when the
            server restarts).
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium"
          >
            <ArrowLeft size={20} />
            Back to Recipe Generator
          </Link>
        </div>
      </main>
    );
  }

  const structured = recipe.structured;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium mb-8"
        >
          <ArrowLeft size={20} />
          Back to Recipe Generator
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700 transition-colors">
          <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 h-3"></div>

          <div className="p-8 md:p-10">
            {/* REAL media captured at share time — photo of the real dish + verified video */}
            {(recipe.media?.url || recipe.youtubeUrl) && (
              <div className="mb-8">
                <div className="overflow-hidden rounded-2xl shadow-lg shadow-emerald-900/10 ring-1 ring-black/5 dark:ring-white/10">
                  <MediaImage
                    sources={[
                      ...(recipe.media?.url ? [recipe.media.url] : []),
                      ...youtubeThumbnailSources(
                        (recipe.youtubeUrl || '').match(/v=([A-Za-z0-9_-]{11})/)?.[1]
                      ),
                    ]}
                    alt={`Real photo of ${recipe.dishName || recipe.title}`}
                    rounded="rounded-none"
                    eager
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <a
                    href={recipe.youtubeUrl || youtubeSearchUrl(recipe.dishName || recipe.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={
                      recipe.youtubeUrl
                        ? 'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors'
                        : 'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors'
                    }
                  >
                    {recipe.youtubeUrl ? <PlayCircle size={16} /> : <Youtube size={16} />}
                    {recipe.youtubeUrl ? 'Watch this dish on YouTube' : 'Find video recipes on YouTube'}
                  </a>
                  {recipe.media?.credit && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">{recipe.media.credit}</span>
                  )}
                </div>
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
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                    <Users size={12} /> {structured.servings} servings
                  </span>
                )}
              </div>
            )}

            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => (
                  <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight border-b border-gray-100 dark:border-gray-700 pb-4" {...props} />
                ),
                h2: ({ node, ...props }) => {
                  const text = String(props.children ?? '').toLowerCase();
                  let Icon = ChefHat;
                  if (text.includes('ingredient')) Icon = Carrot;
                  if (text.includes('instruction') || text.includes('step')) Icon = CookingPot;
                  if (text.includes('time') || text.includes('serving')) Icon = Clock;
                  if (text.includes('nutrition')) Icon = Activity;
                  if (text.includes('tip')) Icon = Lightbulb;
                  return (
                    <div className="flex items-center gap-3 mt-8 mb-4 px-1">
                      <div className="bg-emerald-100 dark:bg-emerald-900/40 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
                        <Icon size={22} />
                      </div>
                      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100" {...props} />
                    </div>
                  );
                },
                p: ({ node, ...props }) => (
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4 px-1" {...props} />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="space-y-3 mb-6 bg-gray-50 dark:bg-gray-900/60 p-5 rounded-xl border border-gray-100 dark:border-gray-700 list-none" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal marker:text-emerald-600 dark:marker:text-emerald-400 marker:font-bold space-y-3 mb-6 pl-6" {...props} />
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
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl p-6 border border-green-100 dark:border-green-800">
                <div className="flex items-center gap-2 mb-4">
                  <Flame className="text-green-600 dark:text-green-400" size={20} />
                  <h3 className="text-lg font-bold text-green-800 dark:text-green-300">
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
                      <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                        {value}
                        {unit}
                      </div>
                      <div className="text-sm text-green-600 dark:text-green-500">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-50 dark:bg-gray-900/60 p-4 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
            Shared via AI Recipe Generator
          </div>
        </div>
      </div>
    </main>
  );
}
