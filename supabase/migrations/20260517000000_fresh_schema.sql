-- ============================================================
-- Drippy Fresh Schema — run this in Supabase SQL Editor
-- ============================================================

DROP TABLE IF EXISTS public.item_compatibility CASCADE;
DROP TABLE IF EXISTS public.clothing_items CASCADE;
DROP TABLE IF EXISTS public.reddit_fashion_data CASCADE;
DROP TABLE IF EXISTS public.generated_outfits CASCADE;
DROP TABLE IF EXISTS public.saved_outfits CASCADE;
DROP TABLE IF EXISTS public.user_interactions CASCADE;
DROP TABLE IF EXISTS public.user_wardrobe CASCADE;
DROP TABLE IF EXISTS public.style_quizzes CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ── profiles ─────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own profile" ON public.profiles FOR ALL USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── style_quizzes ─────────────────────────────────────────────
CREATE TABLE public.style_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  gender TEXT,
  age_group TEXT,
  height TEXT,
  weight TEXT,
  body_type TEXT,
  skin_tone TEXT,
  preferred_fit TEXT,
  color_palette TEXT[] DEFAULT '{}',
  style_preferences TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.style_quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own quiz" ON public.style_quizzes FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_style_quizzes_user ON public.style_quizzes(user_id);

-- ── generated_outfits ─────────────────────────────────────────
CREATE TABLE public.generated_outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  occasion TEXT NOT NULL,
  outfit_json JSONB NOT NULL,
  is_saved BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT true,
  -- #4: wore tracking
  wore_at TIMESTAMPTZ DEFAULT NULL,
  wore_rating INTEGER CHECK (wore_rating BETWEEN 1 AND 5) DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.generated_outfits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own outfits" ON public.generated_outfits FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_generated_outfits_user_occasion ON public.generated_outfits(user_id, occasion);
CREATE INDEX idx_generated_outfits_created ON public.generated_outfits(created_at DESC);

-- ── user_interactions ─────────────────────────────────────────
CREATE TABLE public.user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  outfit_id UUID REFERENCES public.generated_outfits(id) ON DELETE SET NULL,
  interaction_type TEXT CHECK (interaction_type IN ('view','like','dislike','save','purchase','wore')) NOT NULL,
  style_tags TEXT[] DEFAULT '{}',
  outfit_description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own interactions" ON public.user_interactions FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_interactions_user ON public.user_interactions(user_id, created_at DESC);

-- ── user_wardrobe ─────────────────────────────────────────────
CREATE TABLE public.user_wardrobe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  color TEXT,
  style_tags TEXT[] DEFAULT '{}',
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_wardrobe ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own wardrobe" ON public.user_wardrobe FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_wardrobe_user ON public.user_wardrobe(user_id);

-- ── occasion_history view (#3) ────────────────────────────────
-- Lets the app quickly show "last time + count" per occasion
CREATE OR REPLACE VIEW public.occasion_history AS
SELECT
  user_id,
  occasion,
  COUNT(*) AS total_outfits,
  MAX(created_at) AS last_generated_at
FROM public.generated_outfits
GROUP BY user_id, occasion;
