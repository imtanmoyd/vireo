import Link from "next/link";
import { ArrowUpRight, Leaf } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { BentoGrid } from "@/components/dashboard/BentoGrid";
import { useUser } from "@/lib/supabase/user";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const name = user?.user_metadata?.full_name?.split(" ")[0] ?? "there";

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