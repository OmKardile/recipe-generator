/**
 * Deterministic "kitchen artwork" generator.
 *
 * When neither the AI photographer nor TheMealDB can produce a real photo for
 * a recipe, we still refuse to show a broken image or a random stock picture.
 * Instead we synthesize a tasteful, deterministic SVG poster from the dish
 * title + cuisine: same dish → same art, every time. Pure function, safe on
 * both server and client, zero network.
 */

const PALETTES = [
  { deep: "#102318", mid: "#274E35", glow: "#B9E08E" },
  { deep: "#12241A", mid: "#2F6140", glow: "#9CCB9C" },
  { deep: "#0F1F16", mid: "#1E3D2A", glow: "#70B07C" },
  { deep: "#1E3D2A", mid: "#3B7A4D", glow: "#E0EED6" },
  { deep: "#274E35", mid: "#4F9560", glow: "#F1F7EC" },
  { deep: "#1A2E22", mid: "#5A6B4F", glow: "#B9E08E" },
];

/** Cheap deterministic string hash (FNV-ish). */
export function hashString(input) {
  const text = String(input || "");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function escapeXml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Build the SVG poster markup for a dish.
 * @param {string} title - dish title
 * @param {string} cuisine - cuisine label (optional)
 * @returns {string} standalone SVG document
 */
export function foodArtSvg(title, cuisine) {
  const cleanTitle = String(title || "A Fresh Recipe").slice(0, 60);
  const cleanCuisine = String(cuisine || "").slice(0, 40);
  const hash = hashString(`${cleanTitle.toLowerCase()}|${cleanCuisine.toLowerCase()}`);
  const palette = PALETTES[hash % PALETTES.length];

  // Deterministic garnish dots orbiting the plate.
  const dots = Array.from({ length: 16 }, (_, i) => {
    const seed = hashString(`${cleanTitle}#${i}`);
    const angle = (seed % 360) * (Math.PI / 180);
    const radius = 300 + ((seed >> 9) % 130);
    const cx = 600 + Math.cos(angle) * radius;
    const cy = 470 + Math.sin(angle) * radius * 0.72;
    const r = 3 + ((seed >> 5) % 8);
    const opacity = (0.12 + ((seed >> 11) % 22) / 100).toFixed(2);
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}" fill="${palette.glow}" fill-opacity="${opacity}"/>`;
  }).join("");

  // Three lazy steam curls above the plate.
  const steam = [0, 1, 2]
    .map((i) => {
      const x = 470 + i * 65;
      const delay = i * 0.7;
      return `<path d="M${x} 348 q14 -34 0 -66 q-12 -30 6 -58" fill="none" stroke="${palette.glow}" stroke-opacity="0.45" stroke-width="5" stroke-linecap="round">
        <animate attributeName="stroke-opacity" values="0.12;0.5;0.12" dur="3.4s" begin="${delay}s" repeatCount="indefinite"/>
      </path>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" width="1200" height="900" role="img" aria-label="${escapeXml(cleanTitle)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${palette.deep}"/>
      <stop offset="1" stop-color="${palette.mid}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.55">
      <stop offset="0" stop-color="${palette.glow}" stop-opacity="0.32"/>
      <stop offset="1" stop-color="${palette.glow}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="900" fill="url(#bg)"/>
  <rect width="1200" height="900" fill="url(#glow)"/>
  ${dots}
  <g>
    <circle cx="600" cy="470" r="250" fill="#ffffff" fill-opacity="0.05"/>
    <circle cx="600" cy="470" r="250" fill="none" stroke="${palette.glow}" stroke-opacity="0.4" stroke-width="2"/>
    <circle cx="600" cy="470" r="196" fill="#ffffff" fill-opacity="0.05"/>
    <circle cx="600" cy="470" r="140" fill="${palette.glow}" fill-opacity="0.16"/>
    <circle cx="600" cy="470" r="140" fill="none" stroke="${palette.glow}" stroke-opacity="0.5" stroke-width="1.5"/>
    <circle cx="600" cy="470" r="52" fill="${palette.glow}" fill-opacity="0.3"/>
  </g>
  ${steam}
  <text x="600" y="802" text-anchor="middle" fill="${palette.glow}" fill-opacity="0.95" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="40" letter-spacing="3">${escapeXml(cleanTitle)}</text>
  ${cleanCuisine ? `<text x="600" y="852" text-anchor="middle" fill="#ffffff" fill-opacity="0.55" font-family="Georgia, serif" font-size="22" letter-spacing="10">${escapeXml(cleanCuisine.toUpperCase())}</text>` : ""}
</svg>`;
}

/** Data-URI form ready for <img src> or JSON transport. */
export function foodArtDataUri(title, cuisine) {
  return `data:image/svg+xml,${encodeURIComponent(foodArtSvg(title, cuisine))}`;
}
