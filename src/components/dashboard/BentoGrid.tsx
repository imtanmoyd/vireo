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
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/supabase/user";
import { TodoCard } from "./cards/TodoCard";
import { CalendarCard } from "./cards/CalendarCard";
import { JournalCard } from "./cards/JournalCard";
import { PomodoroCard } from "./cards/PomodoroCard";
import { RoutinesCard } from "./cards/RoutinesCard";

// Define card types that can be added to the dashboard
const CARD_TYPES = [
  { id: "calendar", label: "Calendar", icon: Calendar, color: "bg-lime-400", component: CalendarCard },
  { id: "todos", label: "Today's Todos", icon: CheckSquare, color: "bg-violet-400", component: TodoCard },
  { id: "habits", label: "Active Habits", icon: GitCommit, color: "bg-orange-400", component: () => import("./cards/HabitsCard").then(mod => mod.HabitsCard) },
  { id: "journal", label: "Journal Prompt", icon: BookOpen, color: "bg-rose-400", component: JournalCard },
  { id: "pomodoro", label: "Pomodoro Timer", icon: Timer, color: "bg-amber-400", component: PomodoroCard },
  { id: "routines", label: "Today's Routine", icon: GitBranch, color: "bg-indigo-400", component: RoutinesCard },
];

const DEFAULT_LAYOUT = {
  calendar: { order: 0, size: "large" },
  todos: { order: 1, size: "medium" },
  habits: { order: 2, size: "medium" },
  journal: { order: 3, size: "small" },
  pomodoro: { order: 4, size: "small" },
  routines: { order: 5, size: "medium" },
};

export function BentoGrid() {
  const { user } = useUser();
  const [cards, setCards] = useState<Array<any>>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [selectedCardType, setSelectedCardType] = useState<string>("");

  // Load layout from Supabase on mount
  useEffect(() => {
    if (!user) return;

    const loadLayout = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("dashboard_layout")
        .eq("id", user.id)
        .single();

      if (!error && data?.dashboard_layout && Object.keys(data.dashboard_layout).length > 0) {
        // Initialize cards based on saved layout
        const initializedCards = Object.entries(data.dashboard_layout)
          .map(([key, value]: [string, any]) => {
            const cardInfo = CARD_TYPES.find((card) => card.id === key);
            if (!cardInfo) return null;
            return {
              ...cardInfo,
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
  }, [user]);

  // Save layout to Supabase when it changes
  const saveLayout = async (updatedCards: any[]) => {
    if (!user) return;

    const layoutToSave: any = {};
    updatedCards.forEach((card) => {
      layoutToSave[card.id] = {
        order: card.order,
        size: card.size
      };
    });

    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ dashboard_layout: layoutToSave })
      .eq("id", user.id);
  };

  const handleAddCard = () => {
    if (selectedCardType) {
      const cardInfo = CARD_TYPES.find((card) => card.id === selectedCardType);
      if (!cardInfo) return;

      const newCard = {
        ...cardInfo,
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

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-center">Please sign in to customize your dashboard</p>
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
      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6 auto-rows-[200px]">
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
                  {card.component && typeof card.component === "function" ? (
                    <div className="w-full h-full">
                      {card.component}
                    </div>
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