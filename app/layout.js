// Self-hosted variable fonts (app/fonts, latin subset). Deliberately NOT
// next/font/google: Vercel's restored Turbopack build cache chokes on the
// generated google-font module ("next/font/google queries have exactly one
// entry") whenever the font set changes — see deploy log for 7fedef7.
// next/font/local is cache-proof and needs no build-time network access.
import localFont from "next/font/local";
import "./globals.css";
import { RecipeProvider } from "@/context/RecipeContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Engine from "@/components/Engine";

const display = localFont({
  src: "./fonts/baloo-2-var.woff2",
  variable: "--font-display",
  weight: "400 800",
  style: "normal",
  display: "swap",
});

const body = localFont({
  src: "./fonts/nunito-var.woff2",
  variable: "--font-body",
  weight: "400 800",
  style: "normal",
  display: "swap",
});

const mono = localFont({
  src: "./fonts/jetbrains-mono-var.woff2",
  variable: "--font-mono",
  weight: "400 500",
  style: "normal",
  display: "swap",
});

/* Handwritten margin notes — the human scribbles on the recipe card. */
const hand = localFont({
  src: "./fonts/caveat-var.woff2",
  variable: "--font-hand",
  weight: "400 700",
  style: "normal",
  display: "swap",
});

export const metadata = {
  title: "Indian Recipe Generator — Real dishes from your kitchen",
  description:
    "Enter the ingredients in your kitchen and get three chef-quality Indian recipes — real established dishes with real photographs, verified YouTube videos, smart serving scaling, meal planning, shopping lists and a cooking timer.",
  keywords: [
    "recipe generator",
    "AI recipes",
    "Indian recipes",
    "what to cook today",
    "meal planner",
    "cooking assistant",
    "Gemini AI",
  ],
  openGraph: {
    title: "Indian Recipe Generator",
    description:
      "Three chef-crafted Indian recipes from whatever is in your kitchen right now — with real photos and verified videos of each dish.",
    type: "website",
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf1de" },
    { media: "(prefers-color-scheme: dark)", color: "#221912" },
  ],
};

/**
 * Runs before first paint:
 * 1. Applies the saved theme (eliminates the light-theme FOUC).
 * 2. Flags `js` + `motion` so hidden-until-reveal styles only apply when
 *    JS runs and motion is allowed — content stays visible otherwise.
 */
const initScript = `(function(){try{document.documentElement.classList.add('js');if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.classList.add('motion');}var t=localStorage.getItem('recipe-generator-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${mono.variable} ${hand.variable}`}
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: initScript }} />
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <div className="aurora" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />
        {/* The lid: first-load loader, real progress, lifts off */}
        <div id="loader" role="status" aria-label="Loading">
          <div className="loader__inner">
            <span className="loader__name" data-loader-out>
              Indian Recipe Generator
            </span>
            <span className="loader__count" data-loader-out data-loader-count>
              000
            </span>
          </div>
          <div className="loader__bar" data-loader-bar />
        </div>
        <ThemeProvider>
          <RecipeProvider>
            <main id="main" tabIndex={-1}>
              {children}
            </main>
          </RecipeProvider>
        </ThemeProvider>
        <Engine />
      </body>
    </html>
  );
}
