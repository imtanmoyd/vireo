"use client";

import { createClient } from "@/lib/supabase/client";
import { AtSign, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

const CALLBACK_ERROR_MESSAGES: Record<string, string> = {
  auth_callback_failed: "Sign-in could not be completed. Please try again.",
  auth_not_configured:
    "Sign-in is not configured on this deployment yet. Supabase environment variables are missing.",
};

export function AuthButtons() {
  const [provider, setProvider] = useState<"google" | "twitter" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Surface errors passed back by /auth/callback via the ?error= query param.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("error");
    if (!code) return;
    setError(CALLBACK_ERROR_MESSAGES[code] ?? "Sign-in could not be completed.");
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  async function signIn(selectedProvider: "google" | "twitter") {
    setProvider(selectedProvider);
    setError(null);
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard`;
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: selectedProvider,
        options: { redirectTo },
      });
      if (signInError) {
        setError(signInError.message);
        setProvider(null);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Sign-in failed. Please try again.",
      );
      setProvider(null);
    }
  }

  return (
    <div className="auth-actions">
      <button className="oauth-button google-button" onClick={() => signIn("google")} disabled={provider !== null}>
        {provider === "google" ? <LoaderCircle className="spin" size={18} /> : <span className="google-g">G</span>}
        Continue with Google
      </button>
      <button className="oauth-button x-button" onClick={() => signIn("twitter")} disabled={provider !== null}>
        {provider === "twitter" ? <LoaderCircle className="spin" size={18} /> : <AtSign size={17} />}
        Continue with X
      </button>
      {error && <p className="auth-error" role="alert">{error}</p>}
    </div>
  );
}
