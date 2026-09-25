"use client";

// TEMPORARY: guest mode — remove once core app is stable.
// The "Continue without an account" section of this panel is part of the
// temporary guest feature.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Ghost, LoaderCircle, LogIn, UserPlus } from "lucide-react";
import { createGuestSession, signIn, signUp } from "@/lib/auth";

type Mode = "signup" | "login";

export function AuthPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signup");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState<null | "auth" | "guest">(null);
  const [error, setError] = useState<string | null>(null);

  // Allow deep-linking a mode (e.g. /?mode=login from the guest banner).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "login") setMode("login");
  }, []);

  const isSignup = mode === "signup";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting("auth");
    const result = isSignup
      ? await signUp(identifier, password)
      : await signIn(identifier, password);
    setSubmitting(null);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  // TEMPORARY: guest mode — remove once core app is stable
  function handleContinueAsGuest() {
    setSubmitting("guest");
    createGuestSession();
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="auth-grid">
      {/* Primary: sign up / log in */}
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-tabs">
          <button
            type="button"
            className={isSignup ? "auth-tab active" : "auth-tab"}
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
          >
            <UserPlus size={14} />
            Sign up
          </button>
          <button
            type="button"
            className={!isSignup ? "auth-tab active" : "auth-tab"}
            onClick={() => {
              setMode("login");
              setError(null);
            }}
          >
            <LogIn size={14} />
            Log in
          </button>
        </div>

        <h2>{isSignup ? "Create your account" : "Welcome back"}</h2>
        <p className="auth-sub">
          {isSignup
            ? "One field, one password. Use an email or just a username."
            : "Log in with the email or username you chose."}
        </p>

        <div className="auth-field">
          <label htmlFor="auth-identifier">Email or username</label>
          <input
            id="auth-identifier"
            type="text"
            className="auth-input"
            placeholder="you@email.com or river"
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoCapitalize="none"
            spellCheck={false}
          />
        </div>

        <div className="auth-field">
          <label htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            type="password"
            className="auth-input"
            placeholder="At least 8 characters"
            autoComplete={isSignup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="auth-submit" disabled={submitting !== null}>
          {submitting === "auth" ? (
            <LoaderCircle className="spin" size={18} />
          ) : isSignup ? (
            <UserPlus size={18} />
          ) : (
            <LogIn size={18} />
          )}
          {isSignup ? "Create account" : "Log in"}
        </button>
      </form>

      {/* Secondary: guest mode */}
      <div className="guest-card">
        <span className="guest-card-icon">
          <Ghost size={22} />
        </span>
        <h3>Just looking around?</h3>
        <p>
          Skip the account entirely. You&apos;ll get the full dashboard with
          everything stored right in this browser.
        </p>
        <p className="guest-note">No email, no password, nothing sent anywhere.</p>
        <button
          type="button"
          className="guest-button"
          onClick={handleContinueAsGuest}
          disabled={submitting !== null}
        >
          {submitting === "guest" ? (
            <LoaderCircle className="spin" size={18} />
          ) : (
            <Ghost size={18} />
          )}
          Continue without an account
        </button>
      </div>
    </div>
  );
}
