import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";
import { RecipeProvider } from "@/context/RecipeContext";
import { ThemeProvider } from "@/context/ThemeContext";

/**
 * Typography: Fraunces (an opsz-variable editorial serif with a warm, food-
 * magazine voice) for display + Outfit (geometric, friendly) for UI text.
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata = {
  title: "Rasoi · AI Recipe Studio — Chef-crafted Indian recipes from your ingredients",
  description:
    "Enter what's in your kitchen and get three chef-crafted Indian recipes — with AI-styled dish photography, video tutorials, real macro nutrition, smart serving scaling, meal planning, shopping lists and a cooking timer.",
  keywords: [
    "recipe generator", "AI recipes", "Indian recipes", "what to cook today",
    "meal planner", "cooking assistant", "Gemini AI", "recipe photos",
    "recipe videos",
  ],
  openGraph: {
    title: "Rasoi · AI Recipe Studio",
    description:
      "Three chef-crafted Indian recipes from whatever is in your kitchen — now with dish photography and video tutorials.",
    type: "website",
  },
};

/**
 * Runs before first paint to apply the saved theme — eliminates the
 * light-theme flash (FOUC) dark-mode users would otherwise see.
 */
const themeInitScript = `(function(){try{var t=localStorage.getItem('recipe-generator-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fraunces.variable} ${outfit.variable} font-sans antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ThemeProvider>
          <RecipeProvider>{children}</RecipeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
