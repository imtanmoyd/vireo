"use client";

import { useState, useEffect } from "react";
import { Timer, Play, Pause, SkipForward, Coffee } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/supabase/user";

const POMODORO_PRESETS = {
  focus: { minutes: 25, type: "focus" },
  short_break: { minutes: 5, type: "short_break" },
  long_break: { minutes: 15, type: "long_break" },
};

export function PomodoroCard() {
  const { user } = useUser();
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isActive, setIsActive] = useState(false);
  const [currentMode, setCurrentMode] = useState<"focus" | "short_break" | "long_break">("focus");
  const [completedSessions, setCompletedSessions] = useState(0);
  const [isSessionSaved, setIsSessionSaved] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            // Timer completed
            handleTimerComplete();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else if (!isActive && timeLeft === 0) {
      // Timer completed, save session
      saveSession();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  useEffect(() => {
    if (!user) return;
    loadCompletedSessions();
  }, [user]);

  const loadCompletedSessions = async () => {
    if (!user) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("pomodoro_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("completed", true)
      .gte("started_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (!error && data) {
      setCompletedSessions(data.length);
    }
  };

  const saveSession = async () => {
    if (!user || isSessionSaved) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("pomodoro_sessions")
      .insert({
        user_id: user.id,
        started_at: new Date(Date.now() - timeLeft * 1000).toISOString(),
        duration_minutes: POMODORO_PRESETS[currentMode].minutes,
        type: currentMode,
        completed: true
      });

    if (!error) {
      setIsSessionSaved(true);
      await loadCompletedSessions();
    }
  };

  const handleTimerComplete = () => {
    setIsActive(false);
    setIsSessionSaved(false);
    // Play a sound or show notification (would be implemented in a real app)
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const handleStartPause = () => {
    if (timeLeft === 0) {
      // Reset timer if it's at 0
      const minutes = POMODORO_PRESETS[currentMode].minutes;
      setTimeLeft(minutes * 60);
    }
    setIsActive(!isActive);
    if (isActive && !isSessionSaved) {
      saveSession();
    }
  };

  const handleReset = () => {
    setIsActive(false);
    const minutes = POMODORO_PRESETS[currentMode].minutes;
    setTimeLeft(minutes * 60);
    setIsSessionSaved(true);
  };

  const handleSkip = () => {
    setIsActive(false);
    const nextMode = completedSessions % 4 === 3 ? "long_break" : "short_break";
    setCurrentMode(nextMode);
    const minutes = POMODORO_PRESETS[nextMode].minutes;
    setTimeLeft(minutes * 60);
    setIsSessionSaved(true);
  };

  const handleSetMode = (mode: "focus" | "short_break" | "long_break") => {
    setIsActive(false);
    setCurrentMode(mode);
    const minutes = POMODORO_PRESETS[mode].minutes;
    setTimeLeft(minutes * 60);
    setIsSessionSaved(true);
  };

  const getModeLabel = () => {
    switch (currentMode) {
      case "focus":
        return "Focus";
      case "short_break":
        return "Short Break";
      case "long_break":
        return "Long Break";
    }
  };

  const getProgressPercentage = () => {
    const totalSeconds = POMODORO_PRESETS[currentMode].minutes * 60;
    return ((totalSeconds - timeLeft) / totalSeconds) * 100;
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 flex items-center justify-center bg-amber-400/20 dark:bg-amber-400/10 rounded-lg">
            <Timer size={18} className="text-amber-400" />
          </div>
          <span className="font-semibold text-lg">Pomodoro</span>
        </div>
      </div>

      {/* Timer Display */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative mb-8">
          {/* Progress Ring */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-48 h-48">
              <div className="absolute inset-0 rounded-full border-8 border-white/10 dark:border-black/10"></div>
              <div
                className="absolute inset-0 rounded-full border-8 border-lime-400"
                style={{
                  clipPath: `inset(0 ${100 - getProgressPercentage()}% 0 0)`,
                  transform: "rotate(90deg)",
                  transformOrigin: "center"
                }}
              ></div>
            </div>
          </div>

          {/* Timer Numbers */}
          <div className="relative flex flex-col items-center justify-center w-48 h-48">
            <div className="text-5xl font-bold tracking-tight mb-2">
              {formatTime(timeLeft)}
            </div>
            <div className="text-sm font-semibold text-lime-400">
              {getModeLabel()}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center space-x-4 mb-6">
          <button
            onClick={handleStartPause}
            className={`px-6 py-3 rounded-full font-bold transition-all ${
              isActive
                ? "bg-rose-400 hover:bg-rose-400/90"
                : "bg-lime-400 hover:bg-lime-400/90"
            } text-black flex items-center space-x-2`}
          >
            {isActive ? (
              <>
                <Pause size={20} />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play size={20} />
                <span>Start</span>
              </>
            )}
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-3 rounded-full bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20 flex items-center space-x-2"
          >
            <span>Reset</span>
          </button>
          {currentMode === "focus" && (
            <button
              onClick={handleSkip}
              className="px-4 py-3 rounded-full bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20 flex items-center space-x-2"
            >
              <SkipForward size={18} />
              <span>Skip</span>
            </button>
          )}
        </div>
      </div>

      {/* Mode Selection */}
      <div className="mt-4 pt-4 border-t border-white/10 dark:border-black/10">
        <div className="text-xs font-semibold text-muted-foreground mb-2">
          Select Timer
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleSetMode("focus")}
            className={`p-3 rounded-lg flex flex-col items-center transition-all ${
              currentMode === "focus"
                ? "bg-lime-400 text-black"
                : "bg-white/5 dark:bg-black/5 hover:bg-white/10 dark:hover:bg-black/10"
            }`}
          >
            <Timer size={20} className="mb-1" />
            <span className="text-xs font-medium">Focus</span>
            <span className="text-xs opacity-75">25 min</span>
          </button>
          <button
            onClick={() => handleSetMode("short_break")}
            className={`p-3 rounded-lg flex flex-col items-center transition-all ${
              currentMode === "short_break"
                ? "bg-lime-400 text-black"
                : "bg-white/5 dark:bg-black/5 hover:bg-white/10 dark:hover:bg-black/10"
            }`}
          >
            <Coffee size={20} className="mb-1" />
            <span className="text-xs font-medium">Short</span>
            <span className="text-xs opacity-75">5 min</span>
          </button>
          <button
            onClick={() => handleSetMode("long_break")}
            className={`p-3 rounded-lg flex flex-col items-center transition-all ${
              currentMode === "long_break"
                ? "bg-lime-400 text-black"
                : "bg-white/5 dark:bg-black/5 hover:bg-white/10 dark:hover:bg-black/10"
            }`}
          >
            <Coffee size={20} className="mb-1" />
            <span className="text-xs font-medium">Long</span>
            <span className="text-xs opacity-75">15 min</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 pt-4 border-t border-white/10 dark:border-black/10">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Today's completed sessions
          </div>
          <div className="text-lg font-bold text-lime-400">
            {completedSessions}
          </div>
        </div>
      </div>
    </div>
  );
}
