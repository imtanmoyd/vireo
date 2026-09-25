"use client";

import { Brain, Coffee, Pause, Play, RotateCcw, SkipForward, Timer } from "lucide-react";
import { useAppStore } from "@/lib/data";
import {
  POMODORO_PRESETS,
  SESSIONS_BEFORE_LONG_BREAK,
  formatCountdown,
  usePomodoro,
  type PomodoroMode,
} from "@/lib/use-pomodoro";

const MODE_META: Record<PomodoroMode, { hex: string; activeChip: string; icon: typeof Timer }> = {
  focus: { hex: "#bef264", activeChip: "bg-lime-400 text-black hover:bg-lime-400/90", icon: Brain },
  short_break: { hex: "#fbbf24", activeChip: "bg-amber-400 text-black hover:bg-amber-400/90", icon: Coffee },
  long_break: { hex: "#a78bfa", activeChip: "bg-violet-400 text-black hover:bg-violet-400/90", icon: Coffee },
};

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
  const pomodoro = usePomodoro(store);
  const { mode, timeLeft, total, running, focusCount, todaySessions, todayMinutes } = pomodoro;
  const progress = total > 0 ? 1 - timeLeft / total : 0;
  const filledDots = focusCount % SESSIONS_BEFORE_LONG_BREAK;

  return (
    <div className="flex h-full flex-col">
      {/* Mode chips */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        {(Object.keys(POMODORO_PRESETS) as PomodoroMode[]).map((m) => {
          const meta = MODE_META[m];
          const ChipIcon = meta.icon;
          const active = mode === m;
          return (
            <button
              key={m}
              onClick={() => !running && pomodoro.switchMode(m)}
              disabled={running}
              className={`flex flex-col items-center gap-0.5 rounded-lg p-2 text-[11px] font-medium transition-all disabled:cursor-not-allowed ${
                active
                  ? meta.activeChip
                  : "bg-white/5 dark:bg-black/5 text-muted-foreground hover:bg-white/10 dark:hover:bg-black/10"
              }`}
            >
              <ChipIcon size={14} />
              {POMODORO_PRESETS[m].label}
            </button>
          );
        })}
      </div>

      {/* Ring + countdown */}
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <div className="relative" style={{ width: 124, height: 124 }}>
          <ProgressRing progress={progress} color={MODE_META[mode].hex} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-2xl font-bold tabular-nums">{formatCountdown(timeLeft, false)}</span>
            <span className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              {POMODORO_PRESETS[mode].label}
            </span>
          </div>
        </div>

        {/* Cycle dots */}
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
          onClick={pomodoro.reset}
          className="rounded-full bg-white/10 dark:bg-black/10 p-2.5 hover:bg-white/20 dark:hover:bg-black/20"
          aria-label="Reset timer"
        >
          <RotateCcw size={15} />
        </button>
        <button
          onClick={pomodoro.startPause}
          className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-all ${
            MODE_META[mode].activeChip
          }`}
        >
          {running ? <Pause size={15} /> : <Play size={15} />}
          {running ? "Pause" : "Start"}
        </button>
        <button
          onClick={pomodoro.skip}
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
