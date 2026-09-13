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
  title: "AI Recipe Generator",
  description: "Generate creative recipes from your ingredients using AI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <RecipeProvider>{children}</RecipeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
