import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { RecipeProvider } from "@/context/RecipeContext";
import { ThemeProvider } from "@/context/ThemeContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "AI Recipe Generator — Authentic Indian Recipes from Your Ingredients",
  description:
    "Enter the ingredients in your kitchen and get three chef-quality Indian recipes — with smart serving scaling, meal planning, shopping lists and a cooking timer.",
  keywords: [
    "recipe generator", "AI recipes", "Indian recipes", "what to cook today",
    "meal planner", "cooking assistant", "Gemini AI",
  ],
  openGraph: {
    title: "AI Recipe Generator",
    description:
      "Three chef-crafted Indian recipes from whatever is in your kitchen right now.",
    type: "website",
  },
};

/**
 * Runs before first paint to apply the saved theme — eliminates the
 * light-theme flash (FOUC) dark-mode users used to see.
 */
const themeInitScript = `(function(){try{var t=localStorage.getItem('recipe-generator-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ThemeProvider>
          <RecipeProvider>{children}</RecipeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
