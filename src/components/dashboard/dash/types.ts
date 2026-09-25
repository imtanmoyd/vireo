// Shared types + date helpers for the three-column dashboard.

export interface TodoRow {
  id: string;
  title: string;
  due_date: string | null;
  is_complete: boolean;
  priority: number | null;
}

export interface HabitRow {
  id: string;
  name: string;
  icon: string | null;
  current_streak: number | null;
  created_at: string;
}

export interface HabitLogRow {
  id: string;
  habit_id: string;
  completed_at: string;
}

export interface SessionRow {
  started_at: string;
  duration_minutes: number;
  type: string | null;
  completed: boolean;
}

export interface BlockRow {
  id: string;
  title: string;
  day_of_week: number;
  start_time: string;
  duration_minutes: number;
  color: string | null;
}

export interface BlockLogRow {
  id: string;
  block_id: string;
  completed_date: string;
}

export interface EventRow {
  id: string;
  title: string;
  start_time: string;
  end_time: string | null;
  completed: boolean | null;
}

export interface DashData {
  todos: TodoRow[];
  habits: HabitRow[];
  habitLogs: HabitLogRow[];
  sessions: SessionRow[];
  blocks: BlockRow[];
  blockLogs: BlockLogRow[];
  events: EventRow[];
}

export type DashMode = "work" | "personal" | "recovery";

export interface RailWidgetRef {
  id: string;
  order: number;
}

export interface RailLayout {
  widgets: RailWidgetRef[] | null;
  mode: DashMode;
  customized: boolean;
  raw: Record<string, unknown>;
}

/** Local YYYY-MM-DD key for a date (no UTC drift). */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfDay(d: Date): Date {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}

/** 0 = Monday .. 6 = Sunday (matches routine_blocks.day_of_week). */
export function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** Monday of the week containing d. */
export function startOfWeek(d: Date): Date {
  const n = startOfDay(d);
  n.setDate(n.getDate() - mondayIndex(n));
  return n;
}

/** 'HH:MM' -> minutes since midnight. */
export function hhmmToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** 'HH:MM' -> '7:00 AM'. */
export function formatHhmm(t: string): string {
  const mins = hhmmToMinutes(t);
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  return `${h24 % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatTimeOfDay(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
