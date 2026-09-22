"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, SkipForward, Coffee, Brain, Timer } from "lucide-react";
import { useAppStore } from "@/lib/data";

type Mode = "focus" | "short_break" | "long_break";

const PRESETS: Record<
  Mode,
  { minutes: number; label: string; hex: string; activeChip: string; icon: typeof Timer }
> = {
  focus: { minutes: 25, label: "Focus", hex: "#bef264", activeChip: "bg-lime-400 text-black hover:bg-lime-400/90", icon: Brain },
  short_break: { minutes: 5, label: "Short break", hex: "#fbbf24", activeChip: "bg-amber-400 text-black hover:bg-amber-400/90", icon: Coffee },
  long_break: { minutes: 15, label: "Long break", hex: "#a78bfa", activeChip: "bg-violet-400 text-black hover:bg-violet-400/90", icon: Coffee },
};

const SESSIONS_BEFORE_LONG_BREAK = 4;

function ProgressRing({ progress, color }: { progress: number; color: string }) {
  const radius = 62;
  const stroke = 6;
  const normalized = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalized;
  return (
    <svg width={radius * 2} height={radius * 2} className="-rotate-90">
      <circle
        cx={radius}
        cy={radius}
        r={normalized}
        fill="none"
        strokeWidth={stroke}
        className="stroke-white/10 dark:stroke-black/10"
      />
      <circle
        cx={radius}
        cy={radius}
        r={normalized}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress)}
        style={{ transition: "stroke-dashoffset 0.6s linear" }}
      />
    </svg>
  );
}

