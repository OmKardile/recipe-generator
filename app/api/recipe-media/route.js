import { NextResponse } from "next/server";
import { resolveDishImage } from "@/lib/dishImage";

/**
 * GET /api/recipe-media?dish=Paneer%20tikka&title=Smoky%20Paneer%20Tikka
 *
 * Resolves a REAL photograph of the canonical dish (Wikipedia → TheMealDB).
 * This route never generates, transforms or synthesizes imagery — it only
 * points at real, published photos of real food. When nothing real is found
 * it answers { image: null } and the client shows its branded placeholder.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const dish = (searchParams.get("dish") || "").trim().slice(0, 80);
  const title = (searchParams.get("title") || "").trim().slice(0, 120);

  if (!dish && !title) {
    return NextResponse.json(
      { error: "Provide a dish or title query parameter." },
      { status: 400 }
    );
  }

  const image = await resolveDishImage(dish, title);

  return NextResponse.json(
    { image },
    {
      headers: {
        // Real photos don't change; let browsers/CDNs cache aggressively.
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    }
  );
}
