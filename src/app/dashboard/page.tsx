import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { BentoGrid } from "@/components/dashboard/BentoGrid";

export default async function DashboardPage() {
  // Supabase not configured on this deployment — send visitors back to the
  // landing page instead of rendering a 500.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    redirect("/?error=auth_not_configured");
  }

  const supabase = await createClient();
  await supabase.auth.getUser();

  return (
    <main className="flex h-[calc(100vh-64px)]">
      {/* Sidebar Navigation */}
      <SidebarNav />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full">
          <BentoGrid />
        </div>
      </div>
    </main>
  );
}