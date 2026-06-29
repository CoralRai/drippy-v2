import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Loader2, RefreshCw,
  CloudSun, Palette, Heart, History, Sparkles,
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

// Shown in rotation while outfits are being generated.
// Gives the impression of progress without lying about timing.
const LOADING_MESSAGES = [
  "Drippy is styling your looks…",
  "Putting your fits together…",
  "Finding your drip…",
  "Making you more stylish — hang tight…",
];

// ── Skeleton ─────────────────────────────────────────────────────────────────
// Mirrors the rough shape of a DynamicOutfitCard while data loads.
// Keeps layout stable so the page doesn't jump when real cards arrive.
function OutfitCardSkeleton() {
  return (
    <div className="glass-card rounded-2xl overflow-hidden border border-border/60 flex flex-col">
      {/* Badge row */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="h-4 w-10 rounded-full bg-muted animate-pulse" />
        <div className="h-4 w-8 rounded bg-muted animate-pulse" />
      </div>

      {/* 2×2 image grid — mirrors the item-card layout inside a real card */}
      <div className="px-4 py-3 grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl overflow-hidden bg-secondary">
            <div className="h-36 bg-muted/50 animate-pulse" />
            <div className="p-2 space-y-1.5">
              <div className="h-2.5 w-2/3 rounded bg-muted animate-pulse" />
              <div className="h-2.5 w-1/2 rounded bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Score + tip row */}
      <div className="px-4 py-2 flex gap-3 border-t border-border/40">
        <div className="h-7 w-12 rounded bg-muted animate-pulse" />
        <div className="h-7 w-12 rounded bg-muted animate-pulse" />
        <div className="flex-1 h-7 rounded bg-muted animate-pulse" />
      </div>

      {/* Action pill buttons row */}
      <div className="px-4 py-3 flex gap-2 border-t border-border/40">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex-1 h-7 rounded-full bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// ── Page component ────────────────────────────────────────────────────────────
const Recommendations = () => {
  const [searchParams] = useSearchParams();
  const occasion = searchParams.get("occasion") || "casual";
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { weather } = useWeather();

  const [outfits, setOutfits] = useState<GeneratedOutfit[]>([]);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [quizGender, setQuizGender] = useState<string | undefined>(undefined);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [generatingNew, setGeneratingNew] = useState(false);

  // Tracks which loading message is currently displayed
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);

  const occasionLabel = occasion.charAt(0).toUpperCase() + occasion.slice(1);

  // Keep weather in a ref so generateNew doesn't need it as a dep and
  // weather updates won't re-trigger the mount effect.
  const weatherRef = useRef(weather);
  useEffect(() => { weatherRef.current = weather; }, [weather]);

  // Cycle through LOADING_MESSAGES every 2500ms while generation is active.
  // Resets to the first message each time a new generation starts.
  useEffect(() => {
    if (!generatingNew) return;
    setLoadingMsgIndex(0);
    const interval = setInterval(() => {
      setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [generatingNew]);

  const generateNew = useCallback(async () => {
    if (!user) return;
    setGeneratingNew(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-outfits", {
        body: {
          occasion,
          user_id: user.id,
          weather_suggestion: weatherRef.current?.suggestion || "warm",
        },
      });
      if (error) throw error;

      if (data?.outfits?.length) {
        setOutfits((prev) => [...(data.outfits as GeneratedOutfit[]), ...prev]);
      }
      if (data?.quiz_data) setQuizData(data.quiz_data);

      // Mark previously-new outfits as no longer new now that fresh ones are here
      await supabase
        .from("generated_outfits")
        .update({ is_new: false })
        .eq("user_id", user.id)
        .eq("occasion", occasion)
        .eq("is_new", true)
        .not("id", "in", `(${(data?.outfits || []).map((o: GeneratedOutfit) => `"${o.id}"`).join(",")})`);

    } catch (err: unknown) {
      console.error(err);
      toast({
        title: "Error",
        description: "Couldn't generate outfits right now. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGeneratingNew(false);
    }
  }, [user, occasion, toast]);

  // On mount: load saved outfits in stable created_at desc order and fetch quiz
  // gender in parallel. Auto-generate only when no history exists for this occasion.
  useEffect(() => {
    if (!user) return;
    const init = async () => {
      setLoadingHistory(true);

      const [outfitsRes, quizRes] = await Promise.all([
        supabase
          .from("generated_outfits")
          .select("*")
          .eq("user_id", user.id)
          .eq("occasion", occasion)
          .order("created_at", { ascending: false }),
        supabase
          .from("style_quizzes")
          .select("gender")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      const existing = (outfitsRes.data as GeneratedOutfit[]) || [];
      setOutfits(existing);

      if (quizRes.data?.gender) {
        setQuizGender(quizRes.data.gender.toLowerCase());
      }

      setLoadingHistory(false);

      // First visit for this occasion — generate right away
      if (existing.length === 0) {
        await generateNew();
      }
    };
    init();
  }, [user, occasion, generateNew]);

  const handleRefresh = async () => {
    toast({ title: "Hang tight", description: "Drippy is styling you up…" });
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

  // Whether to show the skeleton grid — either fetching history for the first time,
  // or actively generating new outfits (both cases need a placeholder layout).
  const showSkeletons = (loadingHistory && outfits.length === 0) || generatingNew;

  return (
    <div className="min-h-screen bg-fashion">
      {/* Header */}
      <div className="border-b border-border/50 p-4 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
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
            Styled for you by Drippy AI · personalised to your taste
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

        {showSkeletons ? (
          <>
            {/* Rotating message above the skeleton grid */}
            <div className="flex items-center justify-center gap-3 py-4 mb-6 rounded-xl bg-primary/10 border border-primary/20">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <p className="text-sm text-primary font-medium">
                {LOADING_MESSAGES[loadingMsgIndex]}
              </p>
            </div>

            {/* 6 skeleton cards — fills 2 rows on desktop (3-col grid) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
              {Array.from({ length: 6 }).map((_, i) => (
                <OutfitCardSkeleton key={i} />
              ))}
            </div>

            {/* While re-generating, existing history stays visible below the skeletons */}
            {!loadingHistory && historyOutfits.length > 0 && (
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
                      gender={quizGender}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
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
                      gender={quizGender}
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
                      gender={quizGender}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state — only if nothing at all and not loading */}
            {outfits.length === 0 && (
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
