import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { occasions } from "@/lib/quizOptions";
import { Sparkles, ArrowRight, Clock, Shirt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import StyleEvolution from "@/components/StyleEvolution";

// #3: occasion history type
interface OccasionHistory {
  occasion: string;
  total_outfits: number;
  last_generated_at: string;
}

const OccasionSelect = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, OccasionHistory>>({});
  const navigate = useNavigate();
  const { user } = useAuth();

  // #3: load occasion history
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("generated_outfits")
        .select("occasion, created_at")
        .eq("user_id", user.id);

      if (!data) return;

      // Group by occasion
      const grouped: Record<string, OccasionHistory> = {};
      data.forEach((row: any) => {
        if (!grouped[row.occasion]) {
          grouped[row.occasion] = {
            occasion: row.occasion,
            total_outfits: 0,
            last_generated_at: row.created_at,
          };
        }
        grouped[row.occasion].total_outfits++;
        if (row.created_at > grouped[row.occasion].last_generated_at) {
          grouped[row.occasion].last_generated_at = row.created_at;
        }
      });
      setHistory(grouped);
    };
    load();
  }, [user]);

  const handleContinue = () => {
    if (selected) navigate(`/recommendations?occasion=${selected}`);
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    return `${days} days ago`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-display font-bold text-gradient-pink">Drippy</span>
          </Link>
          <Link to="/profile" className="text-sm text-muted-foreground hover:text-foreground">
            Profile
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold font-display mb-3">
            What's the <span className="text-gradient-pink">occasion?</span>
          </h1>
          <p className="text-muted-foreground">Gemini will generate outfits tailored to it</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-8">
          {occasions.map((occ) => {
            const hist = history[occ.id];
            return (
              <button
                key={occ.id}
                onClick={() => setSelected(occ.id)}
                className={`relative p-4 rounded-2xl border text-left transition-all hover:scale-105 ${
                  selected === occ.id
                    ? "border-primary bg-primary/10 shadow-md"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <div className="text-2xl mb-2">{occ.icon || "👗"}</div>
                <p className="font-medium text-sm">{occ.label}</p>

                {/* #3: history hint */}
                {hist && (
                  <div className="mt-1.5 space-y-0.5">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {timeAgo(hist.last_generated_at)}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Shirt className="h-2.5 w-2.5" />
                      {hist.total_outfits} outfits
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* #6: Style evolution */}
        <div className="max-w-sm mx-auto mb-8">
          <StyleEvolution />
        </div>

        <div className="flex justify-center">
          <Button
            variant="hero"
            size="lg"
            onClick={handleContinue}
            disabled={!selected}
            className="gap-2 px-8"
          >
            Generate my outfits
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OccasionSelect;
