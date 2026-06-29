import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DynamicOutfitCard, { GeneratedOutfit } from "@/components/DynamicOutfitCard";

const SavedOutfits = () => {
  const { user } = useAuth();
  const [outfits, setOutfits] = useState<GeneratedOutfit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("generated_outfits")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_saved", true)
        .order("created_at", { ascending: false });
      setOutfits((data as GeneratedOutfit[]) || []);
      setLoading(false);
    };
    load();
  }, [user]);

  const handleSaveToggle = (id: string, saved: boolean) => {
    if (!saved) setOutfits((prev) => prev.filter((o) => o.id !== id));
  };

  return (
    <div className="min-h-screen bg-fashion">
      <div className="border-b border-border/50 p-4 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display font-bold text-gradient-pink">Drippy</span>
          </Link>
          <Link to="/occasions" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-display mb-2">
            <span className="text-gradient-pink">Saved</span> Outfits
          </h1>
          <p className="text-muted-foreground">Your favourite Drippy looks</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : outfits.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No saved outfits yet</h3>
            <p className="text-muted-foreground">
              Hit the Save button on any outfit to keep it here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {outfits.map((outfit) => (
              <DynamicOutfitCard
                key={outfit.id}
                outfit={outfit}
                onSaveToggle={handleSaveToggle}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedOutfits;
