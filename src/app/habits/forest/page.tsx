"use client";

import { HabitsForestView } from "@/components/dashboard/HabitsForestView";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function HabitsForestPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white/5 dark:bg-black/5 backdrop-blur-md border-b border-white/10 dark:border-black/10">
        <button
          onClick={() => window.history.back()}
          className="flex items-center space-x-2 p-2 rounded hover:bg-white/10 dark:hover:bg-black/10"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Back to Habits</span>
        </button>

        <h1 className="text-xl font-bold">Your Habit Forest</h1>

        <div className="flex items-center space-x-2">
          <Link href="/habits" className="text-sm text-lime-400">
            Habits List
          </Link>
        </div>
      </div>

      {/* Forest View Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <HabitsForestView />
      </div>
    </div>
  );
}