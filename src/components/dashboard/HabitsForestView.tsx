"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Leaf, RefreshCw, Flame } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/supabase/user";

const TREE_STAGES = [
  { stage: 0, label: "Seed", threshold: 0, color: "bg-green-500/20" },
  { stage: 1, label: "Sprout", threshold: 3, color: "bg-green-400/20" },
  { stage: 2, label: "Sapling", threshold: 7, color: "bg-green-300/20" },
  { stage: 3, label: "Young Tree", threshold: 14, color: "bg-lime-400/20" },
  { stage: 4, label: "Mature Tree", threshold: 30, color: "bg-lime-300/20" },
  { stage: 5, label: "Blooming", threshold: 60, color: "bg-rose-400/20" },
];

export function HabitsForestView() {
  const { user } = useUser();
  const [habits, setHabits] = useState<any[]>([]);
  const [habitLogs, setHabitLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, selectedDate]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    const supabase = createClient();

    // Load habits
    const { data: habitsData } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // Load habit logs for selected date
    const { data: logsData } = await supabase
      .from("habit_logs")
      .select("*, habits!inner(name, icon)")
      .eq("user_id", user.id)
      .eq("completed_at", selectedDate)
      .order("created_at", { ascending: false });

    if (habitsData) setHabits(habitsData);
    if (logsData) setHabitLogs(logsData);
    setLoading(false);
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
  };

  const handleToggleHabit = async (habitId: string) => {
    if (!user) return;

    const supabase = createClient();

    // Check if already logged for selected date
    const { data: existingLog } = await supabase
      .from("habit_logs")
      .select("*")
      .eq("habit_id", habitId)
      .eq("completed_at", selectedDate)
      .single();

    if (existingLog) {
      // Remove log
      await supabase
        .from("habit_logs")
        .delete()
        .eq("id", existingLog.id);
    } else {
      // Add log
      await supabase
        .from("habit_logs")
        .insert({
          habit_id: habitId,
          user_id: user.id,
          completed_at: selectedDate,
        });
    }

    // Recalculate streaks and tree stages for all habits
    await recalculateHabitStats();
    loadData();
  };

  const recalculateHabitStats = async () => {
    if (!user) return;
    const supabase = createClient();

    // Get all logs for user to calculate streaks
    const { data: allLogs } = await supabase
      .from("habit_logs")
      .select("habit_id, completed_at")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: true });

    if (!allLogs) return;

    // Group logs by habit
    const logsByHabit: Record<string, string[]> = {};
    allLogs.forEach((log) => {
      if (!logsByHabit[log.habit_id]) {
        logsByHabit[log.habit_id] = [];
      }
      logsByHabit[log.habit_id].push(log.completed_at);
    });

    // Update each habit's streak and tree stage
    const updates = habits.map((habit) => {
      const habitLogs = logsByHabit[habit.id] || [];
      let currentStreak = 0;
      let longestStreak = 0;

      // Calculate current streak (consecutive days up to today)
      const today = new Date().toISOString().split("T")[0];
      const sortedLogs = [...habitLogs].sort((a, b) =>
        new Date(b).getTime() - new Date(a).getTime()
      );

      let streak = 0;
      let expectedDate = new Date(today);

      for (const logDate of sortedLogs) {
        const logDay = new Date(logDate);
        logDay.setHours(0, 0, 0, 0);

        if (
          logDay.getTime() === expectedDate.getTime() ||
          (streak === 0 &&
           logDay.toISOString().split("T")[0] === today)
        ) {
          streak++;
          expectedDate.setDate(expectedDate.getDate() - 1);
        } else {
          break;
        }
      }

      currentStreak = streak;

      // Calculate longest streak (any consecutive period)
      if (habitLogs.length > 0) {
        const dates = habitLogs
          .map((date) => new Date(date))
          .sort((a, b) => a.getTime() - b.getTime());

        let maxStreak = 0;
        let currentStreakCalc = 1;

        for (let i = 1; i < dates.length; i++) {
          const prevDay = dates[i - 1];
          const currDay = dates[i];

          const diffTime = currDay.getTime() - prevDay.getTime();
          const diffDays = diffTime / (1000 * 60 * 60 * 24);

          if (diffDays === 1) {
            currentStreakCalc++;
            maxStreak = Math.max(maxStreak, currentStreakCalc);
          } else {
            currentStreakCalc = 1;
          }
        }

        longestStreak = Math.max(maxStreak, currentStreakCalc);
      }

      // Determine tree stage
      let treeStage = 0;
      for (let i = TREE_STAGES.length - 1; i >= 0; i--) {
        if (currentStreak >= TREE_STAGES[i].threshold) {
          treeStage = TREE_STAGES[i].stage;
          break;
        }
      }

      return {
        id: habit.id,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        tree_stage: treeStage,
      };
    });

    // Batch update habits
    for (const update of updates) {
      await supabase
        .from("habits")
        .update(update)
        .eq("id", update.id);
    }
  };

  const getTreeStageInfo = (streak: number) => {
    for (let i = TREE_STAGES.length - 1; i >= 0; i--) {
      if (streak >= TREE_STAGES[i].threshold) {
        return TREE_STAGES[i];
      }
    }
    return TREE_STAGES[0];
  };

  const isHabitCompletedOnDate = (habitId: string, date: string) => {
    return habitLogs.some(
      (log) => log.habit_id === habitId && log.completed_at === date
    );
  };

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-center">Please sign in to view your habit forest</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-400"/>
      </div>
    );
  }

  // Calculate today's completion stats
  const today = new Date().toISOString().split("T")[0];
  const completedToday = habits.filter((h) =>
    isHabitCompletedOnDate(h.id, today)
  ).length;
  const totalToday = habits.length;

  return (
    <div className="min-h-full bg-white dark:bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white/5 dark:bg-black/5 backdrop-blur-md border-b border-white/10 dark:border-black/10">
        <button
          onClick={() => window.history.back()}
          className="flex items-center space-x-2 p-2 rounded hover:bg-white/10 dark:hover:bg-black/10"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Back to Habits</span>
        </button>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Leaf size={20} className="text-lime-400" />
            <span className="text-sm font-semibold">{completedToday}/{totalToday}</span>
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="px-3 py-2 rounded-md bg-white/10 dark:bg-black/10 border border-white/10 text-sm focus:outline-none focus:border-lime-400"
          />

          <button
            onClick={() => {
              setSelectedDate(new Date().toISOString().split("T")[0]);
            }}
            className="px-3 py-2 rounded-md bg-lime-400/20 dark:bg-lime-400/10 hover:bg-lime-400/30 text-lime-400 font-medium"
          >
            Today
          </button>

          <button
            onClick={() => {
              setLoading(true);
              recalculateHabitStats().then(() => loadData());
            }}
            className="px-3 py-2 rounded-md bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Stats Summary */}
        <div className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center space-x-3 p-3 rounded bg-white/10 dark:bg-black/10">
              <Leaf size={20} className="text-lime-400" />
              <div>
                <span className="block font-medium">Today's Completion</span>
                <span className="block text-xs text-muted-foreground">
                  {completedToday}/{totalToday} habits
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded bg-white/10 dark:bg-black/10">
              <Flame size={20} className="text-orange-400" />
              <div>
                <span className="block font-medium">Current Streak</span>
                <span className="block text-xs text-muted-foreground">
                  {Math.max(...habits.map(h => h.current_streak || 0))} days
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded bg-white/10 dark:bg-black/10">
              <Leaf size={20} className="text-rose-400" />
              <div>
                <span className="block font-medium">Best Streak</span>
                <span className="block text-xs text-muted-foreground">
                  {Math.max(...habits.map(h => h.longest_streak || 0))} days
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded bg-white/10 dark:bg-black/10">
              <Leaf size={20} className="text-amber-400" />
              <div>
                <span className="block font-medium">Habits in Forest</span>
                <span className="block text-xs text-muted-foreground">
                  {habits.filter(h => h.tree_stage > 0).length}/{habits.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Forest View */}
        <div className="space-y-8">
          <h2 className="text-2xl font-bold mb-6">
            Your Habit Forest
          </h2>

          {habits.length === 0 ? (
            <div className="text-center py-12">
              <Leaf size={48} className="mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">
                No habits yet. Add some habits to grow your forest!
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Complete habits daily to watch your trees grow from seeds to blooming trees.
              </p>
            </div>
          ) : (
            <div className="grid gap-6">
              {/* Mobile: 2 columns, Tablet: 3 columns, Desktop: 4-5 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {habits.map((habit) => {
                  const stageInfo = getTreeStageInfo(habit.current_streak);
                  const isCompletedToday = isHabitCompletedOnDate(
                    habit.id,
                    selectedDate
                  );

                  return (
                    <div
                      key={habit.id}
                      className="group relative"
                    >
                      {/* Tree Container */}
                      <div className="aspect-w-1 aspect-h-1 w-full bg-white/5 dark:bg-black/10 rounded-xl overflow-hidden border border-white/10 dark:border-black/10 hover:shadow-lg transition-all duration-300">
                        {/* Tree SVG */}
                        <div className="relative h-full w-full flex items-center justify-center">
                          <svg
                            className="w-24 h-24"
                            viewBox="0 0 100 100"
                            preserveAspectRatio="xMidYMid meet"
                          >
                            {/* Ground */}
                            <rect
                              x="0"
                              y="90"
                              width="100"
                              height="10"
                              fill="url(#ground-gradient)"
                            />

                            {/* Trunk */}
                            <rect
                              x="45"
                              y={50 - (habit.tree_stage * 5)}
                              width="10"
                              height={20 + (habit.tree_stage * 10)}
                              fill="url(#trunk-gradient)"
                              rx="2"
                            />

                            {/* Foliage based on stage */}
                            {habit.tree_stage >= 1 && (
                              <circle
                                cx="50"
                                cy={35 - (habit.tree_stage * 3)}
                                r={15 + (habit.tree_stage * 2)}
                                fill="url(#foliage-gradient)"
                              />
                            )}

                            {/* Blooms for stage 5 */}
                            {habit.tree_stage === 5 && (
                              <>
                                <circle cx="40" cy="20" r="3" fill="#ff6b6b" />
                                <circle cx="60" cy="25" r="2" fill="#ffd93d" />
                                <circle cx="35" cy="35" r="2" fill="#6bcb77" />
                                <circle cx="65" cy="30" r="3" fill="#4d96ff" />
                                <circle cx="55" cy="15" r="2" fill="#ff6b6b" />
                              </>
                            )}

                            {/* Sun */}
                            <circle cx="85" cy="15" r="8" fill="#fbbf24" />
                          </svg>

                          {/* Defs for gradients */}
                          <defs>
                            <linearGradient id="ground-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" style={{ stopColor: "#65655f", stopOpacity: 1 }} />
                              <stop offset="100%" style={{ stopColor: "#4a4a42", stopOpacity: 1 }} />
                            </linearGradient>

                            <linearGradient id="trunk-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" style={{ stopColor: "#8b5e3c", stopOpacity: 1 }} />
                              <stop offset="100%" style={{ stopColor: "#6f4e37", stopOpacity: 1 }} />
                            </linearGradient>

                            <linearGradient id="foliage-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" style={{ stopColor: "#16a34a", stopOpacity: 0.8 }} />
                              <stop offset="100%" style={{ stopColor: "#22c55e", stopOpacity: 0.6 }} />
                            </linearGradient>
                          </defs>
                        </div>
                      </div>

                      {/* Tree Info */}
                      <div className="mt-4 text-center space-y-2">
                        <h3 className="font-semibold text-lg">{habit.name}</h3>

                        <div className="flex items-center justify-center space-x-2 text-xs">
                          <div className="flex items-center space-x-1">
                            <Leaf size={14} className="text-lime-400" />
                            <span>{habit.current_streak} day streak</span>
                          </div>
                          <span className="text-muted-foreground">·</span>
                          <div className="flex items-center space-x-1">
                            <Leaf size={14} className={stageInfo.color.replace("/20", "")} />
                            <span>{stageInfo.label}</span>
                          </div>
                        </div>

                        {/* Progress to next stage */}
                        {habit.tree_stage < 5 && (
                          <div className="mt-2 w-full h-1 bg-white/10 dark:bg-black/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-lime-400 transition-all duration-1000"
                              style={{
                                width: `${Math.min(
                                  100,
                                  ((habit.current_streak - stageInfo.threshold) /
                                   ((getNextThreshold(habit.current_streak)?.threshold ?? stageInfo.threshold + 1) - stageInfo.threshold)) * 100
                                )}%`
                              }}
                            />
                            <div className="flex justify-center">
                              <p className="text-xs text-muted-foreground">
                                {getNextThreshold(habit.current_streak)?.label || ""}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Completion status for selected date */}
                        <div className="mt-3">
                          <button
                            onClick={() => handleToggleHabit(habit.id)}
                            className={`w-full flex items-center justify-center px-3 py-2 rounded-md font-medium transition-all
                              ${isCompletedToday
                                ? "bg-lime-400 text-black hover:bg-lime-400/90"
                                : "bg-white/10 dark:bg-black/10 border border-white/20 dark:border-black/20 hover:bg-white/5 dark:hover:bg-black/5"
                            }`}
                          >
                            {isCompletedToday ? "Undo" : "Mark Complete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="mt-8 pt-6 border-t border-white/10 dark:border-black/10">
            <h3 className="text-lg font-semibold mb-4">Tree Growth Stages</h3>
            <div className="grid grid-cols-2 gap-4">
              {TREE_STAGES.map((stage, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 rounded bg-white/5 dark:bg-black/5">
                  <div className="flex h-8 w-8 items-center justify-center bg-lime-400/20 dark:bg-lime-400/10 rounded-lg">
                    <Leaf size={16} className="text-lime-400" />
                  </div>
                  <div>
                    <span className="block font-medium">{stage.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {stage.threshold}+ day streak
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to get next threshold
function getNextThreshold(streak: number) {
  for (const stage of TREE_STAGES) {
    if (streak < stage.threshold) {
      return stage;
    }
  }
  return null;
}