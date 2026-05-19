import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles } from "lucide-react";

interface StyleStat {
  tag: string;
  percent: number;
}

const TAG_COLORS: Record<string, string> = {
  casual: "bg-blue-400",
  minimal: "bg-gray-400",
  streetwear: "bg-orange-400",
  formal: "bg-purple-400",
  preppy: "bg-green-400",
  bohemian: "bg-yellow-400",
  sporty: "bg-red-400",
  classic: "bg-indigo-400",
  trendy: "bg-pink-400",
  elegant: "bg-violet-400",
};

export default function StyleEvolution() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StyleStat[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;

      // Fetch liked interactions with their style_tags
      const { data } = await supabase
        .from("user_interactions")
        .select("style_tags")
        .eq("user_id", user.id)
        .eq("interaction_type", "like")
        .limit(100);

      if (!data || data.length === 0) return;

      // Count tags
      const tagCounts: Record<string, number> = {};
      data.forEach((row: any) => {
        (row.style_tags || []).forEach((tag: string) => {
          const t = tag.toLowerCase();
          // Only count known style tags, not colors or occasions
          if (TAG_COLORS[t] || ["casual","minimal","streetwear","formal","preppy","bohemian","sporty","classic","trendy","elegant"].includes(t)) {
            tagCounts[t] = (tagCounts[t] || 0) + 1;
          }
        });
      });

      const total = Object.values(tagCounts).reduce((a, b) => a + b, 0);
      if (total === 0) return;

      const sorted = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag, count]) => ({
          tag,
          percent: Math.round((count / total) * 100),
        }));

      setStats(sorted);
    };
    load();
  }, [user]);

  if (stats.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Your style this month</h3>
      </div>
      <div className="space-y-2">
        {stats.map(({ tag, percent }) => (
          <div key={tag}>
            <div className="flex justify-between text-xs mb-1">
              <span className="capitalize text-muted-foreground">{tag}</span>
              <span className="font-medium">{percent}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${TAG_COLORS[tag] || "bg-primary"}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
