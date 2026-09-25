"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  Brain,
  Check,
  CheckSquare,
  Flame,
  MessageCircle,
  Moon,
  Sprout,
  Sun,
  Timer,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { type DashData, dayKey, startOfDay } from "./types";

const FOCUS_GOAL_MINUTES = 120;

interface Stats {
  focusMinutes: number;
  sessionCount: number;
  longest: number;
  goalPct: number;
  habitPct: number;
  habitTrend: number;
  spark: number[];
  habitsDone: number;
  habitsTotal: number;
  openCount: number;
  dueToday: number;
  overdue: number;
  taskPct: number;
}

interface CenterColumnProps {
  data: DashData | null;
  loadError: string | null;
  isGuest: boolean;
  username: string | null;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
}

function computeStats(data: DashData | null): Stats | null {
  if (!data) return null;
  const today = startOfDay(new Date());
  const todayIso = dayKey(today);
  const yIso = dayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1));

  // Focus
  const todaySessions = data.sessions.filter(
    (s) => s.completed && s.type === "focus" && new Date(s.started_at).getTime() >= today.getTime(),
  );
  const focusMinutes = todaySessions.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0);
  const longest = todaySessions.reduce((m, s) => Math.max(m, s.duration_minutes ?? 0), 0);
  const goalPct = Math.min(100, Math.round((focusMinutes / FOCUS_GOAL_MINUTES) * 100));

  // Habits (only habits that existed on the given day count)
  const habitsTotal = data.habits.length;
  const pctFor = (iso: string, refDay: Date) => {
    const active = data.habits.filter((h) => new Date(h.created_at) <= refDay);
    const doneSet = new Set(
      data.habitLogs.filter((l) => l.completed_at === iso).map((l) => l.habit_id),
    );
    return active.length ? Math.round((doneSet.size / active.length) * 100) : 0;
  };
  const habitPct = pctFor(todayIso, today);
  const habitTrend = habitPct - pctFor(yIso, new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1));
  const spark = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6 + i);
    return pctFor(dayKey(d), d);
  });
  const habitsDone = new Set(
    data.habitLogs.filter((l) => l.completed_at === todayIso).map((l) => l.habit_id),
  ).size;

  // Tasks
  const open = data.todos.filter((t) => !t.is_complete);
  const dueToday = open.filter((t) => t.due_date && dayKey(new Date(t.due_date)) <= todayIso);
  const overdue = open.filter((t) => t.due_date && dayKey(new Date(t.due_date)) < todayIso);
  const doneWithDueToday = data.todos.filter(
    (t) => t.is_complete && t.due_date && dayKey(new Date(t.due_date)) === todayIso,
  ).length;
  const dueTotal = dueToday.length + doneWithDueToday;
  const taskPct = dueTotal ? Math.round((doneWithDueToday / dueTotal) * 100) : 0;

  return {
    focusMinutes,
    sessionCount: todaySessions.length,
    longest,
    goalPct,
    habitPct,
    habitTrend,
    spark,
    habitsDone,
    habitsTotal,
    openCount: open.length,
    dueToday: dueToday.length,
    overdue: overdue.length,
    taskPct,
  };
}

