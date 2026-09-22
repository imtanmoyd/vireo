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
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOutSession } from "@/lib/auth";
import { useAppStore } from "@/lib/data";

const LINKS = [
  { href: "/dashboard", icon: Calendar, label: "Dashboard" },
  { href: "/todos", icon: CheckSquare, label: "Todos" },
  { href: "/habits", icon: GitCommit, label: "Habits" },
  { href: "/routines", icon: GitBranch, label: "Routines" },
  { href: "/pomodoro", icon: Timer, label: "Pomodoro" },
  { href: "/journal", icon: BookOpen, label: "Journal" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function SidebarNav() {
  const { store, loading, isGuest, username } = useAppStore();
  const router = useRouter();
  const pathname = usePathname();
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

    // Persist to the profile (Supabase for accounts, localStorage for guests)
    store?.updateProfile({ theme_prefs: { theme: newTheme } }).then();
  };

  const handleLogout = async () => {
    await signOutSession();
    router.push("/");
    router.refresh();
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const displayName = isGuest ? "Guest" : username ?? "Account";

  return (
    <aside
      className={`sticky top-0 h-screen shrink-0 bg-white/5 dark:bg-black/5 backdrop-blur-md
        transition-all duration-300 ease-in-out overflow-hidden
        ${isOpen ? "w-64" : "w-16"} border-r border-white/10 dark:border-black/10`}
    >
      <div className="flex h-full flex-col p-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-lime-400/20 dark:bg-lime-400/10">
            <Calendar size={20} />
          </span>
          <span className={`${isOpen ? "block" : "hidden"} text-xl font-bold`}>Vireo</span>
        </div>

        {/* Signed-in identity / guest badge */}
        <div className={`flex items-center gap-2 pt-2 ${isOpen ? "px-1" : "hidden"}`}>
          <span className={`h-2 w-2 rounded-full ${isGuest ? "bg-amber-400" : "bg-lime-400"}`} />
          <span className="text-xs text-muted-foreground">
            {loading ? "Loading..." : displayName}
            {isGuest ? " - guest session" : ""}
          </span>
        </div>

        {/* Navigation */}
        <nav className="mt-8 flex-1 space-y-1.5">
          {LINKS.map(({ href, icon: Icon, label }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                title={isOpen ? undefined : label}
                className={`flex items-center gap-3 rounded-md p-2.5 transition-colors ${
                  active
                    ? "bg-lime-400/10 text-lime-400"
                    : "hover:bg-lime-400/10 hover:text-lime-400 dark:hover:bg-lime-400/5"
                }`}
              >
                <Icon size={20} className="shrink-0" />
                <span className={`${isOpen ? "block" : "hidden"} text-sm font-medium`}>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 rounded-md p-2.5 transition-colors hover:bg-lime-400/10 hover:text-lime-400 dark:hover:bg-lime-400/5"
        >
          {theme === "dark" ? <Sun size={20} className="shrink-0" /> : <Moon size={20} className="shrink-0" />}
          <span className={`${isOpen ? "block" : "hidden"} text-sm font-medium`}>
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </span>
        </button>

        {/* Logout / Exit guest mode */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-md p-2.5 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut size={20} className="shrink-0" />
          <span className={`${isOpen ? "block" : "hidden"} text-sm font-medium`}>
            {isGuest ? "Exit guest mode" : "Logout"}
          </span>
        </button>
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
