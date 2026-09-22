// TEMPORARY: guest mode — remove once core app is stable.
// The guest-session helpers in this file (getGuestId / createGuestSession /
// clearGuestId and the "guest" branch of AppSession) exist only for the
// temporary guest feature and should be deleted together with the rest of
// guest mode later.

import { createClient } from "@/lib/supabase/client";

export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{1,22}[a-z0-9])$/;
export const USERNAME_HINT = "3-24 characters: a-z, 0-9, dash or underscore.";

const GUEST_ID_KEY = "vireo-guest-id";

export type AppSession =
  | { kind: "user"; userId: string; username: string | null }
  | { kind: "guest"; guestId: string }
  | { kind: "none" };

/** Placeholder email so Supabase Auth works without asking for a real one.
 *  Using a real TLD (.app) prevents GoTrue from rejecting the email as invalid.
 */
export function usernameToEmail(username: string): string {
  return `${username.toLowerCase()}@users.vireo.app`;
}

export function getGuestId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(GUEST_ID_KEY);
}

export function clearGuestId(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(GUEST_ID_KEY);
}

/** Creates (or reuses) a local guest session. No Supabase account involved. */
export function createGuestSession(): AppSession {
  const existing = getGuestId();
  const guestId =
    existing ??
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `guest-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`);
  window.localStorage.setItem(GUEST_ID_KEY, guestId);
  return { kind: "guest", guestId };
}

/** Resolves the active session: signed-in user first, then local guest. */
export async function getAppSession(): Promise<AppSession> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    if (getGuestId()) clearGuestId(); // a real session always wins
    const username =
      (user.user_metadata?.username as string | undefined) ?? null;
    return { kind: "user", userId: user.id, username };
  }

  const guestId = getGuestId();
  return guestId ? { kind: "guest", guestId } : { kind: "none" };
}

export interface AuthResult {
  error: string | null;
}

export async function signUpWithUsername(
  username: string,
  password: string,
): Promise<AuthResult> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email: usernameToEmail(username),
    password,
    options: { data: { username, display_name: username } },
  });

  if (error) {
    if (/already registered/i.test(error.message)) {
      return { error: "That username is already taken. Try another one." };
    }
    return { error: error.message };
  }

  if (!data.user) {
    return {
      error:
        'Account created, but it needs email confirmation before first login. Placeholder emails can\'t receive it — disable "Confirm email" in Supabase (Authentication → Sign In / Providers → Email).',
    };
  }

  clearGuestId();

  // Best-effort profile row. The DB trigger normally creates it; this upsert
  // keeps sign-up working even if the trigger hasn't been installed yet.
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: data.user.id, username, display_name: username });
  if (profileError) {
    console.error("[auth] Failed to create profile:", profileError.message);
  }

  return { error: null };
}

export async function signInWithUsername(
  username: string,
  password: string,
): Promise<AuthResult> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });

  if (error) {
    if (/invalid login credentials/i.test(error.message)) {
      return { error: "Wrong username or password." };
    }
    if (/not confirmed/i.test(error.message)) {
      return {
        error:
          'This account needs email confirmation, which isn\'t available for placeholder emails. Disable "Confirm email" in Supabase (Authentication → Sign In / Providers → Email).',
      };
    }
    return { error: error.message };
  }

  clearGuestId();
  return { error: null };
}

/** Ends whichever session is active (real account or guest). */
export async function signOutSession(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  clearGuestId();
}
