"use client";

import { useState, useEffect } from "react";
import { GitBranch, Play, Pause, Check, Plus, Trash2, SkipForward } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/supabase/user";

export function RoutinesCard() {
  const { user } = useUser();
  const [routines, setRoutines] = useState<any[]>([]);
  const [activeRoutine, setActiveRoutine] = useState<any>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [timer, setTimer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showNewRoutine, setShowNewRoutine] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState("");
  const [newRoutineSteps, setNewRoutineSteps] = useState("");

  useEffect(() => {
    if (!user) return;
    loadRoutines();
  }, [user]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (activeRoutine && timer !== null && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Time's up for current step
            handleStepComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (activeRoutine && timeLeft === 0 && timer !== null) {
      // Time completed naturally, move to next step
      handleStepComplete();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeRoutine, timer, timeLeft]);

  const loadRoutines = async () => {
    if (!user) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("routines")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[RoutinesCard] Failed to load routines:", error.message);
      return;
    }
    setRoutines(data ?? []);

    // Check if today's day matches any routine's active days
    const today = new Date().toLocaleDateString("en-US", { weekday: "short" });
    const todayRoutine = data.find((routine) =>
      routine.days_active?.includes(today)
    );
    if (todayRoutine) {
      setActiveRoutine(todayRoutine);
    }
  };

  const handleStartRoutine = (routine: any) => {
    setActiveRoutine(routine);
    setCurrentStepIndex(0);
    setTimer(Date.now());
    if (routine.steps && routine.steps.length > 0) {
      setTimeLeft(routine.steps[0].duration_minutes * 60);
    }
  };

  const handlePauseResume = () => {
    if (timer === null) {
      // Resume
      setTimer(Date.now());
    } else {
      // Pause
      setTimer(null);
    }
  };

  const handleSkipStep = () => {
    if (activeRoutine && activeRoutine.steps) {
      if (currentStepIndex < activeRoutine.steps.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
        setTimeLeft(activeRoutine.steps[currentStepIndex + 1].duration_minutes * 60);
        setTimer(Date.now());
      } else {
        // Routine complete
        setActiveRoutine(null);
        setCurrentStepIndex(0);
        setTimer(null);
        setTimeLeft(0);
      }
    }
  };

  const handleStepComplete = () => {
    if (activeRoutine && activeRoutine.steps) {
      if (currentStepIndex < activeRoutine.steps.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
        setTimeLeft(activeRoutine.steps[currentStepIndex + 1].duration_minutes * 60);
        setTimer(Date.now());
      } else {
        // Routine complete
        setActiveRoutine(null);
        setCurrentStepIndex(0);
        setTimer(null);
        setTimeLeft(0);
      }
    }
  };

  const handleStopRoutine = () => {
    setActiveRoutine(null);
    setCurrentStepIndex(0);
    setTimer(null);
    setTimeLeft(0);
  };

  const handleCreateRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newRoutineName.trim() || !newRoutineSteps.trim()) return;

    setLoading(true);
    const supabase = createClient();

    // Parse steps from text input
    const steps = newRoutineSteps.split("\n").map((line) => {
      const [title, duration] = line.split(":").map((s) => s.trim());
      return {
        title: title || "Step",
        duration_minutes: parseInt(duration) || 5,
      };
    });

    const { error } = await supabase
      .from("routines")
      .insert({
        user_id: user.id,
        name: newRoutineName,
        steps: steps,
        days_active: ["Mon", "Tue", "Wed", "Thu", "Fri"], // Default to weekdays
      });

    if (!error) {
      setNewRoutineName("");
      setNewRoutineSteps("");
      setShowNewRoutine(false);
      await loadRoutines();
    }
    setLoading(false);
  };

  const handleDeleteRoutine = async (routineId: string) => {
    if (!user) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("routines")
      .delete()
      .eq("id", routineId)
      .eq("user_id", user.id);

    if (!error) {
      await loadRoutines();
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getProgressPercentage = () => {
    if (!activeRoutine || !activeRoutine.steps) return 0;
    const totalTime = activeRoutine.steps.reduce(
      (sum: number, step: any) => sum + step.duration_minutes * 60,
      0
    );
    const currentStepTotalTime = activeRoutine.steps[currentStepIndex]?.duration_minutes * 60 || 0;
    const timeCompleted = currentStepTotalTime - timeLeft;

    // Calculate total time completed including previous steps
    let totalCompleted = timeCompleted;
    for (let i = 0; i < currentStepIndex; i++) {
      totalCompleted += activeRoutine.steps[i].duration_minutes * 60;
    }

    return (totalCompleted / totalTime) * 100;
  };

  const today = new Date().toLocaleDateString("en-US", { weekday: "short" });

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 flex items-center justify-center bg-indigo-400/20 dark:bg-indigo-400/10 rounded-lg">
            <GitBranch size={18} className="text-indigo-400" />
          </div>
          <span className="font-semibold text-lg">Today's Routine</span>
        </div>
      </div>

      {/* Active Routine */}
      {activeRoutine ? (
        <div className="flex-1 flex flex-col">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-lg">{activeRoutine.name}</h3>
              <button
                onClick={handleStopRoutine}
                className="text-xs text-red-400 hover:bg-red-400/10 px-2 py-1 rounded"
              >
                Stop
              </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1 bg-white/10 dark:bg-black/10 rounded-full mb-4">
              <div
                className="h-full bg-lime-400 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>

            {/* Current Step */}
            {activeRoutine.steps && activeRoutine.steps[currentStepIndex] && (
              <div className="bg-white/5 dark:bg-black/5 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm text-muted-foreground">Current Step</div>
                    <div className="text-lg font-semibold">
                      {activeRoutine.steps[currentStepIndex].title}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-accent">
                    {formatTime(timeLeft)}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Step {currentStepIndex + 1} of {activeRoutine.steps.length}
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center space-x-4 mb-6">
              <button
                onClick={handlePauseResume}
                className={`px-6 py-3 rounded-full font-bold transition-all ${
                  timer === null
                    ? "bg-lime-400 hover:bg-lime-400/90"
                    : "bg-rose-400 hover:bg-rose-400/90"
                } text-black flex items-center space-x-2`}
              >
                {timer === null ? (
                  <>
                    <Play size={20} />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <Pause size={20} />
                    <span>Pause</span>
                  </>
                )}
              </button>
              <button
                onClick={handleSkipStep}
                className="px-6 py-3 rounded-full bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20 flex items-center space-x-2"
              >
                <SkipForward size={20} />
                <span>Skip</span>
              </button>
            </div>

            {/* Steps List */}
            {activeRoutine.steps && (
              <div className="flex-1 overflow-y-auto">
                <div className="text-xs font-semibold text-muted-foreground mb-2">
                  Steps ({activeRoutine.steps.length})
                </div>
                <div className="space-y-2">
                  {activeRoutine.steps.map((step: any, index: number) => (
                    <div
                      key={index}
                      className={`p-3 rounded-md flex items-center justify-between ${
                        index < currentStepIndex
                          ? "bg-white/5 dark:bg-black/5 opacity-50"
                          : index === currentStepIndex
                          ? "bg-lime-400/10 dark:bg-lime-400/5 border border-lime-400/30"
                          : "bg-white/5 dark:bg-black/5"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {index < currentStepIndex ? (
                          <div className="h-6 w-6 flex items-center justify-center bg-lime-400/20 rounded-full">
                            <Check size={12} className="text-accent" />
                          </div>
                        ) : (
                          <div className="h-6 w-6 flex items-center justify-center border border-white/30 dark:border-black/30 rounded-full">
                            {index + 1}
                          </div>
                        )}
                        <span>{step.title}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {step.duration_minutes} min
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Available Routines */
        <div className="flex-1 flex flex-col">
          <div className="mb-4 text-sm text-muted-foreground">
            Active routines for {today}
          </div>

          {routines.filter((routine) => routine.days_active?.includes(today)).length > 0 ? (
            <div className="space-y-3 mb-6">
              {routines
                .filter((routine) => routine.days_active?.includes(today))
                .map((routine) => (
                  <div
                    key={routine.id}
                    className="p-3 rounded-md bg-white/5 dark:bg-black/5 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold">{routine.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {routine.steps?.length || 0} steps ·{" "}
                        {routine.steps?.reduce((sum: number, step: any) => sum + step.duration_minutes, 0) || 0}{" "}
                        minutes
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleStartRoutine(routine)}
                        className="px-3 py-2 rounded-md bg-lime-400 text-black text-xs font-medium hover:bg-lime-400/90"
                      >
                        Start
                      </button>
                      <button
                        onClick={() => handleDeleteRoutine(routine.id)}
                        className="p-2 rounded-md hover:bg-red-500/20 text-red-400"
                        aria-label="Delete routine"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <GitBranch size={32} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">
                No routines scheduled for today
              </p>
              <p className="text-xs text-muted-foreground max-w-[200px] text-center">
                Create a routine with steps and set which days it runs.
              </p>
            </div>
          )}

          {/* Create New Routine */}
          {!showNewRoutine ? (
            <button
              onClick={() => setShowNewRoutine(true)}
              className="mt-auto flex items-center space-x-2 p-3 rounded-md bg-white/5 dark:bg-black/5 hover:bg-white/10 dark:hover:bg-black/10 text-accent font-medium"
            >
              <Plus size={16} />
              <span>Create new routine</span>
            </button>
          ) : (
            <form onSubmit={handleCreateRoutine} className="mt-auto space-y-3 p-4 bg-white/5 dark:bg-black/5 rounded-lg">
              <input
                type="text"
                value={newRoutineName}
                onChange={(e) => setNewRoutineName(e.target.value)}
                placeholder="Routine name"
                className="w-full px-3 py-2 rounded-md bg-white/10 dark:bg-black/10 border border-white/10 text-sm focus:outline-none focus:border-lime-400"
                autoFocus
              />
              <textarea
                value={newRoutineSteps}
                onChange={(e) => setNewRoutineSteps(e.target.value)}
                placeholder="Steps (one per line)\nExample:\nMeditation: 10\nExercise: 20\nBreakfast: 15"
                className="w-full px-3 py-2 rounded-md bg-white/10 dark:bg-black/10 border border-white/10 text-sm focus:outline-none focus:border-lime-400 h-32 resize-none"
              />
              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={!newRoutineName.trim() || !newRoutineSteps.trim() || loading}
                  className="flex-1 px-3 py-2 rounded-md bg-lime-400 text-black text-sm font-medium hover:bg-lime-400/90 disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewRoutine(false);
                    setNewRoutineName("");
                    setNewRoutineSteps("");
                  }}
                  className="flex-1 px-3 py-2 rounded-md border border-white/10 text-sm font-medium hover:bg-white/5"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
