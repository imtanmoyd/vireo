"use client";

import { createClient } from "@/lib/supabase/client";
import { AtSign, LoaderCircle } from "lucide-react";
import { useState } from "react";

export function AuthButtons() {
  const [provider, setProvider] = useState<"google" | "twitter" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(selectedProvider: "google" | "twitter") {
    setProvider(selectedProvider);
    setError(null);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard`;
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: selectedProvider,
      options: { redirectTo },
    });
    if (signInError) {
      setProvider(null);
      setError(signInError.message);
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
