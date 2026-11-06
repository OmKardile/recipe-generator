import ReactMarkdown from "react-markdown";
import { ArrowLeft, Play, Youtube } from "lucide-react";
import Link from "next/link";
import { getRecipe } from "@/lib/sharedStore";
import MediaImage from "@/components/MediaImage";
import { youtubeSearchUrl, youtubeThumbnailSources, youtubeWatchUrl } from "@/lib/video";

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
  const videoId = (recipe.youtubeUrl || "").match(/v=([A-Za-z0-9_-]{11})/)?.[1];
  const watchUrl = youtubeWatchUrl(videoId);
  const mediaUrl = watchUrl || youtubeSearchUrl(recipe.dishName || recipe.title);

  return (
    <main className="stage">
      <div className="tier-panel">
        <Link href="/" className="back-link">
          <ArrowLeft size={13} />
          Back to the generator
        </Link>

        <article className="dish">
          <header className="dish__head">
            <h1 className="dish__title">{recipe.title}</h1>
            {structured && (
              <div className="dish__meta">
                {structured.cuisine && (
                  <span className="meta-chip">{structured.cuisine}</span>
                )}
                {structured.difficulty && (
                  <span className="meta-chip">{structured.difficulty}</span>
                )}
                {structured.totalTimeMinutes != null && (
                  <span className="meta-chip">{structured.totalTimeMinutes} min</span>
                )}
                {structured.servings != null && (
                  <span className="meta-chip">{structured.servings} servings</span>
                )}
              </div>
            )}
          </header>

          {/* REAL media captured at share time — kept out of the eye's main
              line as a slim YouTube-first row, mirroring the generator page */}
          {(recipe.media?.url || recipe.youtubeUrl) && (
            <div className="media-row">
              <a
                href={mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="media-row__thumb"
                aria-label={`Watch a real video of ${recipe.dishName || recipe.title} on YouTube`}
              >
                <MediaImage
                  sources={[
                    ...(recipe.media?.url ? [recipe.media.url] : []),
                    ...youtubeThumbnailSources(videoId),
                  ]}
                  alt={`Real photo of ${recipe.dishName || recipe.title}`}
                  variant="thumb"
                  eager
                />
                <span className="media-row__play" aria-hidden="true">
                  <Play size={13} fill="currentColor" />
                </span>
              </a>
              <div className="media-row__body">
                <a
                  href={mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--yt"
                >
                  {watchUrl ? <Play size={15} fill="currentColor" /> : <Youtube size={15} />}
                  {watchUrl ? "Watch this dish on YouTube" : "Find video recipes on YouTube"}
                </a>
                {recipe.media?.credit && (
                  <span className="media-row__credit mono">Photo: {recipe.media.credit}</span>
                )}
              </div>
            </div>
          )}

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
            <section>
              <h2 className="dish__section-title">Nutrition per serving</h2>
              <table className="nutrition">
                <thead>
                  <tr>
                    <th scope="col">Nutrient</th>
                    <th scope="col">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="nutrition__cal">
                    <th scope="row">Calories</th>
                    <td>
                      {recipe.nutrition.calories}
                      <small> kcal</small>
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Protein</th>
                    <td>
                      {recipe.nutrition.protein}
                      <small> g</small>
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Carbs</th>
                    <td>
                      {recipe.nutrition.carbs}
                      <small> g</small>
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Fat</th>
                    <td>
                      {recipe.nutrition.fat}
                      <small> g</small>
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>
          )}

          <p className="mono" style={{ color: "var(--c-muted)" }}>
            Shared via Indian Recipe Generator
          </p>
        </article>
      </div>
    </main>
  );
}
