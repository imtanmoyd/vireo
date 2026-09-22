"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  CheckSquare,
  BookOpen,
  GitCommit,
  Timer,
  GitBranch,
  Plus,
  X
} from "lucide-react";
import Link from "next/link";
import { useAppStore } from "@/lib/data";
import { TodoCard } from "./cards/TodoCard";
import { CalendarCard } from "./cards/CalendarCard";
import { JournalCard } from "./cards/JournalCard";
import { PomodoroCard } from "./cards/PomodoroCard";
import { RoutinesCard } from "./cards/RoutinesCard";
import { HabitsCard } from "./cards/HabitsCard";

// Define card types that can be added to the dashboard
const CARD_TYPES = [
  { id: "calendar", label: "Calendar", icon: Calendar, color: "bg-lime-400", Component: CalendarCard },
  { id: "todos", label: "Today's Todos", icon: CheckSquare, color: "bg-violet-400", Component: TodoCard },
  { id: "habits", label: "Active Habits", icon: GitCommit, color: "bg-orange-400", Component: HabitsCard },
  { id: "journal", label: "Journal Prompt", icon: BookOpen, color: "bg-rose-400", Component: JournalCard },
  { id: "pomodoro", label: "Pomodoro Timer", icon: Timer, color: "bg-amber-400", Component: PomodoroCard },
  { id: "routines", label: "Today's Routine", icon: GitBranch, color: "bg-indigo-400", Component: RoutinesCard },
];

const DEFAULT_LAYOUT = {
  calendar: { order: 0, size: "large" },
  todos: { order: 1, size: "medium" },
  habits: { order: 2, size: "medium" },
  journal: { order: 3, size: "small" },
  pomodoro: { order: 4, size: "small" },
  routines: { order: 5, size: "medium" },
};

interface DashboardStats {
  due: number;
  habitsDone: number;
  habitsTotal: number;
  focusMinutes: number;
  blocksToday: number;
}