export function CenterColumn({
  data,
  loadError,
  isGuest,
  username,
  selectedDate,
  onSelectDate,
}: CenterColumnProps) {
  const stats = useMemo(() => computeStats(data), [data]);
  const displayName = username ?? (isGuest ? "Guest" : "there");
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <section className="dash-col dash-scroll flex min-w-0 flex-col gap-4">
      {isGuest && (
        <div className="guest-banner" role="status">
          <span>
            <strong>You&apos;re using Vireo as a guest</strong> — data is stored only in this
            browser.
          </span>
          <Link href="/?mode=signup">Sign up now</Link>
        </div>
      )}
      {loadError && (
        <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-600 dark:bg-rose-400/10 dark:text-rose-300">
          {loadError} — check the Supabase env vars / run supabase/schema.sql.
        </div>
      )}

      {/* Header + utility row */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Dashboard</h1>
        <div className="flex items-center gap-2">
          <button className="utility-pill" title="Ask AI — coming soon" type="button">
            <span className="ask-dot" />
            Ask AI
          </button>
          <button className="utility-icon" title="Messages — coming soon" type="button">
            <MessageCircle size={16} />
          </button>
          <button className="utility-icon" title="Notifications — coming soon" type="button">
            <Bell size={16} />
          </button>
          <ThemeButton />
          <span className="mx-1 hidden h-6 w-px bg-slate-200 dark:bg-white/10 sm:block" />
          <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 text-[11px] font-bold text-white shadow-sm">
            {initials}
          </span>
          <span className="hidden text-sm font-semibold text-slate-700 dark:text-slate-200 sm:block">
            {displayName}
          </span>
        </div>
      </header>

      {stats && <FocusCard stats={stats} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {stats && (
          <HabitCard
            pct={stats.habitPct}
            spark={stats.spark}
            trend={stats.habitTrend}
            done={stats.habitsDone}
            total={stats.habitsTotal}
          />
        )}
        {stats && (
          <TaskCard due={stats.dueToday} open={stats.openCount} pct={stats.taskPct} overdue={stats.overdue} />
        )}
      </div>

      <HabitStreakCard data={data} selectedDate={selectedDate} onSelectDate={onSelectDate} />
      <FavouriteHabitCard data={data} />
    </section>
  );
}

function ThemeButton() {
  const [theme, setTheme] = useState<string | null>(null);
  useEffect(() => {
    setTheme(
      localStorage.getItem("vireo-theme") ??
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
    );
  }, []);
  return (
    <button
      className="utility-icon"
      title="Toggle theme"
      type="button"
      onClick={() => {
        const next = (theme ?? "light") === "dark" ? "light" : "dark";
        setTheme(next);
        localStorage.setItem("vireo-theme", next);
        document.documentElement.classList.toggle("dark", next === "dark");
      }}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

// ─── Focus card (wide, layered arc) ──────────────────────────────────────────

function FocusArc({ pct }: { pct: number }) {
  return (
    <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0">
      <defs>
        <linearGradient id="focusGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a3e635" />
          <stop offset="100%" stopColor="#8b7cf6" />
        </linearGradient>
      </defs>
      <circle cx="70" cy="70" r="64" pathLength={100} fill="none" stroke="#f6e3c5" strokeWidth="5" strokeLinecap="round" strokeDasharray="70 30" transform="rotate(150 70 70)" className="opacity-80 dark:opacity-25" />
      <circle cx="70" cy="70" r="64" pathLength={100} fill="none" stroke="#e9def8" strokeWidth="5" strokeLinecap="round" strokeDasharray="55 45" strokeDashoffset={-70} transform="rotate(150 70 70)" className="opacity-80 dark:opacity-20" />
      <circle cx="70" cy="70" r="54" pathLength={100} fill="none" strokeWidth="9" strokeLinecap="round" strokeDasharray="75 25" transform="rotate(135 70 70)" className="stroke-slate-100 dark:stroke-white/10" />
      <circle
        cx="70"
        cy="70"
        r="54"
        pathLength={100}
        fill="none"
        stroke="url(#focusGrad)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={`${75 * (pct / 100)} 100`}
        transform="rotate(135 70 70)"
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
      <text x="70" y="66" textAnchor="middle" dominantBaseline="middle" className="fill-slate-900 dark:fill-slate-100" style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em" }}>
        {pct}%
      </text>
      <text x="70" y="86" textAnchor="middle" className="fill-slate-400" style={{ fontSize: 8, letterSpacing: "0.12em" }}>
        OF DAILY GOAL
      </text>
    </svg>
  );
}

function FocusCard({ stats }: { stats: Stats }) {
  const mini = [
    { icon: Brain, chip: "bg-violet-100 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300", value: `${stats.focusMinutes}m`, label: "Total focus" },
    { icon: Zap, chip: "bg-lime-100 text-lime-700 dark:bg-lime-400/15 dark:text-lime-300", value: `${stats.sessionCount}`, label: "Sessions done" },
    { icon: Timer, chip: "bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300", value: `${stats.longest}m`, label: "Longest session" },
    { icon: Flame, chip: "bg-rose-100 text-rose-500 dark:bg-rose-400/15 dark:text-rose-300", value: `${stats.goalPct}%`, label: "Goal pace" },
  ];
  return (
    <div className="dash-card flex flex-wrap items-center justify-between gap-4 p-5">
      <div className="min-w-0">
        <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">Today&apos;s focus</h2>
        <div className="mt-4 grid grid-cols-2 gap-x-10 gap-y-4">
          {mini.map((m) => (
            <div key={m.label} className="flex items-center gap-2.5">
              <span className={`stat-chip ${m.chip}`}>
                <m.icon size={14} />
              </span>
              <div>
                <p className="text-base font-bold leading-tight text-slate-900 dark:text-slate-100">{m.value}</p>
                <p className="text-[11px] text-slate-400">{m.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <FocusArc pct={stats.goalPct} />
    </div>
  );
}

// ─── Habit + task stat cards ─────────────────────────────────────────────────

function HabitCard({
  pct,
  spark,
  trend,
  done,
  total,
}: {
  pct: number;
  spark: number[];
  trend: number;
  done: number;
  total: number;
}) {
  const trendMeta =
    trend > 0
      ? { icon: TrendingUp, cls: "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300", label: "Better than yesterday" }
      : trend < 0
        ? { icon: TrendingDown, cls: "bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300", label: "Behind yesterday" }
        : { icon: Zap, cls: "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300", label: "Steady" };
  const w = 64;
  const h = 22;
  const step = w / Math.max(1, spark.length - 1);
  const points = spark.map((v, i) => `${i * step},${h - (v / 100) * (h - 4) - 2}`).join(" ");
  const TrendIcon = trendMeta.icon;
  return (
    <div className="dash-card p-5">
      <span className="stat-chip bg-emerald-100 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300">
        <Sprout size={15} />
      </span>
      <p className="mt-3 text-xs font-medium text-slate-400">Habits</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {pct}
          <span className="text-base text-slate-400">%</span>
        </p>
        <svg viewBox={`0 0 ${w} ${h}`} className="h-6 w-16 overflow-visible">
          <polyline points={points} fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="mt-1 text-[11px] text-slate-400">
        {done} of {total} habits today
      </p>
      <span className={`insight-tag mt-3 ${trendMeta.cls}`}>
        <TrendIcon size={11} />
        {trendMeta.label}
      </span>
    </div>
  );
}

function TaskCard({
  due,
  open,
  pct,
  overdue,
}: {
  due: number;
  open: number;
  pct: number;
  overdue: number;
}) {
  const tag =
    overdue > 0
      ? { icon: AlertTriangle, cls: "bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300", label: `${overdue} overdue` }
      : { icon: Check, cls: "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300", label: due === 0 ? "Nothing due" : "On track" };
  const TagIcon = tag.icon;
  return (
    <div className="dash-card p-5">
      <span className="stat-chip bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300">
        <CheckSquare size={15} />
      </span>
      <p className="mt-3 text-xs font-medium text-slate-400">Task load</p>
      <div className="mt-1 flex items-end gap-1.5">
        <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{due}</p>
        <p className="pb-1 text-xs text-slate-400">/ {open} open</p>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-lime-400 to-emerald-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`insight-tag mt-3 ${tag.cls}`}>
        <TagIcon size={11} />
        {tag.label}
      </span>
    </div>
  );
}

// ─── Habit streak ────────────────────────────────────────────────────────────

type DayStatus = "today" | "full" | "partial" | "missed" | "none" | "future";

function StatusIcon({ status, ratio }: { status: DayStatus; ratio: number }) {
  if (status === "today" || status === "partial") {
    const stroke = status === "today" ? "#ffffff" : "#f59e0b";
    return (
      <svg viewBox="0 0 16 16" className="h-4 w-4 -rotate-90">
        <circle cx="8" cy="8" r="6" pathLength={100} fill="none" strokeWidth="2.5" stroke={stroke} opacity="0.3" />
        <circle
          cx="8"
          cy="8"
          r="6"
          pathLength={100}
          fill="none"
          strokeWidth="2.5"
          stroke={stroke}
          strokeLinecap="round"
          strokeDasharray={`${Math.round(ratio * 100)} 100`}
        />
      </svg>
    );
  }
  if (status === "full") return <Check size={12} strokeWidth={3.5} />;
  if (status === "missed") return <span className="text-[12px] font-bold leading-none">!</span>;
  return <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />;
}

function HabitStreakCard({
  data,
  selectedDate,
  onSelectDate,
}: {
  data: DashData | null;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
}) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [view, setView] = useState<"monthly" | "yearly">("monthly");
  const today = startOfDay(new Date());
  const todayIso = dayKey(today);
  const selectedIso = dayKey(selectedDate);
  const base = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();

  const ratioFor = (d: Date) => {
    if (!data) return { active: 0, done: 0 };
    const active = data.habits.filter((h) => new Date(h.created_at) <= d);
    const doneSet = new Set(
      data.habitLogs.filter((l) => l.completed_at === dayKey(d)).map((l) => l.habit_id),
    );
    return { active: active.length, done: doneSet.size };
  };

  return (
    <div className="dash-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">Habit streak</h2>
          <select
            value={monthOffset}
            onChange={(e) => setMonthOffset(Number(e.target.value))}
            className="dash-select"
          >
            <option value={0}>This month</option>
            <option value={-1}>Last month</option>
          </select>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1 dark:bg-white/5">
          <button type="button" onClick={() => setView("monthly")} className={view === "monthly" ? "seg-active" : "seg-idle"}>
            Monthly
          </button>
          <button type="button" onClick={() => setView("yearly")} className={view === "yearly" ? "seg-active" : "seg-idle"}>
            Yearly
          </button>
        </div>
      </div>

      <div className="dash-scroll mt-4 flex gap-1.5 overflow-x-auto pb-1">
        {view === "monthly"
          ? Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const d = new Date(base.getFullYear(), base.getMonth(), day);
              const { active, done } = ratioFor(d);
              const ratio = active > 0 ? done / active : 0;
              const isToday = dayKey(d) === todayIso;
              const status: DayStatus = isToday
                ? "today"
                : d > today
                  ? "future"
                  : active === 0
                    ? "none"
                    : ratio >= 1
                      ? "full"
                      : ratio > 0
                        ? "partial"
                        : "missed";
              const isSelected = dayKey(d) === selectedIso;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => onSelectDate(d)}
                  title={`${base.toLocaleDateString("en-US", { month: "short" })} ${day} — ${active > 0 ? `${Math.round(ratio * 100)}% habits` : "no habits yet"}`}
                  className={`day-tile ${
                    status === "today"
                      ? "day-today"
                      : status === "full"
                        ? "day-full"
                        : status === "partial"
                          ? "day-partial"
                          : status === "missed"
                            ? "day-missed"
                            : "day-none"
                  } ${isSelected && !isToday ? "day-selected" : ""}`}
                >
                  <StatusIcon status={status} ratio={ratio} />
                  <span>{day}</span>
                </button>
              );
            })
          : Array.from({ length: 12 }, (_, m) => {
              const dim = new Date(today.getFullYear(), m + 1, 0).getDate();
              let sum = 0;
              let counted = 0;
              for (let day = 1; day <= dim; day++) {
                const d = new Date(today.getFullYear(), m, day);
                if (d > today) continue;
                const { active, done } = ratioFor(d);
                if (active === 0) continue;
                sum += done / active;
                counted++;
              }
              const pct = counted ? Math.round((sum / counted) * 100) : -1;
              const isSelected = selectedDate.getFullYear() === today.getFullYear() && selectedDate.getMonth() === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => onSelectDate(new Date(today.getFullYear(), m, Math.min(selectedDate.getDate(), dim)))}
                  className={`day-tile ${
                    pct < 0 ? "day-none" : pct >= 80 ? "day-full" : pct > 30 ? "day-partial" : "day-missed"
                  } ${isSelected ? "day-selected" : ""}`}
                >
                  <span className="text-[10px] font-bold leading-none">{pct < 0 ? "–" : `${pct}%`}</span>
                  <span className="text-[10px] font-semibold">
                    {new Date(today.getFullYear(), m, 1).toLocaleDateString("en-US", { month: "short" }).slice(0, 3)}
                  </span>
                </button>
              );
            })}
      </div>
    </div>
  );
}

