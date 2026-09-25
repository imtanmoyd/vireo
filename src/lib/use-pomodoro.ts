"use client";

// Shared pomodoro engine used by the dashboard Quiet Time widget and the
// dedicated Pomodoro card. Handles the countdown, session logging (Supabase
// for accounts, localStorage for guests), break cycling and notifications.

import { useCallback, useEffect, useRef, useState } from "react";
import type { DataStore } from "@/lib/data";

export type PomodoroMode = "focus" | "short_break" | "long_break";

export const POMODORO_PRESETS: Record<PomodoroMode, { minutes: number; label: string }> = {
  focus: { minutes: 25, label: "Focus" },
  short_break: { minutes: 5, label: "Short break" },
  long_break: { minutes: 15, label: "Long break" },
};

export const SESSIONS_BEFORE_LONG_BREAK = 4;

export function usePomodoro(store: DataStore | null) {
  const [mode, setMode] = useState<PomodoroMode>("focus");
  const [timeLeft, setTimeLeft] = useState(POMODORO_PRESETS.focus.minutes * 60);
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
        console.error("[usePomodoro] Failed to load sessions:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [store]);

  const total = POMODORO_PRESETS[mode].minutes * 60;

  const switchMode = useCallback((next: PomodoroMode) => {
    setMode(next);
    setTimeLeft(POMODORO_PRESETS[next].minutes * 60);
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
        duration_minutes: POMODORO_PRESETS[mode].minutes,
        type: mode,
        completed: true,
      });
      if (error) {
        console.error("[usePomodoro] Failed to save session:", error);
      } else if (mode === "focus") {
        setTodaySessions((n) => n + 1);
        setTodayMinutes((n) => n + POMODORO_PRESETS.focus.minutes);
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

  const startPause = useCallback(() => {
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
  }, [running, timeLeft, total]);

  const reset = useCallback(() => {
    setRunning(false);
    startedAtRef.current = null;
    setTimeLeft(POMODORO_PRESETS[mode].minutes * 60);
  }, [mode]);

  const skip = useCallback(() => {
    switchMode(mode === "focus" ? "short_break" : "focus");
  }, [mode, switchMode]);

  return {
    mode,
    timeLeft,
    total,
    running,
    focusCount,
    todaySessions,
    todayMinutes,
    startPause,
    reset,
    skip,
    switchMode,
  };
}

export function formatCountdown(seconds: number, withHours = true): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (withHours) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
