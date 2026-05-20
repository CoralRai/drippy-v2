import { useState, useEffect } from "react";
import {
  Heart, ThumbsUp, ThumbsDown, Shirt, Footprints,
  CloudSun, Star, CheckCircle2, Sparkles, Package,
  ShoppingBag, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrackInteraction } from "@/hooks/useTrackInteraction";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OutfitItem { name: string; color: string; }

export interface GeneratedOutfit {
  id: string;
  outfit_json: {
    top: OutfitItem;
    bottom: OutfitItem;
    footwear: OutfitItem;
    outerwear: OutfitItem | null;
    styling_tip: string;
    body_type_reason: string;      // #2
    skin_tone_reason: string;      // #2
    uses_owned_item: boolean;      // #5
    style_tags: string[];
    color_harmony_score: number;
    occasion_match_score: number;
    total_score: number;
  };
  is_saved: boolean;
  is_new: boolean;
  wore_at: string | null;          // #4
  wore_rating: number | null;      // #4
  created_at: string;
  occasion: string;
}

interface Props {
  outfit: GeneratedOutfit;
  onSaveToggle?: (id: string, saved: boolean) => void;
  onWoreRating?: (id: string, rating: number) => void;
}

const COLOR_MAP: Record<string, string> = {
  navy: "#1a237e", black: "#212121", white: "#f5f5f5", gray: "#9e9e9e",
  grey: "#9e9e9e", brown: "#795548", beige: "#d7ccc8", cream: "#fff8e1",
  khaki: "#c8b560", olive: "#827717", red: "#c62828", pink: "#f48fb1",
  blue: "#1565c0", green: "#2e7d32", yellow: "#f9a825", orange: "#e65100",
  purple: "#6a1b9a", lavender: "#b39ddb", mint: "#a5d6a7", coral: "#ff8a65",
  teal: "#00695c", gold: "#f9a825", silver: "#bdbdbd",
};

function ColorDot({ color }: { color: string }) {
  const hex = COLOR_MAP[color.toLowerCase()] || "#9e9e9e";
  return (
    <span
      className="inline-block w-3 h-3 rounded-full border border-border/60 shrink-0"
      style={{ backgroundColor: hex }}
      title={color}
    />
  );
}

function ScorePill({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? "text-green-500" : value >= 60 ? "text-yellow-500" : "text-red-400";
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value}%</p>
    </div>
  );
}

function getPicsumUrl(item: OutfitItem): string {
  const seed = encodeURIComponent(item.name.trim().replace(/\s+/g, "-"));
  return `https://picsum.photos/seed/${seed}/200/260`;
}

async function searchUnsplashImage(item: OutfitItem): Promise<string> {
  const query = `${item.color} ${item.name} fashion clothing`;
  const key = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
  if (!key) return getPicsumUrl(item);

  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=portrait&client_id=${key}`
  );

  if (!res.ok) {
    throw new Error("Unsplash request failed");
  }

  const data = await res.json() as { results?: Array<{ urls?: { small?: string } }> };
  return data.results?.[0]?.urls?.small || getPicsumUrl(item);
}

function getShopLinks(item: OutfitItem) {
  const query = encodeURIComponent(`${item.color} ${item.name}`);
  const queryHyphen = `${item.color}-${item.name}`.replace(/\s+/g, "-");
  return {
    amazon: `https://www.amazon.in/s?k=${query}`,
    myntra: `https://www.myntra.com/${queryHyphen}`,
    flipkart: `https://www.flipkart.com/search?q=${query}`,
  };
}

