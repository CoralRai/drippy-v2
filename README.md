# Drippy

An AI-powered personal styling web app that generates outfit recommendations personalized to your body type, skin tone, wardrobe, and occasion.

**Live Demo:** [drippy-one.vercel.app](https://drippy-one.vercel.app)

---

## Overview

Drippy lets users complete a one-time style quiz covering body type, skin tone, color preferences, and style goals. They then pick an occasion — casual, office, gym, date night, and more — and receive a set of AI-generated outfits scored on color harmony and occasion-appropriateness, with per-outfit reasoning about why each look suits their body type and complexion. Interactions (likes, saves, wear ratings) feed back into future generations so recommendations improve over time.

---

## Key Features

- **Style quiz onboarding** — captures gender, body type, skin tone, height, weight, fit preference, color palette, and style keywords
- **Occasion-based outfit generation** — 11 occasion types, each producing fresh outfits on demand
- **Scored AI outfits** — every outfit carries a color harmony score, occasion match score, and natural-language body-type and skin-tone reasoning
- **Gender-aware product imagery** — two-provider image chain (Unsplash → Pexels) with a deterministic no-key fallback; queries are tailored to the user's gender
- **Wardrobe builder** — add owned items by category, color, and style tags; the outfit engine incorporates them into suggestions
- **Feedback loop** — like, dislike, save, and rate outfits you actually wore; all signals are passed to the AI on the next generation
- **Weather-aware styling** — fetches current conditions via the browser's geolocation and Open-Meteo (no API key required); influences fabric and layer suggestions
- **AI style chat** — a floating assistant backed by Groq answers questions about fit, color theory, and occasion-appropriateness in context of the outfits on screen
- **Secure auth** — email/password sign-up and sign-in via Supabase Auth, with protected routes and Row Level Security on all tables

---

## Tech Stack

**Frontend**
- React 18, TypeScript 5, Vite
- React Router v6
- TanStack Query v5
- Tailwind CSS, shadcn/ui, Radix UI, lucide-react

**Backend / Data**
- Supabase — Auth, PostgreSQL, Row Level Security
- Supabase Edge Functions (Deno runtime) — outfit generation, interaction tracking, Reddit fashion data scraping, seeding

**AI & APIs**
- Groq `llama-3.3-70b-versatile` — outfit generation (server-side, via Edge Function)
- Groq `llama-3.1-8b-instant` — style chat assistant (client-side)
- Unsplash API — primary product imagery
- Pexels API — fallback product imagery
- Open-Meteo — weather data (no key required)

**Tooling**
- Vitest, ESLint, TypeScript strict mode

---

## Architecture

1. **Quiz** — the user completes the style quiz once; answers are stored in the `style_quizzes` table and used as the base profile for every generation.
2. **Occasion selection** — the user picks an occasion; previous generation history for that occasion is loaded immediately from the database so the page is never blank on repeat visits.
3. **Edge Function** — when no history exists (first visit) or the user requests new outfits, the `generate-outfits` Edge Function assembles context: quiz profile, last five liked outfit descriptions, last three wore-ratings, and up to twenty wardrobe items. It sends a structured prompt to Groq and receives scored outfit JSON back.
4. **Persistence** — generated outfits are saved to `generated_outfits` with scoring fields, `is_new`, and `is_saved` flags. They render immediately on response.
5. **Feedback** — every like, dislike, save, and wear rating is written to `user_interactions` via the `track-interaction` Edge Function and included in the context on the next generation call.

---

## Getting Started

**Prerequisites**

- Node.js 18+
- [Supabase CLI](https://supabase.com/docs/guides/cli) and a Supabase project

**Steps**

```bash
# 1. Clone
git clone <repo-url>
cd drippy-v2-main

# 2. Install dependencies
npm install

# 3. Configure environment
#    Create a .env file in the project root — see Environment Variables below

# 4. Apply database migrations
npx supabase db push

# 5. Deploy Edge Functions
npx supabase functions deploy generate-outfits
npx supabase functions deploy track-interaction

# 6. Start the dev server
npm run dev
```

```bash
# Production build
npm run build

# Run tests
npm test
```

---

## Environment Variables

All client-side variables are `VITE_`-prefixed so Vite exposes them to the browser. Secret server-side keys (such as `SUPABASE_SERVICE_ROLE_KEY` and the server-side `GROQ_API_KEY`) belong in **Supabase Edge Function secrets**, not in this file.

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |
| `VITE_GROQ_API_KEY` | Groq API key for the client-side style chat |
| `VITE_UNSPLASH_ACCESS_KEY` | Unsplash API key for primary product imagery |
| `VITE_PEXELS_KEY` | Pexels API key (fallback imagery if Unsplash returns nothing) |

The outfit generation Edge Function reads `GROQ_API_KEY` (no `VITE_` prefix) and `SUPABASE_SERVICE_ROLE_KEY` from Supabase Edge Function secrets — set these via `npx supabase secrets set`.

---

## Project Structure

```
src/
  pages/              Route-level page components (Index, StyleQuiz, OccasionSelect,
                      Recommendations, Wardrobe, SavedOutfits, Profile, auth pages)
  components/         Shared feature components (DynamicOutfitCard, StyleAIChat,
                      OutfitCard, StyleEvolution, ProtectedRoute)
  components/ui/      shadcn/ui primitives (Button, Input, Dialog, Select, etc.)
  contexts/           AuthContext — session state and sign-out helper
  hooks/              useWeather, useTrackInteraction, use-toast, use-mobile
  lib/                quizOptions (occasion/quiz data), colorHarmony utilities, utils
  integrations/
    supabase/         Typed Supabase client and auto-generated database types

supabase/
  migrations/         SQL migration history for the full schema
  functions/          Edge Functions (Deno): generate-outfits, track-interaction,
                      scrape-reddit-fashion, seed-fashion-data, virtual-try-on
```

---

## Deployment

The app is deployed on Vercel with automatic deployments triggered by pushes to the main branch. Supabase hosts the PostgreSQL database, authentication, and Edge Functions. Add all `VITE_`-prefixed environment variables to your Vercel project settings and redeploy after any changes.
