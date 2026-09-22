// Lightweight password strength scorer (no external dependency).
// Scores a password 0-3: 0 = Weak, 1 = Fair, 2 = Good, 3 = Strong.

const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "123456",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty",
  "qwerty123",
  "letmein",
  "welcome",
  "welcome1",
  "admin",
  "login",
  "abc123",
  "iloveyou",
  "monkey",
  "dragon",
  "sunshine",
  "princess",
  "football",
  "baseball",
  "superman",
  "trustno1",
  "vireo",
  "guest",
]);

export type PasswordScore = 0 | 1 | 2 | 3;

export interface PasswordStrength {
  score: PasswordScore;
  label: "Weak" | "Fair" | "Good" | "Strong";
}

const LABELS = ["Weak", "Fair", "Good", "Strong"] as const;

function charClasses(password: string): number {
  let classes = 0;
  if (/[a-z]/.test(password)) classes++;
  if (/[A-Z]/.test(password)) classes++;
  if (/[0-9]/.test(password)) classes++;
  if (/[^A-Za-z0-9]/.test(password)) classes++;
  return classes;
}

function hasSequence(password: string): boolean {
  const lower = password.toLowerCase();
  for (let i = 0; i < lower.length - 2; i++) {
    const a = lower.charCodeAt(i);
    if (a + 1 === lower.charCodeAt(i + 1) && a + 2 === lower.charCodeAt(i + 2)) {
      return true;
    }
  }
  return false;
}

function hasRepeatRun(password: string): boolean {
  for (let i = 0; i < password.length - 2; i++) {
    if (password[i] === password[i + 1] && password[i] === password[i + 2]) {
      return true;
    }
  }
  return false;
}

export function scorePassword(
  password: string,
  username?: string,
): PasswordStrength {
  if (!password) return { score: 0, label: LABELS[0] };

  // Very weak baselines.
  if (password.length < 8) return { score: 0, label: LABELS[0] };
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return { score: 0, label: LABELS[0] };
  }

  // Username material inside the password adds no entropy — strip it out
  // before measuring what's left.
  const effective =
    username && username.length >= 3
      ? password.toLowerCase().split(username.toLowerCase()).join("")
      : password;

  const classes = charClasses(effective);
  const length = effective.length;

  let score = 0;
  if (length >= 8 && classes >= 2) score = 1;
  if (length >= 10 && classes >= 3) score = 2;
  if (length >= 14 && classes >= 3) score = 3;
  // Long passphrases can reach Strong with only two character classes.
  if (length >= 18 && classes >= 2) score = 3;

  // Penalize predictable patterns.
  if (score > 0 && hasRepeatRun(password)) score--;
  if (score > 0 && hasSequence(password)) score--;

  const clamped = Math.max(0, Math.min(3, score)) as PasswordScore;
  return { score: clamped, label: LABELS[clamped] };
}
