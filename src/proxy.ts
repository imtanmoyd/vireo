import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session and copies updated auth cookies onto
 * the outgoing response.
 *
 * Next.js 16 note: the `middleware.ts` convention was deprecated and renamed
 * to `proxy.ts`; the exported function must be named `proxy` (or be the
 * default export). See docs: app/api-reference/file-conventions/proxy.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Nothing to do without credentials — let the request pass through.
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  // Skip the auth round-trip entirely for visitors without a session.
  const hasAuthCookies = request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-"));

  if (!hasAuthCookies) {
    return response;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    // Verifies the session and refreshes the auth cookies if needed.
    await supabase.auth.getUser();
  } catch (error) {
    // Never let a Supabase outage take the whole site down; the request
    // continues with whatever cookies were already present.
    console.error("[proxy] Supabase session refresh failed:", error);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