/** Greeting + at-a-glance counters pulled from the active data store. */
function DashboardHeader({
  store,
  username,
  isGuest,
}: {
  store: ReturnType<typeof useAppStore>["store"];
  username: string | null;
  isGuest: boolean;
}) {
  const [greeting, setGreeting] = useState("Welcome back");
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
  }, []);

  useEffect(() => {
    const s = store;
    if (!s) return;
    let cancelled = false;
    (async () => {
      try {
        const today = new Date();
        const todayIso = today.toISOString().split("T")[0];
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        const startOfToday = new Date(today);
        startOfToday.setHours(0, 0, 0, 0);
        const dow = (today.getDay() + 6) % 7;

        const [todos, habits, habitLogs, sessions, blocks] = await Promise.all([
          s.list<{ due_date: string | null; is_complete: boolean }>("todos"),
          s.list<{ id: string }>("habits"),
          s.list<{ habit_id: string; completed_at: string }>("habit_logs"),
          s.list<{
            started_at: string;
            duration_minutes: number;
            type: string | null;
            completed: boolean;
          }>("pomodoro_sessions"),
          s.list<{ day_of_week: number }>("routine_blocks"),
        ]);
        if (cancelled) return;

        const due = todos.filter(
          (t) => !t.is_complete && t.due_date && new Date(t.due_date).getTime() <= todayEnd.getTime(),
        ).length;
        const doneSet = new Set(
          habitLogs.filter((l) => l.completed_at === todayIso).map((l) => l.habit_id),
        );
        const focusMinutes = sessions
          .filter(
            (x) =>
              x.completed &&
              x.type === "focus" &&
              new Date(x.started_at).getTime() >= startOfToday.getTime(),
          )
          .reduce((sum, x) => sum + (x.duration_minutes ?? 0), 0);
        const blocksToday = blocks.filter((b) => b.day_of_week === dow).length;

        setStats({ due, habitsDone: doneSet.size, habitsTotal: habits.length, focusMinutes, blocksToday });
      } catch (e) {
        console.error("[BentoGrid] Failed to load stats:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [store]);

  const displayName = isGuest ? "guest" : username ?? "there";

  return (
    <div className="space-y-3 px-6 pt-6">
      <div>
        <h1 className="text-xl font-bold">
          {greeting}, <span className="text-accent">{displayName}</span>
        </h1>
        <p className="text-xs text-muted-foreground">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatPill icon={CheckSquare} label="Due today" value={stats ? stats.due : "-"} />
        <StatPill
          icon={GitCommit}
          label="Habits today"
          value={stats ? `${stats.habitsDone}/${stats.habitsTotal}` : "-"}
        />
        <StatPill icon={Timer} label="Focus today" value={stats ? `${stats.focusMinutes}m` : "-"} />
        <StatPill icon={GitBranch} label="Blocks today" value={stats ? stats.blocksToday : "-"} />
      </div>
    </div>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md dark:border-black/10 dark:bg-black/5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon size={13} className="text-accent" />
        {label}
      </div>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

export function BentoGrid() {
  const { session, store, loading, isGuest, username } = useAppStore();
  const [cards, setCards] = useState<Array<any>>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [selectedCardType, setSelectedCardType] = useState<string>("");

  // Load the saved dashboard layout on mount (from the profile).
  useEffect(() => {
    if (!store) return;

    const loadLayout = async () => {
      const profile = await store.getProfile<{ dashboard_layout?: Record<string, any> } | null>();
      const saved = profile?.dashboard_layout;

      if (saved && Object.keys(saved).length > 0) {
        // Initialize cards based on saved layout
        const initializedCards = Object.entries(saved)
          .map(([key, value]: [string, any]) => {
            const cardInfo = CARD_TYPES.find((card) => card.id === key);
            if (!cardInfo) return null;
            return {
              ...cardInfo,
              Component: cardInfo.Component,
              order: value.order ?? 0,
              size: value.size ?? "medium"
            };
          })
          .filter(Boolean)
          .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));
        setCards(initializedCards as any);
      } else {
        // Use default layout
        const initializedCards = Object.entries(DEFAULT_LAYOUT)
          .map(([key, value]) => {
            const cardInfo = CARD_TYPES.find((card) => card.id === key);
            if (!cardInfo) return null;
            return {
              ...cardInfo,
              Component: cardInfo.Component,
              order: value.order,
              size: value.size
            };
          })
          .filter(Boolean)
          .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));
        setCards(initializedCards as any);
      }
    };

    loadLayout();
  }, [store]);

  // Save layout to the profile when it changes
  const saveLayout = async (updatedCards: any[]) => {
    if (!store) return;

    const layoutToSave: any = {};
    updatedCards.forEach((card) => {
      layoutToSave[card.id] = {
        order: card.order,
        size: card.size
      };
    });

    const { error } = await store.updateProfile({ dashboard_layout: layoutToSave });
    if (error) console.error("[BentoGrid] Failed to save layout:", error);
  };

  const handleAddCard = () => {
    if (selectedCardType) {
      const cardInfo = CARD_TYPES.find((card) => card.id === selectedCardType);
      if (!cardInfo) return;

      const newCard = {
        ...cardInfo,
        Component: cardInfo.Component,
        order: cards.length,
        size: "medium"
      };

      const updatedCards = [...cards, newCard];
      setCards(updatedCards);
      saveLayout(updatedCards);
      setShowAddCardModal(false);
      setSelectedCardType("");
    }
  };

  const handleRemoveCard = (cardId: string) => {
    const updatedCards = cards
      .filter((card) => card.id !== cardId)
      .map((card, index) => ({ ...card, order: index }));
    setCards(updatedCards);
    saveLayout(updatedCards);
  };

  const moveCard = (cardId: string, direction: "up" | "down") => {
    const index = cards.findIndex((card) => card.id === cardId);
    if (index === -1) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === cards.length - 1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const updatedCards = [...cards];
    [updatedCards[index], updatedCards[newIndex]] = [updatedCards[newIndex], updatedCards[index]];

    // Update order values
    updatedCards.forEach((card, i) => {
      card.order = i;
    });

    setCards(updatedCards);
    saveLayout(updatedCards);
  };

  const changeSizeCard = (cardId: string, size: "small" | "medium" | "large") => {
    const updatedCards = cards.map((card) =>
      card.id === cardId ? { ...card, size } : card
    );
    setCards(updatedCards);
    saveLayout(updatedCards);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-400" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4">
        <p className="text-center text-muted-foreground">
          Sign in or continue as a guest to customize your dashboard.
        </p>
        <Link href="/" className="text-sm font-medium text-accent">
          Back to sign in
        </Link>
      </div>
    );
  }

  const getSizeClass = (size: string) => {
    switch (size) {
      case "small":
        return "col-span-1 row-span-1";
      case "medium":
        return "col-span-2 row-span-1";
      case "large":
        return "col-span-3 row-span-2";
      default:
        return "col-span-2 row-span-1";
    }
  };

  return (
    <div className="relative h-full w-full overflow-auto">
      {/* TEMPORARY: guest mode — remove once core app is stable */}
      {isGuest && (
        <div className="guest-banner" role="status">
          <span>
            <strong>You&apos;re using Vireo as a guest</strong> — your data is
            stored only in this browser and will be lost if you clear your
            cache. Sign up to save it permanently.
          </span>
          <Link href="/?mode=signup">Sign up now</Link>
        </div>
      )}
      {/* Greeting + KPI stats */}
      <DashboardHeader store={store} username={username} isGuest={isGuest} />

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6 pt-4 auto-rows-[200px]">
        {cards.map((card, index) => {
          const IconComponent = card.icon;
          return (
            <div
              key={card.id}
              className={`${getSizeClass(card.size)}
                bg-white/10 dark:bg-black/10 backdrop-blur-md
                rounded-xl border border-white/10 dark:border-black/10
                transition-all duration-200 hover:shadow-lg
                ${isEditing ? "border-lime-400" : ""}
                relative group`}
            >
              <div className="flex h-full flex-col p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`h-8 w-8 flex items-center justify-center
                                   rounded-lg ${card.color}/20 dark:${card.color}/10`}>
                      <IconComponent size={18} className="text-white" />
                    </div>
                    <span className={`font-semibold text-lg ${isEditing ? "text-lime-400" : ""}`}>
                      {card.label}
                    </span>
                  </div>
                  {isEditing && (
                    <button
                      onClick={() => handleRemoveCard(card.id)}
                      className="p-2 rounded-md hover:bg-red-500/20 dark:hover:bg-red-500/10"
                      aria-label={`Remove ${card.label}`}
                    >
                      <X size={18} className="text-red-400" />
                    </button>
                  )}
                </div>

                {/* Card content - render actual component if available */}
                <div className="flex-1 overflow-hidden">
                  {card.Component ? (
                    <card.Component />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-muted-foreground">
                        {card.label} coming soon...
                      </p>
                    </div>
                  )}
                </div>

                {/* Edit controls */}
                {isEditing && (
                  <div className="absolute bottom-2 right-2 flex items-center space-x-2 bg-black/50 p-2 rounded-lg">
                    <button
                      onClick={() => moveCard(card.id, "up")}
                      disabled={index === 0}
                      className="p-1 rounded hover:bg-lime-400/20 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveCard(card.id, "down")}
                      disabled={index === cards.length - 1}
                      className="p-1 rounded hover:bg-lime-400/20 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <select
                      value={card.size}
                      onChange={(e) => changeSizeCard(card.id, e.target.value as any)}
                      className="bg-black/70 text-white text-xs rounded px-2 py-1 border border-white/10"
                    >
                      <option value="small">S</option>
                      <option value="medium">M</option>
                      <option value="large">L</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Add Card Button */}
        {isEditing && (
          <div
            onClick={() => setShowAddCardModal(true)}
            className="col-span-1 row-span-1 bg-white/5 dark:bg-black/5 backdrop-blur-md
                     rounded-xl border border-dashed border-white/20 dark:border-black/20
                     flex items-center justify-center cursor-pointer
                     hover:bg-lime-400/10 dark:hover:bg-lime-400/5
                     transition-all duration-200"
          >
            <div className="flex flex-col items-center space-y-2">
              <div className="h-12 w-12 flex items-center justify-center bg-lime-400/20 dark:bg-lime-400/10 rounded-lg">
                <Plus size={24} className="text-lime-400" />
              </div>
              <span className="text-sm text-lime-400 font-medium">Add Card</span>
            </div>
          </div>
        )}
      </div>

      {/* Add Card Modal */}
      {showAddCardModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-96 max-w-md border border-white/10">
            <h2 className="text-xl font-bold mb-4">Add New Card</h2>
            <div className="space-y-3">
              {CARD_TYPES.filter(
                (cardType) => !cards.some((card) => card.id === cardType.id)
              ).map((cardType) => {
                const IconComponent = cardType.icon;
                return (
                  <button
                    key={cardType.id}
                    onClick={() => setSelectedCardType(cardType.id)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-md border
                               ${selectedCardType === cardType.id
                                 ? "border-lime-400 bg-lime-400/10 dark:bg-lime-400/5"
                                 : "border-white/10 dark:border-black/10 hover:bg-lime-400/5"}`}
                  >
                    <div className={`h-8 w-8 flex items-center justify-center
                                   ${cardType.color}/20 dark:${cardType.color}/10 rounded-lg`}>
                      <IconComponent size={18} className="text-white" />
                    </div>
                    <span className={`font-medium ${selectedCardType === cardType.id
                                  ? "text-lime-400"
                                  : ""}`}>
                      {cardType.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddCardModal(false);
                  setSelectedCardType("");
                }}
                className="px-4 py-2 rounded-md border border-white/10 dark:border-black/10 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCard}
                className="px-4 py-2 rounded-md bg-lime-400 text-black hover:bg-lime-400/90 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!selectedCardType}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Mode Toggle */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`px-6 py-3 rounded-full font-medium shadow-lg transition-all
                     ${isEditing
                       ? "bg-lime-400 text-black hover:bg-lime-400/90"
                       : "bg-white/10 dark:bg-black/10 backdrop-blur-md border border-white/10 hover:bg-lime-400/20"}`}
        >
          {isEditing ? "Done Editing" : "Customize Dashboard"}
        </button>
      </div>
    </div>
  );
}