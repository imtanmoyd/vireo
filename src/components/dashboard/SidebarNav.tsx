"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  CheckSquare,
  BookOpen,
  GitCommit,
  Timer,
  GitBranch,
  Settings,
  LogOut,
  Moon,
  Sun,
  ArrowLeft,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/supabase/user";

export function SidebarNav() {
  const { user, loading } = useUser();
  const [isOpen, setIsOpen] = useState(true);
  const [theme, setTheme] = useState<string | null>(null);

  useEffect(() => {
    // Load theme from localStorage or default to system preference
    const savedTheme = localStorage.getItem("vireo-theme");
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    } else {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      setTheme(systemTheme);
      document.documentElement.classList.toggle("dark", systemTheme === "dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("vireo-theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");

    // Persist to Supabase
    if (user) {
      const supabase = createClient();
      supabase
        .from("profiles")
        .update({ theme_prefs: { theme: newTheme } })
        .eq("id", user.id)
        .then();
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <aside className={`fixed left-0 top-0 bottom-0 w-16 bg-white/5 dark:bg-black/5 backdrop-blur-md
      transition-all duration-300 ease-in-out overflow-hidden
      ${isOpen ? "w-64" : "w-16"} z-50 border-r border-white/10 dark:border-black/10`}>
      <div className="flex h-full flex-col p-4 space-x-3">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <span className="flex h-8 w-8 items-center justify-center bg-lime-400/20 dark:bg-lime-400/10 rounded-lg">
            <Calendar size={20} />
          </span>
          <span className={`hidden ${isOpen ? "block" : "none"} font-bold text-xl`}>
            Vireo
          </span>
        </div>

        {/* Navigation */}
        <nav className="mt-8 space-y-2 flex-1">
          <Link
            href="/dashboard"
            className={`flex items-center space-x-3 p-3 rounded-md transition-colors
              ${isOpen ? "text-lg" : ""}
              ${isOpen ? "hover:bg-lime-400/10 dark:hover:bg-lime-400/5" : ""}
              ${isOpen ? "hover:text-lime-400 dark:hover:text-lime-400" : ""}
            `}
          >
            <Calendar size={24} />
            <span className={`hidden ${isOpen ? "block" : "none"}}`}>Calendar</span>
          </Link>

          <Link
            href="/todos"
            className={`flex items-center space-x-3 p-3 rounded-md transition-colors
              ${isOpen ? "text-lg" : ""}
              ${isOpen ? "hover:bg-lime-400/10 dark:hover:bg-lime-400/5" : ""}
              ${isOpen ? "hover:text-lime-400 dark:hover:text-lime-400" : ""}
            `}
          >
            <CheckSquare size={24} />
            <span className={`hidden ${isOpen ? "block" : "none"}}`}>Todos</span>
          </Link>

          <Link
            href="/journal"
            className={`flex items-center space-x-3 p-3 rounded-md transition-colors
              ${isOpen ? "text-lg" : ""}
              ${isOpen ? "hover:bg-lime-400/10 dark:hover:bg-lime-400/5" : ""}
              ${isOpen ? "hover:text-lime-400 dark:hover:text-lime-400" : ""}
            `}
          >
            <BookOpen size={24} />
            <span className={`hidden ${isOpen ? "block" : "none"}}`}>Journal</span>
          </Link>

          <Link
            href="/habits"
            className={`flex items-center space-x-3 p-3 rounded-md transition-colors
              ${isOpen ? "text-lg" : ""}
              ${isOpen ? "hover:bg-lime-400/10 dark:hover:bg-lime-400/5" : ""}
              ${isOpen ? "hover:text-lime-400 dark:hover:text-lime-400" : ""}
            `}
          >
            <GitCommit size={24} />
            <span className={`hidden ${isOpen ? "block" : "none"}}`}>Habits</span>
          </Link>

          <Link
            href="/routines"
            className={`flex items-center space-x-3 p-3 rounded-md transition-colors
              ${isOpen ? "text-lg" : ""}
              ${isOpen ? "hover:bg-lime-400/10 dark:hover:bg-lime-400/5" : ""}
              ${isOpen ? "hover:text-lime-400 dark:hover:text-lime-400" : ""}
            `}
          >
            <GitBranch size={24} />
            <span className={`hidden ${isOpen ? "block" : "none"}}`}>Routines</span>
          </Link>

          <Link
            href="/pomodoro"
            className={`flex items-center space-x-3 p-3 rounded-md transition-colors
              ${isOpen ? "text-lg" : ""}
              ${isOpen ? "hover:bg-lime-400/10 dark:hover:bg-lime-400/5" : ""}
              ${isOpen ? "hover:text-lime-400 dark:hover:text-lime-400" : ""}
            `}
          >
            <Timer size={24} />
            <span className={`hidden ${isOpen ? "block" : "none"}}`}>Pomodoro</span>
          </Link>
        </nav>

        {/* Theme Toggle */}
        <div className="mt-auto flex items-center space-x-3 p-3 rounded-md transition-colors hover:bg-lime-400/10 dark:hover:bg-lime-400/5">
          <button
            onClick={toggleTheme}
            className="flex items-center space-x-2 p-2 rounded-md hover:bg-lime-400/10 dark:hover:bg-lime-400/5"
          >
            {theme === "dark" ? <Sun size={24} /> : <Moon size={24} />}
            <span className={`hidden ${isOpen ? "block" : "none"}}`}>
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </span>
          </button>
        </div>

        {/* Logout */}
        <div className="flex items-center space-x-3 p-3 rounded-md transition-colors hover:bg-lime-400/10 dark:hover:bg-lime-400/5">
          <Link
            href="/"
            onClick={() => {
              // Handle logout (would need auth signOut)
              // For now just redirect
            }}
            className="flex items-center space-x-2 p-2 rounded-md hover:bg-lime-400/10 dark:hover:bg-lime-400/5"
          >
            <LogOut size={24} />
            <span className={`hidden ${isOpen ? "block" : "none"}}`}>Logout</span>
          </Link>
        </div>
      </div>

      {/* Collapse/Expand Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`absolute right-0 top-1/2 -translate-y-1/2 bg-white/5 dark:bg-black/5
          backdrop-blur-md w-8 h-8 rounded-l-lg flex items-center justify-center
          transition-all duration-300 ease-in-out hover:bg-lime-400/10 dark:hover:bg-lime-400/5
          border-l border-white/10 dark:border-black/10`}
        aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        {isOpen ? <ArrowLeft size={20} /> : <ArrowRight size={20} />}
      </button>
    </aside>
  );
}