// ─── Favourite habit (comparison bars) ───────────────────────────────────────

function FavouriteHabitCard({ data }: { data: DashData | null }) {
  const today = startOfDay(new Date());
  const start = new Date(today);
  start.setDate(start.getDate() - 29);
  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - 30);

  const rows = (data?.habits ?? [])
    .map((h) => {
      const cur = (data?.habitLogs ?? []).filter(
        (l) => l.habit_id === h.id && l.completed_at >= dayKey(start) && l.completed_at <= dayKey(today),
      ).length;
      const prev = (data?.habitLogs ?? []).filter(
        (l) => l.habit_id === h.id && l.completed_at >= dayKey(prevStart) && l.completed_at < dayKey(start),
      ).length;
      return { habit: h, cur, prev };
    })
    .sort((a, b) => b.cur - a.cur);

  const max = Math.max(1, ...rows.map((r) => r.cur));
  const top = rows[0] ?? null;
  const change =
    top && top.prev > 0 ? Math.round(((top.cur - top.prev) / top.prev) * 100) : top && top.cur > 0 ? 100 : 0;
  const bubbleLeft = top ? Math.min(60, Math.round((top.cur / max) * 55)) : 0;

  return (
    <div className="dash-card p-5">
      <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">Favourite habit</h2>
      <p className="text-[11px] text-slate-400">Completions over the last 30 days</p>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">
          Add habits and check them off — your comparison shows up here.
        </p>
      ) : (
        <div className="mt-5">
          {rows.map((r, i) => {
            const isTop = i === 0 && r.cur > 0;
            const widthPct = Math.max(4, Math.round((r.cur / max) * 100));
            return (
              <div
                key={r.habit.id}
                className="relative grid grid-cols-[minmax(88px,118px)_1fr_38px] items-center gap-3 py-2"
              >
                {isTop && (
                  <>
                    <div
                      className="dash-card absolute -top-4 z-10 w-max px-4 py-1.5 text-center shadow-[0_14px_30px_rgba(20,20,30,.16)] dark:shadow-[0_14px_30px_rgba(0,0,0,.5)]"
                      style={{ left: `calc(${bubbleLeft}% + 80px)` }}
                    >
                      <p className="text-[10px] text-slate-400">{r.habit.name}</p>
                      <p className="text-lg font-bold leading-tight text-slate-900 dark:text-slate-100">{r.cur}d</p>
                      <p
                        className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                          change >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-500"
                        }`}
                      >
                        {change >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {change >= 0 ? "+" : ""}
                        {change}% vs last 30d
                      </p>
                    </div>
                    <div
                      className="absolute h-3 border-l-2 border-dashed border-slate-300 dark:border-white/25"
                      style={{ left: `calc(${bubbleLeft}% + 80px)`, top: "-4px" }}
                    />
                  </>
                )}
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <span aria-hidden="true">{r.habit.icon ?? "🌿"}</span>
                  <span className={`truncate ${isTop ? "font-bold text-slate-900 dark:text-slate-100" : ""}`}>
                    {r.habit.name}
                  </span>
                </div>
                <div className="h-4 rounded-full bg-slate-100 dark:bg-white/5">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      isTop ? "bar-fav" : "bg-slate-200 dark:bg-white/10"
                    }`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <p className="text-right text-xs font-bold text-slate-700 dark:text-slate-200">{r.cur}d</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
