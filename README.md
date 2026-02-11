# AI Recipe Generator

A Next.js application that generates creative recipes based on available ingredients and user preferences using **Google's Gemini 2.5 Flash** model.

## Features

-   **Ingredient Input**: Easily add and remove ingredients via tags.
-   **Dietary Preferences**: Specify restrictions (e.g., Gluten-free, Vegan, timelines).
-   **AI Generation**: Utilizes Google's **Gemini 2.5 Flash** for high-speed, high-quality recipes.
-   **Premium UI**:
    -   **Card Layout**: Clean, modern card design with gradient accents.
    -   **Dynamic Icons**: Visual indicators for ingredients, instructions, and time.
    -   **Animations**: smooth fade-in effects for generated content.
-   **Responsive Design**: Built with Tailwind CSS for mobile and desktop.

## Tech Stack

-   **Frontend**: Next.js 14+ (App Router), React, Tailwind CSS, Lucide React
-   **Backend**: Next.js API Routes
-   **AI**: Google Gemini (`@google/generative-ai`)

## Getting Started

1.  **Clone the repository** (if applicable)

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**:
    Create a `.env.local` file in the root directory and add your Gemini API key:
    ```bash
    GEMINI_API_KEY=your_gemini_api_key_here
    ```
    *See `gemini_guide.md` for instructions on getting an API key.*

4.  **Run the Development Server**:
    ```bash
    npm run dev
    ```

5.  **Open the Application**:
    Visit [http://localhost:3000](http://localhost:3000) in your browser.

## API Testing (Postman)

You can test the API directly using Postman or cURL.

**Endpoint**: `POST http://localhost:3000/api/generate`

**Headers**:
-   `Content-Type`: `application/json`

**Body (JSON)**:
```json
{
  "ingredients": ["Chicken", "Rice", "Tomato"],
  "preferences": "Spicy, Dinner, Under 30 mins"
}
```

**Expected Response**:
```json
{
  "recipe": "# Spicy Chicken & Tomato Rice\n\n## Ingredients\n- Chicken..."
}
```

## Documentation

-   [Gemini API Guide](gemini_guide.md): Instructions for setting up Google Gemini.
-   [Walkthrough](walkthrough.md): Manual verification steps.
