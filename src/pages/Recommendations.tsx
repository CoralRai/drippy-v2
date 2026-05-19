import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Sparkles, ArrowLeft, Loader2, RefreshCw,
  CloudSun, Palette, Heart, History,
} from "lucide-react";
import DynamicOutfitCard, { GeneratedOutfit } from "@/components/DynamicOutfitCard";
import { useWeather } from "@/hooks/useWeather";
import { useToast } from "@/hooks/use-toast";
import StyleAIChat from "@/components/StyleAIChat";

interface QuizData {
  body_type: string;
  preferred_fit: string;
  style_preferences: string[];
}

const Recommendations = () => {
  const [searchParams] = useSearchParams();
  const occasion = searchParams.get("occasion") || "casual";
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { weather } = useWeather();

  const [outfits, setOutfits] = useState<GeneratedOutfit[]>([]);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [generatingNew, setGeneratingNew] = useState(false);

  const occasionLabel = occasion.charAt(0).toUpperCase() + occasion.slice(1);

  // ── 1. Load past outfits from DB instantly ──────────────────
  const loadHistory = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("generated_outfits")
      .select("*")
      .eq("user_id", user.id)
      .eq("occasion", occasion)
      .order("created_at", { ascending: false });
    if (data) setOutfits(data as GeneratedOutfit[]);
  }, [user, occasion]);

  // ── 2. Generate fresh outfits via Gemini edge function ──────
  const generateNew = useCallback(async () => {
    if (!user) return;
    setGeneratingNew(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-outfits", {
        body: {
          occasion,
          user_id: user.id,
          weather_suggestion: weather?.suggestion || "warm",
        },
      });
      if (error) throw error;

      // Prepend new outfits, keeping history below
      if (data?.outfits?.length) {
        setOutfits((prev) => [...(data.outfits as GeneratedOutfit[]), ...prev]);
      }
      if (data?.quiz_data) setQuizData(data.quiz_data);

      // Mark previous outfits as not-new in DB
      await supabase
        .from("generated_outfits")
        .update({ is_new: false })
        .eq("user_id", user.id)
        .eq("occasion", occasion)
        .eq("is_new", true)
        .not("id", "in", `(${(data?.outfits || []).map((o: GeneratedOutfit) => `"${o.id}"`).join(",")})`);

    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: "Failed to generate outfits. Check your Gemini key.", variant: "destructive" });
    } finally {
      setGeneratingNew(false);
    }
  }, [user, occasion, weather, toast]);

  // ── On mount: load history then generate new ────────────────
  useEffect(() => {
    const init = async () => {
      setLoadingHistory(true);
      await loadHistory();
      setLoadingHistory(false);
      await generateNew();
    };
    init();
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    toast({ title: "Generating new outfits…", description: "Gemini is styling you now!" });
    await generateNew();
  };

  const handleSaveToggle = (id: string, saved: boolean) => {
    setOutfits((prev) =>
      prev.map((o) => (o.id === id ? { ...o, is_saved: saved } : o))
    );
  };

  const newOutfits = outfits.filter((o) => o.is_new);
  const historyOutfits = outfits.filter((o) => !o.is_new);
  const firstOutfit = outfits[0];

  return (
    <div className="min-h-screen bg-fashion">
      {/* Header */}
      <div className="border-b border-border/50 p-4 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-display font-bold text-gradient-pink">Drippy</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/saved")}>
              <Heart className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Saved</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={generatingNew}>
              <RefreshCw className={`h-4 w-4 sm:mr-1 ${generatingNew ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">New outfits</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/occasions")}>
              <ArrowLeft className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Change</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-8 min-h-[calc(100vh-65px)]">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold font-display mb-3">
            Your <span className="text-gradient-pink">{occasionLabel}</span> Outfits
          </h1>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI-generated by Gemini · personalised to you
          </p>

          {/* Info badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
            {weather && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-sm">
                <CloudSun className="h-3.5 w-3.5 text-primary" />
                {weather.temperature}°C · {weather.description}
              </div>
            )}
            {quizData && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-sm">
                <Palette className="h-3.5 w-3.5 text-primary" />
                {quizData.body_type} · {quizData.preferred_fit}
              </div>
            )}
          </div>
        </div>

        {/* Loading state */}
        {loadingHistory && outfits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading your outfits…</p>
          </div>
        ) : (
          <>
            {/* Generating banner */}
            {generatingNew && (
              <div className="flex items-center justify-center gap-3 py-4 mb-6 rounded-xl bg-primary/10 border border-primary/20">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <p className="text-sm text-primary font-medium">
                  Gemini is generating new outfits for you…
                </p>
              </div>
            )}

            {/* New outfits section */}
            {newOutfits.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold text-lg">Fresh picks</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
                    {newOutfits.length} new
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {newOutfits.map((outfit) => (
                    <DynamicOutfitCard
                      key={outfit.id}
                      outfit={outfit}
                      onSaveToggle={handleSaveToggle}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* History section */}
            {historyOutfits.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold text-lg text-muted-foreground">Previously generated</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {historyOutfits.map((outfit) => (
                    <DynamicOutfitCard
                      key={outfit.id}
                      outfit={outfit}
                      onSaveToggle={handleSaveToggle}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state — only if nothing at all */}
            {outfits.length === 0 && !generatingNew && (
              <div className="text-center py-20">
                <Sparkles className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No outfits yet</h3>
                <p className="text-muted-foreground mb-6">
                  Something went wrong generating outfits. Try refreshing.
                </p>
                <Button variant="hero" onClick={handleRefresh}>
                  Try again
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating AI Chat */}
      <StyleAIChat
        occasion={occasion}
        currentOutfit={firstOutfit ? {
          top: firstOutfit.outfit_json.top?.name,
          bottom: firstOutfit.outfit_json.bottom?.name,
          footwear: firstOutfit.outfit_json.footwear?.name,
          colorHarmony: firstOutfit.outfit_json.color_harmony_score,
          compatibilityScore: firstOutfit.outfit_json.occasion_match_score,
        } : undefined}
      />
    </div>
  );
};

export default Recommendations;
