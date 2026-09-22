"use client";

// TEMPORARY: guest mode — remove once core app is stable.
// The "Continue without an account" section of this panel is part of the
// temporary guest feature.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Ghost, LoaderCircle, LogIn, UserPlus } from "lucide-react";
import {
  USERNAME_HINT,
  USERNAME_PATTERN,
  createGuestSession,
  signInWithUsername,
  signUpWithUsername,
} from "@/lib/auth";
import { scorePassword } from "@/lib/password-strength";

type Mode = "signup" | "login";

const STRENGTH_COLORS = ["#ef4444", "#fb923c", "#84cc16", "#22c55e"];

function StrengthMeter({
  password,
  username,
}: {
  password: string;
  username: string;
}) {
  const strength = useMemo(
    () => scorePassword(password, username || undefined),
    [password, username],
  );

  return (
    <div className="strength">
      <div className="strength-track" aria-hidden="true">
        {[0, 1, 2, 3].map((segment) => (
          <span
            key={segment}
            className="strength-segment"
            style={
              segment <= strength.score && password.length > 0
                ? { background: STRENGTH_COLORS[strength.score] }
                : undefined
            }
          />
        ))}
      </div>
      <div className="strength-meta">
        <span>
          {password.length === 0
            ? "Use 8+ characters with a mix of letters, numbers and symbols."
            : strength.score < 2
              ? "Choose a stronger password to continue."
              : `Password strength: ${strength.label}`}
        </span>
        <span>{strength.label}</span>
      </div>
    </div>
  );
}

export function AuthPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signup");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState<null | "auth" | "guest">(null);
  const [error, setError] = useState<string | null>(null);

  // Allow deep-linking a mode (e.g. /?mode=login from the guest banner).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "login") setMode("login");
  }, []);

  const isSignup = mode === "signup";
  const normalizedUsername = username.trim().toLowerCase();
  const usernameValid = USERNAME_PATTERN.test(normalizedUsername);
  const strength = useMemo(
    () => scorePassword(password, normalizedUsername || undefined),
    [password, normalizedUsername],
  );
  const passwordsMatch = password === confirm;
  const strengthOk = strength.score >= 2; // Good or Strong

  const fieldErrors: string[] = [];
  if (username.length > 0 && !usernameValid) {
    fieldErrors.push(`Invalid username. ${USERNAME_HINT}`);
  }
  if (isSignup && confirm.length > 0 && !passwordsMatch) {
    fieldErrors.push("Passwords don't match.");
  }
  if (isSignup && password.length > 0 && !strengthOk) {
    fieldErrors.push("Choose a stronger password to continue.");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!usernameValid) {
      setError(`Invalid username. ${USERNAME_HINT}`);
      return;
    }
    if (isSignup && !strengthOk) {
      setError("Choose a stronger password to continue.");
      return;
    }
    if (isSignup && !passwordsMatch) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting("auth");
    const result = isSignup
      ? await signUpWithUsername(normalizedUsername, password)
      : await signInWithUsername(normalizedUsername, password);
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
        <h2>{isSignup ? "Create your account" : "Welcome back"}</h2>
        <p className="auth-sub">
          {isSignup
            ? "Pick a username and a strong password. No email required."
            : "Log in with the username and password you chose."}
        </p>

        <div className="auth-field">
          <label htmlFor="auth-username">Username</label>
          <input
            id="auth-username"
            type="text"
            className="auth-input"
            placeholder="e.g. river"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
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
            placeholder="••••••••••••"
            autoComplete={isSignup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {isSignup && (
            <StrengthMeter password={password} username={normalizedUsername} />
          )}
        </div>

        {isSignup && (
          <div className="auth-field">
            <label htmlFor="auth-confirm">Confirm password</label>
            <input
              id="auth-confirm"
              type="password"
              className="auth-input"
              placeholder="Repeat the password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        )}

        {(fieldErrors.length > 0 || error) && (
          <p className="auth-error" role="alert">
            {error ?? fieldErrors[0]}
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
          {isSignup ? "Sign up" : "Log in"}
        </button>

        <button
          type="button"
          className="auth-switch"
          onClick={() => {
            setMode(isSignup ? "login" : "signup");
            setError(null);
          }}
        >
          {isSignup
            ? "Already have an account? Log in"
            : "New to Vireo? Sign up"}
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

