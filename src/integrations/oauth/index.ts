// Native Supabase Google OAuth — no Lovable dependency
import { supabase } from "../supabase/client";

export const oauthSignIn = async (
  provider: "google" | "apple",
  opts?: { redirect_uri?: string }
) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: opts?.redirect_uri ?? window.location.origin,
    },
  });
  return { data, error };
};
