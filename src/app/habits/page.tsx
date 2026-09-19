import { HabitsCard } from "@/components/dashboard/cards/HabitsCard";
import { HabitsForestView } from "@/components/dashboard/HabitsForestView";
import { Leaf } from "lucide-react";
import Link from "next/link";

export default function HabitsPage() {
  return (
    <div className="min-h-[calc(100vh-64px)]">
      {/* Habits Card (compact version for dashboard) */}
      <div className="p-6">
        <HabitsCard />
      </div>

      {/* Forest View Button */}
      <div className="flex justify-center items-center px-6 py-4 border-t border-white/10 dark:border-black/10">
        <Link
          href="/habits/forest"
          className="flex items-center space-x-2 px-4 py-2 rounded-md bg-lime-400/20 dark:bg-lime-400/10 hover:bg-lime-400/30 text-lime-400 font-medium"
        >
          <Leaf size={20} />
          <span>View Your Forest</span>
        </Link>
      </div>
    </div>
  );
}