function OutfitItemCard({
  label,
  item,
  icon,
  isOpen,
  onToggleShop,
}: {
  label: string;
  item: OutfitItem;
  icon: JSX.Element;
  isOpen: boolean;
  onToggleShop: () => void;
}) {
  const [imageUrl, setImageUrl] = useState<string>(getPicsumUrl(item));
  const [loadingImage, setLoadingImage] = useState(true);
  const links = getShopLinks(item);

  useEffect(() => {
    let mounted = true;
    setLoadingImage(true);

    searchUnsplashImage(item)
      .then((url) => {
        if (mounted) setImageUrl(url);
      })
      .catch(() => {
        if (mounted) setImageUrl(getPicsumUrl(item));
      })
      .finally(() => {
        if (mounted) setLoadingImage(false);
      });

    return () => {
      mounted = false;
    };
  }, [item]);

  return (
    <div className="rounded-3xl border border-border/60 bg-secondary overflow-hidden shadow-sm">
      <div className="relative h-52 overflow-hidden bg-slate-950/5">
        {loadingImage && (
          <div className="absolute inset-0 animate-pulse bg-slate-900/40" />
        )}
        <img
          src={imageUrl}
          alt={`${item.color} ${item.name}`}
          className="h-full w-full object-cover transition duration-300"
          onError={(event) => {
            event.currentTarget.src = getPicsumUrl(item);
          }}
        />
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
          {label}
        </span>
      </div>
      <div className="p-3 space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">Item</p>
          <p className="text-sm font-semibold truncate text-foreground">{item.name}</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <ColorDot color={item.color} />
            <span>{item.color}</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={onToggleShop}>
            <ShoppingBag className="h-4 w-4" />
            Shop this
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
        {isOpen && (
          <div className="grid gap-2">
            <a
              href={links.amazon}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl bg-orange-500/10 px-3 py-2 text-sm font-medium text-orange-700 transition hover:bg-orange-500/15"
            >
              Amazon
            </a>
            <a
              href={links.myntra}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl bg-pink-500/10 px-3 py-2 text-sm font-medium text-pink-700 transition hover:bg-pink-500/15"
            >
              Myntra
            </a>
            <a
              href={links.flipkart}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl bg-sky-500/10 px-3 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-500/15"
            >
              Flipkart
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// #4: Star rating component
function StarRating({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`h-4 w-4 ${
              star <= (hovered || value || 0)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function DynamicOutfitCard({ outfit, onSaveToggle, onWoreRating }: Props) {
  const { outfit_json: o, is_new, is_saved, id, wore_rating } = outfit;
  const [saved, setSaved] = useState(is_saved);
  const [liked, setLiked] = useState<"like" | "dislike" | null>(null);
  const [rating, setRating] = useState<number | null>(wore_rating);
  const [showWore, setShowWore] = useState(false);
  const [showWhy, setShowWhy] = useState(false);   // #2
  const [showShop, setShowShop] = useState<Record<string, boolean>>({});
  const { track } = useTrackInteraction();
  const { user } = useAuth();
  const { toast } = useToast();

  const outfitDescription = `${o.top.name} + ${o.bottom.name} + ${o.footwear.name}${o.outerwear ? ` + ${o.outerwear.name}` : ""}`;
  const styleTags = [outfit.occasion, ...(o.style_tags || []), o.top.color, o.bottom.color].filter(Boolean);

  const handleLike = async () => {
    const next = liked === "like" ? null : "like";
    setLiked(next);
    if (next === "like") {
      await track({ interaction_type: "like", outfit_id: id, style_tags: styleTags, outfit_description: outfitDescription });
      toast({ title: "Liked! ✨", description: "We'll show more like this." });
    }
  };

  const handleDislike = async () => {
    const next = liked === "dislike" ? null : "dislike";
    setLiked(next);
    if (next === "dislike") {
      await track({ interaction_type: "dislike", outfit_id: id, style_tags: styleTags, outfit_description: outfitDescription });
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const next = !saved;
    setSaved(next);
    await supabase.from("generated_outfits").update({ is_saved: next }).eq("id", id);
    if (next) {
      await track({ interaction_type: "save", outfit_id: id, style_tags: styleTags, outfit_description: outfitDescription });
      toast({ title: "Saved! 💾", description: "Added to your collection." });
    }
    onSaveToggle?.(id, next);
  };

  // #4: wore rating handler
  const handleWoreRating = async (stars: number) => {
    setRating(stars);
    setShowWore(false);
    await supabase
      .from("generated_outfits")
      .update({ wore_rating: stars, wore_at: new Date().toISOString() })
      .eq("id", id);
    await track({
      interaction_type: "wore",
      outfit_id: id,
      style_tags: styleTags,
      outfit_description: outfitDescription,
      metadata: { rating: stars },
    });
    toast({ title: `Rated ${stars}/5 ⭐`, description: "Thanks! Your next outfits will be even better." });
    onWoreRating?.(id, stars);
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden border border-border/60 flex flex-col">

      {/* Top row — badges */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {is_new && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
              ✦ New
            </span>
          )}
          {/* #5: owns item badge */}
          {o.uses_owned_item && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-600 flex items-center gap-1">
              <Package className="h-3 w-3" /> Uses your item
            </span>
          )}
          {/* #4: wore badge */}
          {rating && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-600 flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-500" /> Wore · {rating}/5
            </span>
          )}
        </div>
        <span className={`text-sm font-bold shrink-0 ${o.total_score >= 80 ? "text-green-500" : o.total_score >= 60 ? "text-yellow-500" : "text-red-400"}`}>
          {o.total_score}%
        </span>
      </div>

      {/* Outfit items */}
      <div className="px-4 py-3 flex-1">
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { icon: <Shirt className="h-10 w-10 text-white/90" />, label: "Top", item: o.top },
            { icon: <Shirt className="h-10 w-10 rotate-180 text-white/90" />, label: "Bottom", item: o.bottom },
            { icon: <Footprints className="h-10 w-10 text-white/90" />, label: "Shoes", item: o.footwear },
            ...(o.outerwear ? [{ icon: <CloudSun className="h-10 w-10 text-white/90" />, label: "Outer", item: o.outerwear }] : []),
          ].map(({ icon, label, item }) => (
            <OutfitItemCard
              key={label}
              label={label}
              item={item}
              icon={icon}
              isOpen={!!showShop[label]}
              onToggleShop={() => setShowShop((prev) => ({ ...prev, [label]: !prev[label] }))}
            />
          ))}
        </div>
      </div>

      {/* Scores row */}
      <div className="px-4 py-2 flex gap-4 border-t border-border/40">
        <ScorePill label="Color" value={o.color_harmony_score} />
        <ScorePill label="Occasion" value={o.occasion_match_score} />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-0.5">Styling tip</p>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{o.styling_tip}</p>
        </div>
      </div>

      {/* #2: Why this works for you — expandable */}
      {(o.body_type_reason || o.skin_tone_reason) && (
        <div className="px-4 pb-2 border-t border-border/40">
          <button
            onClick={() => setShowWhy(!showWhy)}
            className="flex items-center gap-1.5 text-xs text-primary mt-2 hover:opacity-70 transition-opacity"
          >
            <Sparkles className="h-3 w-3" />
            {showWhy ? "Hide" : "Why this works for you"}
          </button>
          {showWhy && (
            <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              {o.body_type_reason && (
                <p className="leading-relaxed">
                  <span className="text-foreground font-medium">Body type: </span>
                  {o.body_type_reason}
                </p>
              )}
              {o.skin_tone_reason && (
                <p className="leading-relaxed">
                  <span className="text-foreground font-medium">Skin tone: </span>
                  {o.skin_tone_reason}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* #4: I wore this today — expandable */}
      <div className="px-4 pb-2 border-t border-border/40">
        {!showWore && !rating && (
          <button
            onClick={() => setShowWore(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2 hover:text-foreground transition-colors"
          >
            <CheckCircle2 className="h-3 w-3" />
            I wore this today
          </button>
        )}
        {showWore && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground mb-1.5">How did it go?</p>
            <StarRating value={rating} onChange={handleWoreRating} />
          </div>
        )}
        {rating && !showWore && (
          <button
            onClick={() => setShowWore(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2 hover:text-foreground"
          >
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            Change rating
          </button>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-4 py-3 flex items-center gap-2 border-t border-border/40">
        <Button size="sm" variant={liked === "like" ? "default" : "ghost"} className="flex-1 gap-1" onClick={handleLike}>
          <ThumbsUp className="h-3.5 w-3.5" /> Like
        </Button>
        <Button size="sm" variant={liked === "dislike" ? "destructive" : "ghost"} className="flex-1 gap-1" onClick={handleDislike}>
          <ThumbsDown className="h-3.5 w-3.5" /> Nope
        </Button>
        <Button size="sm" variant={saved ? "default" : "outline"} className="flex-1 gap-1" onClick={handleSave}>
          <Heart className={`h-3.5 w-3.5 ${saved ? "fill-current" : ""}`} />
          {saved ? "Saved" : "Save"}
        </Button>
      </div>
    </div>
  );
}
