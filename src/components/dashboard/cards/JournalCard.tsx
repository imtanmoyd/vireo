"use client";

import { useState, useEffect } from "react";
import { BookOpen, Smile, Meh, Frown, Save, Edit } from "lucide-react";
import { useAppStore } from "@/lib/data";

const MOODS = [
  { id: "great", icon: Smile, label: "Great", color: "bg-lime-400" },
  { id: "good", icon: Smile, label: "Good", color: "bg-amber-400" },
  { id: "meh", icon: Meh, label: "Meh", color: "bg-orange-400" },
  { id: "bad", icon: Frown, label: "Bad", color: "bg-rose-400" },
  { id: "awful", icon: Frown, label: "Awful", color: "bg-red-400" },
];

export function JournalCard() {
  const { session, store } = useAppStore();
  const [todayEntry, setTodayEntry] = useState<any>(null);
  const [content, setContent] = useState("");
  const [selectedMood, setSelectedMood] = useState<string>("good");
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Load today's journal entry on mount
  useEffect(() => {
    if (!store) return;
    loadTodayEntry();
  }, [store]);

  const getTodayDate = () => {
    const now = new Date();
    return now.toISOString().split("T")[0];
  };

  const loadTodayEntry = async () => {
    const s = store;
    if (!s) return;
    const today = getTodayDate();

    try {
      const entries = await s.list("journal_entries", {
        order: [{ column: "created_at", ascending: false }],
      });
      const entry = entries.find((e) => e.entry_date === today) ?? null;

      if (entry) {
        setTodayEntry(entry);
        setContent(entry.content || "");
        setSelectedMood(entry.mood || "good");
      } else {
        setTodayEntry(null);
        setContent("");
        setSelectedMood("good");
      }
    } catch (e) {
      console.error("[JournalCard] Failed to load entry:", e);
      setTodayEntry(null);
    }
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const s = store;
    if (!s) return;

    setLoading(true);
    const today = getTodayDate();

    if (todayEntry) {
      // Update existing entry
      const { error } = await s.update("journal_entries", todayEntry.id, {
        content,
        mood: selectedMood,
      });

      if (error) {
        console.error("[JournalCard] Failed to update entry:", error);
      } else {
        await loadTodayEntry();
        setIsEditing(false);
      }
    } else {
      // Create new entry
      const { error } = await s.insert("journal_entries", {
        entry_date: today,
        content,
        mood: selectedMood
      });

      if (error) {
        console.error("[JournalCard] Failed to create entry:", error);
      } else {
        await loadTodayEntry();
        setIsEditing(false);
      }
    }
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric"
      });
    }
  };

  const getCurrentMoodIcon = () => {
    const mood = MOODS.find(m => m.id === selectedMood);
    return mood ? mood.icon : Smile;
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">
          Sign in or continue as a guest to use journal
        </p>
      </div>
    );
  }

  const CurrentMoodIcon = getCurrentMoodIcon();

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 flex items-center justify-center bg-rose-400/20 dark:bg-rose-400/10 rounded-lg">
            <BookOpen size={18} className="text-rose-400" />
          </div>
          <span className="font-semibold text-lg">Journal</span>
        </div>
      </div>

      {/* Date and Mood */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-semibold">
          {formatDate(getTodayDate())}
        </div>
        <div className="flex items-center space-x-2">
          {!isEditing ? (
            <>
              <div className="flex items-center space-x-1">
                <CurrentMoodIcon size={16} className="text-accent" />
                <span className="text-xs text-accent">
                  {MOODS.find(m => m.id === selectedMood)?.label}
                </span>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 rounded hover:bg-white/10 dark:hover:bg-black/10 text-accent"
                aria-label="Edit entry"
              >
                <Edit size={14} />
              </button>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <select
                value={selectedMood}
                onChange={(e) => setSelectedMood(e.target.value)}
                className="px-2 py-1 rounded text-xs bg-white/10 dark:bg-black/10 border border-white/10 focus:outline-none focus:border-lime-400"
              >
                {MOODS.map((mood) => (
                  <option key={mood.id} value={mood.id}>
                    {mood.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Journal Content */}
      {isEditing ? (
        <form onSubmit={handleSaveEntry} className="flex-1 flex flex-col">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="How was your day? What are you grateful for?"
            className="flex-1 w-full px-3 py-2 rounded-md bg-white/10 dark:bg-black/10 border border-white/10 text-sm focus:outline-none focus:border-lime-400 resize-none"
            autoFocus
          />
          <div className="mt-4 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                loadTodayEntry();
              }}
              className="px-3 py-2 rounded-md border border-white/10 text-sm font-medium hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-2 rounded-md bg-lime-400 text-black text-sm font-medium hover:bg-lime-400/90 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      ) : content ? (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-3 rounded-md bg-white/5 dark:bg-black/5 text-sm whitespace-pre-wrap overflow-y-auto">
            {content}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <div className="text-center space-y-2">
            <BookOpen size={32} className="mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No entry for today
            </p>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Write about your day, set intentions, or note something you're grateful for.
            </p>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 rounded-md bg-lime-400 text-black text-sm font-medium hover:bg-lime-400/90"
          >
            Write today's entry
          </button>
        </div>
      )}

      {/* Mood Selection (for editing) */}
      {isEditing && (
        <div className="mt-4 pt-4 border-t border-white/10 dark:border-black/10">
          <div className="text-xs font-semibold text-muted-foreground mb-2">
            How was your day?
          </div>
          <div className="grid grid-cols-5 gap-2">
            {MOODS.map((mood) => {
              const MoodIcon = mood.icon;
              return (
                <button
                  key={mood.id}
                  type="button"
                  onClick={() => setSelectedMood(mood.id)}
                  className={`flex flex-col items-center p-2 rounded text-xs font-medium transition-all
                    ${selectedMood === mood.id
                      ? `${mood.color}/20 dark:${mood.color}/10 border-2 border-${mood.color}/50`
                      : "hover:bg-white/5 border border-transparent"}`}
                >
                  <MoodIcon size={20} className="mb-1" />
                  {mood.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
