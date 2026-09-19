"use client";

import { createClient } from "@/lib/supabase/client";
import { AtSign, Check, LoaderCircle, Mail } from "lucide-react";
import { useEffect, useState } from "react";

const CALLBACK_ERROR_MESSAGES: Record<string, string> = {
  auth_callback_failed: "Sign-in could not be completed. Please try again.",
  auth_not_configured:
    "Sign-in is not configured on this deployment yet. Supabase environment variables are missing.",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Translate cryptic Supabase auth errors into actionable messages.
function friendlyAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("rate limit") && normalized.includes("email")) {
    return "Too many emails sent. The built-in Supabase email service allows only 2 per hour — set up custom SMTP (Authentication → Emails) or wait a while and try again.";
  }
  if (normalized.includes("not authorized")) {
    return "The built-in Supabase email service only emails project team members. Configure custom SMTP (Authentication → Emails) to email any address.";
  }
  if (normalized.includes("60 seconds")) {
    return "Please wait about a minute before requesting another sign-in link.";
  }
  return message;
}

export function AuthButtons() {
  const [provider, setProvider] = useState<"google" | "twitter" | null>(null);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
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

  async function signInWithEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });
      if (otpError) {
        setError(friendlyAuthError(otpError.message));
      } else {
        setEmailSent(true);
        setEmail("");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? friendlyAuthError(err.message)
          : "Could not send the sign-in link. Please try again.",
      );
    } finally {
      setSending(false);
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
      <form className="email-row" onSubmit={signInWithEmail}>
        <input
          type="email"
          className="email-input"
          placeholder="you@example.com"
          aria-label="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={sending || emailSent}
        />
        <button type="submit" className="oauth-button email-button" disabled={sending || emailSent}>
          {sending ? <LoaderCircle className="spin" size={18} /> : <Mail size={17} />}
          {emailSent ? "Link sent" : "Continue with email"}
        </button>
      </form>
      {emailSent && (
        <p className="auth-success" role="status">
          <Check size={13} /> Check your inbox — we sent you a sign-in link.
        </p>
      )}
      {error && <p className="auth-error" role="alert">{error}</p>}
    </div>
  );
}
