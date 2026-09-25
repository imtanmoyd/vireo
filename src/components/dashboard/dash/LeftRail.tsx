"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  GitBranch,
  LayoutDashboard,
  Music,
  Pause,
  Play,
  Plus,
  Quote,
  Settings,
  SkipBack,
  SkipForward,
  Sparkles,
  Sprout,
  Timer,
  X,
} from "lucide-react";
import type { DataStore } from "@/lib/data";
import { formatCountdown, POMODORO_PRESETS, SESSIONS_BEFORE_LONG_BREAK, usePomodoro } from "@/lib/use-pomodoro";
import {
  type DashData,
  type DashMode,
  type RailLayout,
  type RailWidgetRef,
  startOfWeek,
} from "./types";

// ─── Widget catalog ──────────────────────────────────────────────────────────

type WidgetId = "reading" | "today" | "music" | "quiet" | "garden" | "quote";

const WIDGET_META: Record<WidgetId, { label: string }> = {
  reading: { label: "Reading progress" },
  today: { label: "Tasks done" },
  music: { label: "Focus sounds" },
  quiet: { label: "Quiet time" },
  garden: { label: "Habit garden" },
  quote: { label: "Daily quote" },
};

const MODE_PRESETS: Record<DashMode, WidgetId[]> = {
  work: ["reading", "today", "music", "quiet", "garden", "quote"],
  personal: ["today", "quote", "garden", "quiet"],
  recovery: ["quiet", "quote", "garden"],
};

const MODE_LABELS: Record<DashMode, string> = {
  work: "Work mode",
  personal: "Personal mode",
  recovery: "Recovery mode",
};

const NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/todos", icon: CheckSquare, label: "Todos" },
  { href: "/habits", icon: Sprout, label: "Habits" },
  { href: "/routines", icon: GitBranch, label: "Routines" },
  { href: "/pomodoro", icon: Timer, label: "Focus" },
  { href: "/journal", icon: BookOpen, label: "Journal" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

const QUOTES = [
  { text: "The smallest steps are still progress.", by: "" },
  { text: "Discipline is choosing what you want most.", by: "" },
  { text: "Slow is smooth, smooth is fast.", by: "" },
  { text: "You do not rise to goals, you fall to systems.", by: "" },
];

// ─── Component ───────────────────────────────────────────────────────────────

interface LeftRailProps {
  store: DataStore | null;
  data: DashData | null;
  username: string | null;
  isGuest: boolean;
  rail: RailLayout;
  onSaveRail: (patch: { widgets?: RailWidgetRef[] | null; mode?: DashMode; customized?: boolean }) => void;
}

export function LeftRail({ store, data, username, isGuest, rail, onSaveRail }: LeftRailProps) {
  const pathname = usePathname();
  const [modeOpen, setModeOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const widgets: RailWidgetRef[] = useMemo(() => {
    if (rail.widgets) return [...rail.widgets].sort((a, b) => a.order - b.order);
    return MODE_PRESETS[rail.mode].map((id, order) => ({ id, order }));
  }, [rail.widgets, rail.mode]);

  const present = new Set(widgets.map((w) => w.id));
  const addable = (Object.keys(WIDGET_META) as WidgetId[]).filter((id) => !present.has(id));

  const commit = (next: RailWidgetRef[]) =>
    onSaveRail({ widgets: next.map((w, i) => ({ id: w.id, order: i })), customized: true });

  const addWidget = (id: WidgetId) => {
    commit([...widgets, { id, order: widgets.length }]);
    setAddOpen(false);
  };

  const removeWidget = (id: WidgetId) => commit(widgets.filter((w) => w.id !== id));

  const moveWidget = (id: WidgetId, dir: -1 | 1) => {
    const i = widgets.findIndex((w) => w.id === id);
    const j = i + dir;
    if (i === -1 || j < 0 || j >= widgets.length) return;
    const next = [...widgets];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  };

  const displayName = (username ?? (isGuest ? "guest" : "there")).charAt(0).toUpperCase() + (username ?? (isGuest ? "guest" : "there")).slice(1);

  return (
    <aside className="dash-col dash-scroll flex w-full flex-col gap-4">
      {/* Greeting + mode switcher */}
      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Hi {displayName},</p>
            <h1 className="text-[26px] font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-100">
              Let&apos;s build consistency today
            </h1>
          </div>
          <button
            onClick={() => setModeOpen((v) => !v)}
            className="dash-card flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            <Briefcase size={13} className="text-slate-400" />
            {MODE_LABELS[rail.mode]}
            <ChevronDown size={13} className="text-slate-400" />
          </button>
        </div>
        {modeOpen && (
          <div className="dash-card absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden p-1.5">
            {(Object.keys(MODE_LABELS) as DashMode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  onSaveRail(rail.customized ? { mode: m } : { mode: m, widgets: null });
                  setModeOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${
                  rail.mode === m
                    ? "bg-lime-100 font-semibold text-lime-800 dark:bg-lime-400/15 dark:text-lime-300"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
                }`}
              >
                {MODE_LABELS[m]}
                {rail.mode === m && <Check size={14} />}
              </button>
            ))}
            <p className="px-3 pb-1.5 pt-1 text-[10px] leading-snug text-slate-400">
              {rail.customized ? "Your custom widget stack is kept." : "Switching swaps the default widgets."}
            </p>
          </div>
        )}
      </div>

      {/* Page navigation chips */}
      <nav className="flex flex-wrap gap-1.5">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                active
                  ? "bg-slate-900 text-white dark:bg-lime-400 dark:text-[#101408]"
                  : "bg-white text-slate-500 shadow-sm hover:text-slate-800 dark:bg-white/5 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Icon size={12} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Widget stack */}
      <div className="grid grid-cols-2 gap-3">
        {widgets.map((w) => (
          <WidgetShell
            key={w.id}
            span={w.id === "quiet" || w.id === "music"}
            onRemove={() => removeWidget(w.id as WidgetId)}
            onMove={(d) => moveWidget(w.id as WidgetId, d)}
          >
            {w.id === "reading" && <ReadingWidget />}
            {w.id === "today" && <TodayWidget data={data} />}
            {w.id === "music" && <MusicWidget />}
            {w.id === "quiet" && <QuietTimeWidget store={store} />}
            {w.id === "garden" && <GardenWidget data={data} />}
            {w.id === "quote" && <QuoteWidget />}
          </WidgetShell>
        ))}
      </div>

      {/* Add New Widget */}
      <div className="relative mt-auto">
        {addOpen && (
          <div className="dash-card absolute bottom-full left-0 z-30 mb-2 w-full overflow-hidden p-1.5">
            {addable.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-400">All widgets are on the rail.</p>
            ) : (
              addable.map((id) => (
                <button
                  key={id}
                  onClick={() => addWidget(id)}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
                >
                  <Plus size={13} className="text-lime-600" />
                  {WIDGET_META[id].label}
                </button>
              ))
            )}
          </div>
        )}
        <button
          onClick={() => setAddOpen((v) => !v)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-white/10 dark:hover:bg-white/15"
        >
          <Plus size={15} />
          Add New Widget
        </button>
      </div>
    </aside>
  );
}

// ─── Widget shell with remove / reorder controls ─────────────────────────────

function WidgetShell({
  children,
  span,
  onRemove,
  onMove,
}: {
  children: React.ReactNode;
  span?: boolean;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className={`group relative ${span ? "col-span-2" : ""}`}>
      <div className="absolute right-2 top-2 z-20 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button onClick={() => onMove(-1)} className="dash-mini-btn" aria-label="Move up"><ChevronLeft className="h-3 w-3 -rotate-90" /></button>
        <button onClick={() => onMove(1)} className="dash-mini-btn" aria-label="Move down"><ChevronLeft className="h-3 w-3 rotate-90" /></button>
        <button onClick={onRemove} className="dash-mini-btn" aria-label="Remove widget"><X className="h-3 w-3" /></button>
      </div>
      {children}
    </div>
  );
}

// ─── Individual widgets ──────────────────────────────────────────────────────

function ReadingWidget() {
  return (
    <div className="night-tile h-full rounded-2xl p-4 text-white shadow-[0_10px_30px_rgba(20,30,60,.35)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">Reading</p>
      <p className="mt-2.5 text-3xl font-bold leading-none tracking-tight">
        120
        <span className="ml-1.5 align-middle text-[11px] font-medium text-white/55">/ 200 pages</span>
      </p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
        <div className="h-full w-[60%] rounded-full bg-gradient-to-r from-lime-300 to-teal-200" />
      </div>
      <p className="mt-2.5 text-[10px] text-white/45">Moonlit chapters before bed</p>
    </div>
  );
}

function TodayWidget({ data }: { data: DashData | null }) {
  const done = data?.todos.filter((t) => t.is_complete).length ?? 0;
  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return (
    <div className="dash-card flex h-full flex-col justify-between p-4">
      <p className="text-[11px] font-semibold text-slate-400">{dateLabel}</p>
      <div className="mt-2">
        <p className="text-3xl font-bold leading-none tracking-tight text-slate-900 dark:text-slate-100">{done}</p>
        <p className="mt-1 text-[11px] text-slate-400">tasks done</p>
      </div>
    </div>
  );
}

function MusicWidget() {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative h-full min-h-[128px] overflow-hidden rounded-2xl bg-gradient-to-br from-[#a9c78e] via-[#7ea468] to-[#4f6b3c] p-4 text-white shadow-[0_10px_30px_rgba(70,100,60,.35)]">
      <div className="relative z-10 max-w-[58%]">
        <p className="text-sm font-bold leading-snug">Deep work Music</p>
        <p className="text-[11px] text-white/70">H/G group band</p>
        <div className="mt-5 flex items-center gap-1.5">
          <button className="round-btn" aria-label="Previous"><SkipBack size={11} /></button>
          <button
            onClick={() => setPlaying((v) => !v)}
            className="round-btn !h-8 !w-8 !bg-white !text-slate-800"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
          </button>
          <button className="round-btn" aria-label="Next"><SkipForward size={11} /></button>
        </div>
      </div>
      <div className="vinyl absolute -right-8 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full" />
      <div className="absolute right-5 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full bg-gradient-to-br from-sky-200 to-sky-400 shadow-inner" />
    </div>
  );
}

function QuietTimeWidget({ store }: { store: DataStore | null }) {
  const p = usePomodoro(store);
  const filled = p.focusCount % SESSIONS_BEFORE_LONG_BREAK;
  return (
    <div className="relative h-full overflow-hidden rounded-2xl bg-gradient-to-b from-[#8db5e9] via-[#6d93d4] to-[#3f609c] p-5 text-white shadow-[0_12px_32px_rgba(60,90,150,.4)]">
      <div className="pointer-events-none absolute -left-8 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 -right-6 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex items-center justify-between">
        <p className="text-sm font-bold">Quiet Time</p>
        <span className="rounded-full bg-white/20 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em]">
          {POMODORO_PRESETS[p.mode].label}
        </span>
      </div>
      <p className="relative mt-6 text-center font-mono text-[40px] font-bold leading-none tracking-tight tabular-nums drop-shadow-sm">
        {formatCountdown(p.timeLeft)}
      </p>
      <div className="relative mt-5 flex items-center justify-center gap-1.5">
        {Array.from({ length: SESSIONS_BEFORE_LONG_BREAK }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-7 rounded-full transition-colors ${i < filled ? "bg-white" : "bg-white/25"}`}
          />
        ))}
      </div>
      <div className="relative mt-5 flex gap-2">
        <button
          onClick={p.reset}
          className="flex-1 rounded-full bg-white/20 py-2.5 text-xs font-semibold backdrop-blur transition-colors hover:bg-white/30"
        >
          Cancel
        </button>
        <button
          onClick={p.startPause}
          className="flex-1 rounded-full bg-[#16351f] py-2.5 text-xs font-bold transition-colors hover:bg-[#1d4430]"
        >
          {p.running ? "Pause" : "Start Session"}
        </button>
      </div>
    </div>
  );
}

const GARDEN_STAGES = ["Seed", "Sprout", "Sapling", "Young tree", "Mature tree", "Blooming"];
const GARDEN_ART = ["🌱", "🌿", "🪴", "🌲", "🌳", "🌸"];

function GardenWidget({ data }: { data: DashData | null }) {
  const best = data?.habits.reduce((m, h) => Math.max(m, h.current_streak ?? 0), 0) ?? 0;
  const stage = best >= 60 ? 5 : best >= 30 ? 4 : best >= 14 ? 3 : best >= 7 ? 2 : best >= 3 ? 1 : 0;
  return (
    <div className="dash-card flex h-full flex-col items-center justify-center p-4 text-center">
      <span className="text-4xl" aria-hidden="true">{GARDEN_ART[stage]}</span>
      <p className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">{GARDEN_STAGES[stage]}</p>
      <p className="text-[11px] text-slate-400">{best}d best streak</p>
    </div>
  );
}

function QuoteWidget() {
  const [index, setIndex] = useState(0);
  const quote = QUOTES[index % QUOTES.length];
  return (
    <button
      onClick={() => setIndex((v) => v + 1)}
      title="Tap for another quote"
      className="dash-card flex h-full w-full flex-col p-4 text-left"
    >
      <Quote size={12} className="text-lime-500" />
      <p className="mt-2 font-[family-name:var(--font-script)] text-[24px] font-semibold leading-[1.1] text-slate-800 dark:text-slate-100">
        {quote.text}
      </p>
      {quote.by && <p className="mt-1 text-[10px] text-slate-400">{quote.by}</p>}
    </button>
  );
}
