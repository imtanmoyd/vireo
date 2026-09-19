"use client";

import { useState, useEffect } from "react";
import { GitCommit, Plus, Trash2, Flame, Leaf } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/supabase/user";

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
  const { user } = useUser();
  const [habits, setHabits] = useState<any[]>([]);
  const [habitLogs, setHabitLogs] = useState<any[]>([]);
  const [showNewHabit, setShowNewHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitIcon, setNewHabitIcon] = useState("exercise");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadHabits();
    loadHabitLogs();
  }, [user]);

  const loadHabits = async () => {
    if (!user) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setHabits(data);
    }
  };

  const loadHabitLogs = async () => {
    if (!user) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("habit_logs")
      .select("*, habits!inner(name, icon)")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false });

    if (!error && data) {
      setHabitLogs(data);
    }
  };

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newHabitName.trim()) return;

    setLoading(true);
    const supabase = createClient();
    const selectedIcon = HABIT_ICONS.find(h => h.id === newHabitIcon);

    const { error } = await supabase
      .from("habits")
      .insert({
        user_id: user.id,
        name: newHabitName,
        icon: selectedIcon?.icon || "🌱",
        target_frequency: "daily",
        tree_stage: 0,
        current_streak: 0,
        longest_streak: 0,
      });

    if (!error) {
      setNewHabitName("");
      setNewHabitIcon("exercise");
      setShowNewHabit(false);
      await loadHabits();
    }
    setLoading(false);
  };

  const handleToggleHabitToday = async (habit: any) => {
    if (!user) return;

    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    // Check if already logged today
    const { data: existingLog, error } = await supabase
      .from("habit_logs")
      .select("*")
      .eq("habit_id", habit.id)
      .eq("completed_at", today)
      .single();

    if (existingLog) {
      // Remove today's log
      await supabase
        .from("habit_logs")
        .delete()
        .eq("id", existingLog.id);

      // Decrement streak
      const newStreak = Math.max(0, habit.current_streak - 1);
      await supabase
        .from("habits")
        .update({ current_streak: newStreak })
        .eq("id", habit.id);
    } else {
      // Add today's log
      await supabase
        .from("habit_logs")
        .insert({
          habit_id: habit.id,
          user_id: user.id,
          completed_at: today,
        });

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

      await supabase
        .from("habits")
        .update({
          current_streak: newStreak,
          longest_streak: newLongest,
          tree_stage: newTreeStage,
        })
        .eq("id", habit.id);
    }

    await loadHabits();
    await loadHabitLogs();
  };

  const handleDeleteHabit = async (habitId: string) => {
    if (!user) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("habits")
      .delete()
      .eq("id", habitId)
      .eq("user_id", user.id);

    if (!error) {
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

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">Sign in to track habits</p>
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
          className="flex items-center space-x-2 p-3 rounded-md text-lime-400 hover:bg-lime-400/10 transition-all w-full justify-center"
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