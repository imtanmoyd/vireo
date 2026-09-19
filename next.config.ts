import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Explicitly inline the public Supabase credentials at build time.
  // This Vercel deployment's client bundle was built without the
  // NEXT_PUBLIC_* env vars inlined (runtime sees them, build did not),
  // so we pass them through the config to guarantee inlining.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
};

export default nextConfig;

