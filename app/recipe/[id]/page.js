import ReactMarkdown from "react-markdown";
import {
  PiClockFill,
  PiUsersThreeFill,
  PiFireFill,
  PiForkKnifeFill,
  PiBasketFill,
  PiInfoFill,
  PiArrowLeftFill,
  PiMapPinFill,
  PiGaugeFill,
} from "react-icons/pi";
import Link from "next/link";
import { getRecipe } from "@/lib/sharedStore";
import { foodArtDataUri } from "@/lib/foodArt";

/**
 * Reads the in-memory shared store DIRECTLY on the server — no self-fetch to
 * localhost (which only ever worked on a dev machine). Shows a deterministic
 * artwork hero so shared recipes always look intentional, never broken.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const recipe = getRecipe(id);
  if (!recipe) {
    return { title: "Recipe Not Found — Rasoi · AI Recipe Studio" };
  }
  return {
    title: `${recipe.title} | Rasoi · AI Recipe Studio`,
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
      <main className="min-h-screen bg-paper px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-2xl py-20 text-center">
          <h1 className="mb-4 font-display text-4xl font-semibold">Recipe not found</h1>
          <p className="mx-auto mb-8 max-w-md text-body">
            This share link has expired (shared recipes are stored in memory and
            reset when the server restarts).
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-herb-600 to-herb-500 px-6 py-3 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-[1.03]"
          >
            <PiArrowLeftFill size={15} aria-hidden />
            Back to the studio
          </Link>
        </div>
      </main>
    );
  }

  const structured = recipe.structured;
  const cuisine = structured?.cuisine || recipe.cuisine || "";

  return (
    <main className="min-h-screen bg-paper px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-herb-700 transition-colors hover:text-herb-600 dark:text-herb-300"
        >
          <PiArrowLeftFill size={14} aria-hidden />
          Back to the studio
        </Link>

        <article className="overflow-hidden rounded-3xl border border-line bg-elev shadow-card">
          {/* Deterministic artwork hero */}
          <div className="relative aspect-[16/7] w-full overflow-hidden" aria-hidden>
            {/* Deterministic SVG data-URI artwork — plain img is the right loader for it. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={foodArtDataUri(recipe.title, cuisine)}
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-herb-950/60 to-transparent" />
          </div>

          <div className="p-6 md:p-10">
            {structured && (
              <div className="mb-6 flex flex-wrap gap-2">
                {structured.cuisine && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-herb-200 bg-herb-100/70 px-3 py-1 text-xs font-semibold text-herb-700 dark:border-herb-800 dark:bg-herb-900/60 dark:text-herb-300">
                    <PiMapPinFill size={11} aria-hidden /> {structured.cuisine}
                  </span>
                )}
                {structured.difficulty && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-line bg-elev2 px-3 py-1 text-xs font-semibold text-body dark:bg-herb-950/60">
                    <PiGaugeFill size={11} aria-hidden /> {structured.difficulty}
                  </span>
                )}
                {structured.totalTimeMinutes != null && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-line bg-elev2 px-3 py-1 text-xs font-semibold text-body dark:bg-herb-950/60">
                    <PiClockFill size={11} aria-hidden /> {structured.totalTimeMinutes} min
                  </span>
                )}
                {structured.servings != null && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-line bg-elev2 px-3 py-1 text-xs font-semibold text-body dark:bg-herb-950/60">
                    <PiUsersThreeFill size={11} aria-hidden /> {structured.servings} servings
                  </span>
                )}
              </div>
            )}

            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => (
                  <h1 className="mb-6 border-b border-line pb-4 font-display text-3xl font-semibold tracking-tight md:text-4xl" {...props} />
                ),
                h2: ({ node, ...props }) => {
                  const text = String(props.children ?? "").toLowerCase();
                  let Icon = PiForkKnifeFill;
                  if (text.includes("ingredient")) Icon = PiBasketFill;
                  if (text.includes("instruction") || text.includes("step")) Icon = PiFireFill;
                  if (text.includes("time") || text.includes("serving")) Icon = PiClockFill;
                  if (text.includes("nutrition")) Icon = PiInfoFill;
                  return (
                    <div className="mb-4 mt-8 flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-herb-100 text-herb-600 dark:bg-herb-900/70 dark:text-herb-300">
                        <Icon size={18} aria-hidden />
                      </span>
                      <h2 className="font-display text-xl font-semibold" {...props} />
                    </div>
                  );
                },
                p: ({ node, ...props }) => (
                  <p className="mb-4 leading-relaxed text-body" {...props} />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="mb-6 list-none space-y-1 rounded-2xl border border-line bg-elev2/60 p-3 dark:bg-herb-950/40" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="mb-6 list-decimal space-y-3 pl-6 marker:font-bold marker:text-herb-600 dark:marker:text-herb-400" {...props} />
                ),
                li: ({ node, ...props }) => (
                  <li className="leading-relaxed text-body" {...props} />
                ),
                strong: ({ node, ...props }) => (
                  <strong className="font-semibold text-ink" {...props} />
                ),
              }}
            >
              {recipe.recipe}
            </ReactMarkdown>
          </div>

          {recipe.nutrition && (
            <div className="px-6 pb-6 md:px-10">
              <div className="rounded-2xl border border-herb-200/70 bg-gradient-to-br from-herb-50 to-herb-100/50 p-6 dark:border-herb-800 dark:from-herb-900/40 dark:to-herb-950/60">
                <div className="mb-4 flex items-center gap-2 text-herb-700 dark:text-herb-300">
                  <PiFireFill size={16} aria-hidden />
                  <h3 className="text-sm font-bold uppercase tracking-[0.16em]">
                    Nutrition · per serving
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
                  {[
                    ["Calories", recipe.nutrition.calories, ""],
                    ["Protein", recipe.nutrition.protein, "g"],
                    ["Carbs", recipe.nutrition.carbs, "g"],
                    ["Fat", recipe.nutrition.fat, "g"],
                  ].map(([label, value, unit]) => (
                    <div key={label}>
                      <div className="font-display text-2xl font-semibold text-herb-700 dark:text-herb-300">
                        {value}
                        {unit}
                      </div>
                      <div className="text-[11px] uppercase tracking-[0.12em] text-body">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-line bg-elev2/50 p-4 text-center text-xs uppercase tracking-[0.22em] text-body">
            Shared via Rasoi · AI Recipe Studio
          </div>
        </article>
      </div>
    </main>
  );
}
