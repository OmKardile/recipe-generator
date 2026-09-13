import ReactMarkdown from 'react-markdown';
import { Clock, Users, Flame, ChefHat, Info, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

async function getRecipe(id) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/recipes/${id}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) {
    return { title: 'Recipe Not Found' };
  }
  return {
    title: `${recipe.title} | AI Recipe Generator`,
    description: `Check out this recipe: ${recipe.title}`,
  };
}

export default async function SharedRecipePage({ params }) {
  const { id } = await params;
  const recipe = await getRecipe(id);

  if (!recipe) {
    return (
      <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center py-20">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Recipe Not Found</h1>
          <p className="text-gray-600 mb-8">This recipe may have expired or been removed.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <ArrowLeft size={20} />
            Back to Recipe Generator
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-8"
        >
          <ArrowLeft size={20} />
          Back to Recipe Generator
        </Link>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-orange-400 to-red-500 h-3"></div>
          
          <div className="p-8 md:p-10">
            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => (
                  <div className="mb-8 border-b pb-6 px-1">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight" {...props} />
                  </div>
                ),
                h2: ({ node, ...props }) => {
                  const text = props.children?.toString().toLowerCase() || '';
                  let Icon = ChefHat;
                  if (text.includes('ingredient')) Icon = Users;
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
                p: ({ node, ...props }) => (
                  <p className="text-gray-600 leading-relaxed mb-4 text-lg px-1" {...props} />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="space-y-3 mb-6 bg-gray-50 p-6 rounded-xl border border-gray-100" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="space-y-4 mb-6 pl-2" {...props} />
                ),
                li: ({ node, ...props }) => (
                  <li className="flex gap-3 text-gray-700 text-lg leading-relaxed group">
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-orange-400 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                    <span>{props.children}</span>
                  </li>
                ),
                strong: ({ node, ...props }) => (
                  <strong className="font-bold text-gray-900" {...props} />
                ),
              }}
            >
              {recipe.recipe}
            </ReactMarkdown>
          </div>

          {recipe.nutrition && (
            <div className="px-8 md:px-10 pb-6">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                <div className="flex items-center gap-2 mb-4">
                  <Flame className="text-green-600" size={20} />
                  <h3 className="text-lg font-bold text-green-800">Nutrition per Serving</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-700">{recipe.nutrition.calories}</div>
                    <div className="text-sm text-green-600">Calories</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-700">{recipe.nutrition.protein}g</div>
                    <div className="text-sm text-green-600">Protein</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-700">{recipe.nutrition.carbs}g</div>
                    <div className="text-sm text-green-600">Carbs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-700">{recipe.nutrition.fat}g</div>
                    <div className="text-sm text-green-600">Fat</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-50 p-4 text-center text-sm text-gray-500 border-t">
            Shared via AI Recipe Generator
          </div>
        </div>
      </div>
    </main>
  );
}