export function PomodoroCard() {
  const { store } = useAppStore();
  const [mode, setMode] = useState<Mode>("focus");
  const [timeLeft, setTimeLeft] = useState(PRESETS.focus.minutes * 60);
  const [running, setRunning] = useState(false);
  const [focusCount, setFocusCount] = useState(0);
  const [todaySessions, setTodaySessions] = useState(0);
  const [todayMinutes, setTodayMinutes] = useState(0);

  const startedAtRef = useRef<number | null>(null);
  const completingRef = useRef(false);

  // Load today's completed focus stats.
  useEffect(() => {
    const s = store;
    if (!s) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await s.list<{
          started_at: string;
          duration_minutes: number;
          type: string | null;
          completed: boolean;
        }>("pomodoro_sessions");
        if (cancelled) return;
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const todays = rows.filter(
          (r) => r.completed && new Date(r.started_at).getTime() >= startOfToday.getTime(),
        );
        const focusToday = todays.filter((r) => r.type === "focus");
        setTodaySessions(focusToday.length);
        setTodayMinutes(focusToday.reduce((sum, r) => sum + (r.duration_minutes ?? 0), 0));
      } catch (e) {
        console.error("[PomodoroCard] Failed to load sessions:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [store]);

  const total = PRESETS[mode].minutes * 60;
  const progress = total > 0 ? 1 - timeLeft / total : 0;

  const switchMode = useCallback((next: Mode) => {
    setMode(next);
    setTimeLeft(PRESETS[next].minutes * 60);
    setRunning(false);
    startedAtRef.current = null;
  }, []);

  const completeSession = useCallback(async () => {
    if (completingRef.current) return;
    completingRef.current = true;
    setRunning(false);

    const s = store;
    const startedAt = startedAtRef.current;
    if (s && startedAt) {
      const { error } = await s.insert("pomodoro_sessions", {
        started_at: new Date(startedAt).toISOString(),
        duration_minutes: PRESETS[mode].minutes,
        type: mode,
        completed: true,
      });
      if (error) {
        console.error("[PomodoroCard] Failed to save session:", error);
      } else if (mode === "focus") {
        setTodaySessions((n) => n + 1);
        setTodayMinutes((n) => n + PRESETS.focus.minutes);
      }
    }
    startedAtRef.current = null;

    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      new Notification(mode === "focus" ? "Focus session complete" : "Break is over", {
        body: mode === "focus" ? "Time for a break." : "Ready for the next focus session?",
      });
    }

    if (mode === "focus") {
      const next = focusCount + 1;
      setFocusCount(next);
      switchMode(next % SESSIONS_BEFORE_LONG_BREAK === 0 ? "long_break" : "short_break");
    } else {
      switchMode("focus");
    }
    completingRef.current = false;
  }, [store, mode, focusCount, switchMode]);

  // Ticking: a single interval while running; never completes inside the updater.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  // Completion watcher: fires exactly once when the countdown reaches zero.
  useEffect(() => {
    if (running && timeLeft === 0) {
      completeSession();
    }
  }, [running, timeLeft, completeSession]);

  const handleStartPause = () => {
    if (!running && timeLeft === total) {
      startedAtRef.current = Date.now();
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "default"
      ) {
        Notification.requestPermission();
      }
    } else if (running) {
      // Pausing discards the start timestamp; resuming logs from the resume point.
      startedAtRef.current = null;
    }
    setRunning((r) => !r);
  };

  const handleReset = () => {
    setRunning(false);
    startedAtRef.current = null;
    setTimeLeft(PRESETS[mode].minutes * 60);
  };

  const handleSkip = () => {
    switchMode(mode === "focus" ? "short_break" : "focus");
  };

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");
  const filledDots = focusCount % SESSIONS_BEFORE_LONG_BREAK;

  return (
    <div className="flex h-full flex-col">
      {/* Mode chips */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        {(Object.keys(PRESETS) as Mode[]).map((m) => {
          const preset = PRESETS[m];
          const ChipIcon = preset.icon;
          const active = mode === m;
          return (
            <button
              key={m}
              onClick={() => !running && switchMode(m)}
              disabled={running}
              className={`flex flex-col items-center gap-0.5 rounded-lg p-2 text-[11px] font-medium transition-all disabled:cursor-not-allowed ${
                active
                  ? preset.activeChip
                  : "bg-white/5 dark:bg-black/5 text-muted-foreground hover:bg-white/10 dark:hover:bg-black/10"
              }`}
            >
              <ChipIcon size={14} />
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Ring + countdown */}
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <div className="relative" style={{ width: 124, height: 124 }}>
          <ProgressRing progress={progress} color={PRESETS[mode].hex} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-2xl font-bold tabular-nums">
              {mm}:{ss}
            </span>
            <span className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              {PRESETS[mode].label}
            </span>
          </div>
        </div>

        {/* Cycle dots: one full ring of dots = long break earned */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: SESSIONS_BEFORE_LONG_BREAK }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i < filledDots ? "bg-lime-400" : "bg-white/10 dark:bg-black/10"
              }`}
            />
          ))}
          <span className="ml-1 text-[10px] text-muted-foreground">{focusCount} today</span>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-3 flex items-center justify-center gap-2">
        <button
          onClick={handleReset}
          className="rounded-full bg-white/10 dark:bg-black/10 p-2.5 hover:bg-white/20 dark:hover:bg-black/20"
          aria-label="Reset timer"
        >
          <RotateCcw size={15} />
        </button>
        <button
          onClick={handleStartPause}
          className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-all ${
            PRESETS[mode].activeChip
          }`}
        >
          {running ? <Pause size={15} /> : <Play size={15} />}
          {running ? "Pause" : "Start"}
        </button>
        <button
          onClick={handleSkip}
          className="rounded-full bg-white/10 dark:bg-black/10 p-2.5 hover:bg-white/20 dark:hover:bg-black/20"
          aria-label="Skip to next"
        >
          <SkipForward size={15} />
        </button>
      </div>

      {/* Stats */}
      <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-muted-foreground dark:border-black/10">
        <span className="inline-flex items-center gap-1.5">
          <Brain size={12} />
          Focus today
        </span>
        <span className="font-semibold text-accent">
          {todaySessions} sessions / {todayMinutes}m
        </span>
      </div>
    </div>
  );
}
