"use client";

import { useState, useEffect } from "react";
import { GitCommit, Plus, Trash2, Flame, Leaf } from "lucide-react";
import { useAppStore } from "@/lib/data";

const TREE_STAGES = [
  { stage: 0, label: "Seed", threshold: 0 },
  { stage: 1, label: "Sprout", threshold: 3 },
  { stage: 2, label: "Sapling", threshold: 7 },
  { stage: 3, label: "Young Tree", threshold: 14 },
  { stage: 4, label: "Mature Tree", threshold: 30 },
  { stage: 5, label: "Blooming", threshold: 60 },
];

const HABIT_ICONS = [
  { id: "exercise", icon: "🏃", label: "Exercise" },
  { id: "read", icon: "📚", label: "Reading" },
  { id: "meditate", icon: "🧘", label: "Meditation" },
  { id: "water", icon: "💧", label: "Drink Water" },
  { id: "sleep", icon: "😴", label: "Sleep" },
  { id: "code", icon: "💻", label: "Coding" },
  { id: "write", icon: "✍️", label: "Writing" },
  { id: "music", icon: "🎵", label: "Music" },
  { id: "nature", icon: "🌿", label: "Nature" },
  { id: "learn", icon: "🧠", label: "Learning" },
];

export function HabitsCard() {
  const { session, store, ownerId } = useAppStore();
  const [habits, setHabits] = useState<any[]>([]);
  const [habitLogs, setHabitLogs] = useState<any[]>([]);
  const [showNewHabit, setShowNewHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitIcon, setNewHabitIcon] = useState("exercise");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!store || !ownerId) return;
    loadHabits();
    loadHabitLogs();
  }, [store, ownerId]);

  const loadHabits = async () => {
    const s = store;
    if (!s) return;
    try {
      const rows = await s.list("habits", {
        order: [{ column: "created_at", ascending: false }],
      });
      setHabits(rows);
    } catch (e) {
      console.error("[HabitsCard] Failed to load habits:", e);
    }
  };

  const loadHabitLogs = async () => {
    const s = store;
    if (!s) return;
    try {
      const rows = await s.list("habit_logs", {
        order: [{ column: "completed_at", ascending: false }],
      });
      setHabitLogs(rows);
    } catch (e) {
      console.error("[HabitsCard] Failed to load habit logs:", e);
    }
  };

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    const s = store;
    if (!s || !newHabitName.trim()) return;

    setLoading(true);
    const selectedIcon = HABIT_ICONS.find(h => h.id === newHabitIcon);

    const { error } = await s.insert("habits", {
      name: newHabitName,
      icon: selectedIcon?.icon || "🌱",
      target_frequency: "daily",
      tree_stage: 0,
      current_streak: 0,
      longest_streak: 0,
    });

    if (error) {
      console.error("[HabitsCard] Failed to create habit:", error);
    } else {
      setNewHabitName("");
      setNewHabitIcon("exercise");
      setShowNewHabit(false);
      await loadHabits();
    }
    setLoading(false);
  };

  const handleToggleHabitToday = async (habit: any) => {
    const s = store;
    if (!s) return;

    const today = new Date().toISOString().split("T")[0];

    // Check if already logged today (from the loaded log list)
    const existingLog = habitLogs.find(
      (log) => log.habit_id === habit.id && log.completed_at === today,
    );

    if (existingLog) {
      // Remove today's log
      const { error: removeError } = await s.remove("habit_logs", existingLog.id);
      if (removeError) console.error("[HabitsCard] Failed to remove log:", removeError);

      // Decrement streak
      const newStreak = Math.max(0, habit.current_streak - 1);
      await s.update("habits", habit.id, { current_streak: newStreak });
    } else {
      // Add today's log
      const { error: insertError } = await s.insert("habit_logs", {
        habit_id: habit.id,
        completed_at: today,
      });
      if (insertError) console.error("[HabitsCard] Failed to add log:", insertError);

      // Increment streak
      const newStreak = habit.current_streak + 1;
      const newLongest = Math.max(habit.longest_streak, newStreak);

      // Calculate tree stage based on streak
      let newTreeStage = 0;
      for (let i = TREE_STAGES.length - 1; i >= 0; i--) {
        if (newStreak >= TREE_STAGES[i].threshold) {
          newTreeStage = TREE_STAGES[i].stage;
          break;
        }
      }

      await s.update("habits", habit.id, {
        current_streak: newStreak,
        longest_streak: newLongest,
        tree_stage: newTreeStage,
      });
    }

    await loadHabits();
    await loadHabitLogs();
  };

  const handleDeleteHabit = async (habitId: string) => {
    const s = store;
    if (!s) return;

    const { error } = await s.remove("habits", habitId);
    if (error) {
      console.error("[HabitsCard] Failed to delete habit:", error);
    } else {
      await loadHabits();
    }
  };

  const isHabitCompletedToday = (habit: any) => {
    const today = new Date().toISOString().split("T")[0];
    return habitLogs.some(log => log.habit_id === habit.id && log.completed_at === today);
  };

  const getTreeStageInfo = (streak: number) => {
    for (let i = TREE_STAGES.length - 1; i >= 0; i--) {
      if (streak >= TREE_STAGES[i].threshold) {
        return TREE_STAGES[i];
      }
    }
    return TREE_STAGES[0];
  };

  const getNextThreshold = (streak: number) => {
    for (const stage of TREE_STAGES) {
      if (streak < stage.threshold) {
        return stage;
      }
    }
    return null;
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">
          Sign in or continue as a guest to track habits
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 flex items-center justify-center bg-orange-400/20 dark:bg-orange-400/10 rounded-lg">
            <GitCommit size={18} className="text-orange-400" />
          </div>
          <span className="font-semibold text-lg">Active Habits</span>
        </div>
      </div>

      {/* Habits List */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-4">
        {habits.length === 0 && !showNewHabit && (
          <div className="flex flex-col items-center justify-center h-full space-y-4 py-8">
            <GitCommit size={32} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">
              No habits yet
            </p>
            <p className="text-xs text-muted-foreground max-w-[200px] text-center">
              Create habits to build your personal garden and track daily streaks.
            </p>
          </div>
        )}

        {habits.map((habit) => {
          const stageInfo = getTreeStageInfo(habit.current_streak);
          const nextStage = getNextThreshold(habit.current_streak);
          const progress = nextStage
            ? ((habit.current_streak - stageInfo.threshold) / (nextStage.threshold - stageInfo.threshold)) * 100
            : 100;

          return (
            <div
              key={habit.id}
              className="group p-3 rounded-lg bg-white/5 dark:bg-black/5 hover:bg-white/10 dark:hover:bg-black/10 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleToggleHabitToday(habit)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all
                      ${isHabitCompletedToday(habit)
                        ? "bg-lime-400/20"
                        : "bg-white/10 dark:bg-black/10 hover:bg-lime-400/20"}`}
                  >
                    {habit.icon || "🌱"}
                  </button>
                  <div>
                    <div className="font-semibold">{habit.name}</div>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <span className="flex items-center space-x-1 text-orange-400">
                        <Flame size={12} />
                        <span>{habit.current_streak} day streak</span>
                      </span>
                      <span>·</span>
                      <span className="flex items-center space-x-1">
                        <Leaf size={12} />
                        <span>{stageInfo.label}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteHabit(habit.id)}
                  className="p-2 rounded-md hover:bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  aria-label={`Delete ${habit.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Progress to next stage */}
              {nextStage && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Next: {nextStage.label}</span>
                    <span>{nextStage.threshold - habit.current_streak} days</span>
                  </div>
                  <div className="w-full h-1 bg-white/10 dark:bg-black/10 rounded-full">
                    <div
                      className="h-full bg-orange-400 rounded-full transition-all"
                      style={{ width: `${Math.min(100, progress)}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add New Habit */}
      {!showNewHabit ? (
        <button
          onClick={() => setShowNewHabit(true)}
          className="flex items-center space-x-2 p-3 rounded-md text-accent hover:bg-lime-400/10 transition-all w-full justify-center"
        >
          <Plus size={16} />
          <span className="font-medium">Add habit</span>
        </button>
      ) : (
        <form onSubmit={handleCreateHabit} className="space-y-3 p-4 bg-white/5 dark:bg-black/5 rounded-lg">
          <input
            type="text"
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            placeholder="Habit name"
            className="w-full px-3 py-2 rounded-md bg-white/10 dark:bg-black/10 border border-white/10 text-sm focus:outline-none focus:border-lime-400"
            autoFocus
          />
          <div className="text-xs font-semibold text-muted-foreground mb-2">
            Choose an icon
          </div>
          <div className="grid grid-cols-5 gap-2 mb-3">
            {HABIT_ICONS.map((icon) => (
              <button
                key={icon.id}
                type="button"
                onClick={() => setNewHabitIcon(icon.id)}
                className={`p-2 rounded-lg text-xl transition-all ${
                  newHabitIcon === icon.id
                    ? "bg-lime-400/20 border-2 border-lime-400"
                    : "bg-white/5 dark:bg-black/5 border-2 border-transparent hover:bg-white/10"
                }`}
              >
                {icon.icon}
              </button>
            ))}
          </div>
          <div className="flex space-x-2">
            <button
              type="submit"
              disabled={!newHabitName.trim() || loading}
              className="flex-1 px-3 py-2 rounded-md bg-lime-400 text-black text-sm font-medium hover:bg-lime-400/90 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNewHabit(false);
                setNewHabitName("");
                setNewHabitIcon("exercise");
              }}
              className="flex-1 px-3 py-2 rounded-md border border-white/10 text-sm font-medium hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}