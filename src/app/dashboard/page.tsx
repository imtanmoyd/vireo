import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { BentoGrid } from "@/components/dashboard/BentoGrid";

export default async function DashboardPage() {
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