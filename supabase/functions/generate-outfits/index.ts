import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { occasion, user_id, weather_suggestion } = await req.json();
    if (!occasion || !user_id) {
      return new Response(JSON.stringify({ error: "occasion and user_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const groqKey = Deno.env.get("GROQ_API_KEY")!;
    const weather = weather_suggestion || "warm";

    const [quizResult, likedResult, woreResult, wardrobeResult] = await Promise.all([
      supabase.from("style_quizzes").select("*").eq("user_id", user_id).maybeSingle(),
      supabase.from("user_interactions").select("outfit_description").eq("user_id", user_id).eq("interaction_type", "like").order("created_at", { ascending: false }).limit(5),
      supabase.from("generated_outfits").select("outfit_json, wore_rating").eq("user_id", user_id).not("wore_rating", "is", null).order("wore_at", { ascending: false }).limit(3),
      supabase.from("user_wardrobe").select("name, category, color").eq("user_id", user_id).limit(20),
    ]);

    const quiz = quizResult.data;
    const likedOutfits = (likedResult.data || []).map((r: any) => r.outfit_description).filter(Boolean);
    const woreOutfits = (woreResult.data || []).map((r: any) => `${r.outfit_json?.top?.name} + ${r.outfit_json?.bottom?.name} (rated ${r.wore_rating}/5)`).filter(Boolean);
    const wardrobe = (wardrobeResult.data || []);

    const userProfile = quiz ? `- Gender: ${quiz.gender || "unisex"}\n- Age group: ${quiz.age_group || "18-25"}\n- Body type: ${quiz.body_type || "rectangle"}\n- Skin tone: ${quiz.skin_tone || "medium"}\n- Preferred fit: ${quiz.preferred_fit || "regular"}\n- Favourite colors: ${(quiz.color_palette || []).join(", ") || "navy, white, black"}\n- Style preferences: ${(quiz.style_preferences || []).join(", ") || "casual, minimal"}` : "Gender: unisex, Style: casual, Colors: navy white black";

    const woreContext = woreOutfits.length > 0 ? `\nOutfits user WORE and rated:\n${woreOutfits.join("\n")}` : "";
    const likedContext = likedOutfits.length > 0 ? `\nOutfits user liked:\n${likedOutfits.join("\n")}` : "";
    const wardrobeContext = wardrobe.length > 0 ? `\nUser OWNS these items:\n${wardrobe.map((w: any) => `- ${w.name}${w.color ? ` (${w.color})` : ""}`).join("\n")}` : "";

    const prompt = `You are a professional fashion stylist. Generate 6 complete outfits.\n\nUSER PROFILE:\n${userProfile}\n\nOCCASION: ${occasion}\nWEATHER: ${weather}\n${likedContext}${woreContext}${wardrobeContext}\n\nRules: suit body type and skin tone, harmonious colors, specific item names, outerwear only if cool/cold/formal.\n\nReturn ONLY a valid JSON array of exactly 6 outfits, no markdown:\n[{"top":{"name":"string","color":"string"},"bottom":{"name":"string","color":"string"},"footwear":{"name":"string","color":"string"},"outerwear":null,"styling_tip":"string","body_type_reason":"string","skin_tone_reason":"string","uses_owned_item":false,"style_tags":["casual"],"color_harmony_score":85,"occasion_match_score":90,"total_score":88}]`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a professional fashion stylist. Always respond with valid JSON only, no markdown, no explanation." },
          { role: "user", content: prompt }
        ],
        max_tokens: 3000,
        temperature: 0.8,
      }),
    });

    const groqData = await groqRes.json();
    const rawText = groqData.choices?.[0]?.message?.content || "[]";
    console.log("Groq raw:", rawText.substring(0, 200));
    
    const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    let outfits: any[] = [];
    try { outfits = JSON.parse(cleaned); } catch {
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) { try { outfits = JSON.parse(match[0]); } catch { outfits = []; } }
    }

    if (!Array.isArray(outfits) || outfits.length === 0) {
      throw new Error("Failed to generate outfits: " + rawText.substring(0, 100));
    }

    const rows = outfits.map((outfit: any) => ({ user_id, occasion, outfit_json: outfit, is_saved: false, is_new: true }));
    const { data: savedRows, error: insertError } = await supabase.from("generated_outfits").insert(rows).select("id, outfit_json, is_saved, is_new, wore_at, wore_rating, created_at, occasion");
    if (insertError) throw insertError;

    return new Response(JSON.stringify({ outfits: savedRows, quiz_data: quiz }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("generate-outfits error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});