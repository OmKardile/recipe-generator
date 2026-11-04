import ReactMarkdown from "react-markdown";
import { ArrowLeft, PlayCircle, Youtube } from "lucide-react";
import Link from "next/link";
import { getRecipe } from "@/lib/sharedStore";
import MediaImage from "@/components/MediaImage";
import { youtubeSearchUrl, youtubeThumbnailSources } from "@/lib/video";

/**
 * Reads the in-memory shared store DIRECTLY on the server.
 * The old version HTTP-fetched `http://localhost:3000/api/recipes/[id]`,
 * which only ever worked on a local dev machine and broke on any real deploy
 * (and made generateMetadata fire a pointless self-request per render).
 */

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const recipe = getRecipe(id);
  if (!recipe) {
    return { title: "Recipe Not Found — Indian Recipe Generator" };
  }
  return {
    title: `${recipe.title} | Indian Recipe Generator`,
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
      <main className="stage">
        <div className="tier-panel empty">
          <p className="empty__title">Recipe not found</p>
          <p>
            This share link has expired (shared recipes are stored in memory and reset when
            the server restarts).
          </p>
          <Link href="/" className="btn" data-no-transition>
            <ArrowLeft size={14} />
            Back to the generator
          </Link>
        </div>
      </main>
    );
  }

  const structured = recipe.structured;

  return (
    <main className="stage">
      <div className="tier-panel">
        <Link href="/" className="back-link">
          <ArrowLeft size={13} />
          Back to the generator
        </Link>

        <article className="dish">
          {/* REAL media captured at share time — photo of the real dish + verified video */}
          {(recipe.media?.url || recipe.youtubeUrl) && (
            <div className="media-slot">
              <div className="dish__photo">
                <MediaImage
                  sources={[
                    ...(recipe.media?.url ? [recipe.media.url] : []),
                    ...youtubeThumbnailSources(
                      (recipe.youtubeUrl || "").match(/v=([A-Za-z0-9_-]{11})/)?.[1]
                    ),
                  ]}
                  alt={`Real photo of ${recipe.dishName || recipe.title}`}
                  eager
                />
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "0.9em",
                  marginTop: "0.9em",
                }}
              >
                <a
                  href={recipe.youtubeUrl || youtubeSearchUrl(recipe.dishName || recipe.title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--ghost"
                >
                  {recipe.youtubeUrl ? <PlayCircle size={15} /> : <Youtube size={15} />}
                  {recipe.youtubeUrl
                    ? "Watch this dish on YouTube"
                    : "Find video recipes on YouTube"}
                </a>
                {recipe.media?.credit && (
                  <span className="mono" style={{ textTransform: "none" }}>
                    {recipe.media.credit}
                  </span>
                )}
              </div>
            </div>
          )}

          <header className="dish__head">
            <h1 className="dish__title">{recipe.title}</h1>
            {structured && (
              <div className="dish__meta">
                {structured.cuisine && <span>{structured.cuisine}</span>}
                {structured.difficulty && <span>{structured.difficulty}</span>}
                {structured.totalTimeMinutes != null && (
                  <span>{structured.totalTimeMinutes} min</span>
                )}
                {structured.servings != null && <span>{structured.servings} servings</span>}
              </div>
            )}
          </header>

          <div className="md">
            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => <h1 {...props} />,
                h2: ({ node, ...props }) => <h2 {...props} />,
                p: ({ node, ...props }) => <p {...props} />,
                ul: ({ node, ...props }) => <ul {...props} />,
                ol: ({ node, ...props }) => <ol {...props} />,
                li: ({ node, ...props }) => <li {...props} />,
                strong: ({ node, ...props }) => <strong {...props} />,
              }}
            >
              {recipe.recipe}
            </ReactMarkdown>
          </div>

          {recipe.nutrition && (
            <div className="facts">
              {[
                ["Calories", recipe.nutrition.calories, ""],
                ["Protein", recipe.nutrition.protein, "g"],
                ["Carbs", recipe.nutrition.carbs, "g"],
                ["Fat", recipe.nutrition.fat, "g"],
              ].map(([label, value, unit]) => (
                <div className="fact" key={label}>
                  <span className="fact__value">
                    {value}
                    {unit && <small> {unit}</small>}
                  </span>
                  <span className="fact__label">{label}</span>
                </div>
              ))}
            </div>
          )}

          <p className="mono" style={{ color: "var(--c-muted)" }}>
            Shared via Indian Recipe Generator
          </p>
        </article>
      </div>
    </main>
  );
}
