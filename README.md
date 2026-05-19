# Drippy — AI Outfit Recommendation Engine

## Setup (do this once)

### Step 1 — Run the SQL migration in Supabase
1. Go to https://supabase.com/dashboard/project/eqfiouaprxoprxpivlor
2. Left sidebar → **SQL Editor** → **New query**
3. Copy the entire contents of `supabase/migrations/20260517000000_fresh_schema.sql`
4. Paste and click **Run**
5. You should see "Success" — this creates all your tables

### Step 2 — Add your Gemini secret to Supabase Edge Functions
1. Left sidebar → **Edge Functions** → **Manage secrets**
2. Add these two secrets:
   - Name: `GEMINI_API_KEY` → Value: your Gemini API key from https://aistudio.google.com/apikey
   - Name: `SUPABASE_SERVICE_ROLE_KEY` → Value: (get from Settings → API → service_role key)

### Step 3 — Deploy Edge Functions
Install Supabase CLI then run:
```bash
supabase login
supabase link --project-ref eqfiouaprxoprxpivlor
supabase functions deploy generate-outfits
supabase functions deploy track-interaction
```

### Step 4 — Run the app
```bash
npm install
npm run dev
```

## Local environment
Copy `.env.example` to `.env`, then fill in your Supabase URL, Supabase publishable key, and Gemini API key.

## How it works
1. User completes style quiz (body type, colors, style preferences)
2. User picks an occasion
3. Gemini generates 6 complete outfits tailored to them
4. Outfits saved to database — visible on every future visit
5. "Refresh" generates 6 more and adds to history
6. Like/Save/Dislike — likes feed back into next generation as context
7. Style AI chat — floating button, asks Gemini about the current outfit

## Managing users
- View users: Supabase dashboard → Authentication → Users
- Delete user: click user row → Delete
- View their data: Table Editor → generated_outfits / style_quizzes
- Ban user: Authentication → Users → Ban user
