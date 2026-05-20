import { useState, useRef, useEffect, useMemo } from "react";
import { Sparkles, Send, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface StyleAIChatProps {
  occasion: string;
  currentOutfit?: {
    top?: string;
    bottom?: string;
    footwear?: string;
    colorHarmony?: number;
    compatibilityScore?: number;
  };
}

const SYSTEM_PROMPT = `You are Drippy's AI style advisor — a friendly, knowledgeable fashion expert.
Help users make confident outfit choices with practical, specific advice.
Keep answers concise (2-4 sentences). Warm, encouraging tone.
Reference concrete principles: color theory, body proportions, occasion-appropriateness, trends.
Never be vague — always give actionable suggestions.`;

interface Message { role: "user" | "assistant"; content: string; }

export default function StyleAIChat({ occasion, currentOutfit }: StyleAIChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const outfitContext = useMemo(
    () => currentOutfit?.top
      ? `User is viewing a ${occasion} outfit: ${currentOutfit.top} + ${currentOutfit.bottom} + ${currentOutfit.footwear}. Color harmony: ${currentOutfit.colorHarmony}%.`
      : `User is browsing ${occasion} recommendations.`,
    [occasion, currentOutfit]
  );

  useEffect(() => {
    if (open && messages.length === 0) {
      const greeting = currentOutfit?.top
        ? `Hi! I'm your Drippy style advisor ✨ You're looking at: ${currentOutfit.top} + ${currentOutfit.bottom}. Color harmony is ${currentOutfit.colorHarmony}% — ask me anything!`
        : `Hi! I'm your Drippy style advisor ✨ You're browsing ${occasion} looks. Ask me anything — color advice, what shoes to pick, how to dress for your body type!`;
      setMessages([{ role: "assistant", content: greeting }]);
    }
  }, [open, messages.length, currentOutfit, occasion]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: `${SYSTEM_PROMPT}\n\nContext: ${outfitContext}` },
            ...newMessages,
          ],
          max_tokens: 200,
          temperature: 0.7,
        }),
      });

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content ?? "Sorry, I couldn't generate a response. Try again!";
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Connection issue — please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const suggestions = [
    "Does this outfit suit my body type?",
    "What accessories should I add?",
    "Suggest a color swap",
    "Is this right for the occasion?",
  ];

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-all hover:scale-105">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-medium">Style AI</span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          style={{ maxHeight: "520px" }}>
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="font-semibold text-sm">Drippy Style AI</span>
              <span className="text-xs opacity-70">powered by Groq</span>
            </div>
            <button onClick={() => setOpen(false)} className="hover:opacity-70 transition-opacity">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ minHeight: "280px", maxHeight: "320px" }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center mr-2 mt-1 shrink-0">
                    <Sparkles className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
                <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-secondary text-secondary-foreground rounded-bl-sm"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center mr-2 mt-1 shrink-0">
                  <Sparkles className="h-3 w-3 text-primary-foreground" />
                </div>
                <div className="bg-secondary px-3 py-2 rounded-2xl rounded-bl-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1">
              {suggestions.map((q) => (
                <button key={q} onClick={() => setInput(q)}
                  className="text-xs px-2 py-1 rounded-full border border-border hover:bg-secondary transition-colors text-muted-foreground">
                  {q}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 p-3 border-t border-border">
            <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey}
              placeholder="Ask about styling, colors, fit..."
              className="flex-1 text-sm h-9" disabled={loading} />
            <Button size="icon" className="h-9 w-9 shrink-0" onClick={sendMessage}
              disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}