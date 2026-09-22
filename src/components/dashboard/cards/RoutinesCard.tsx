"use client";

import { useState, useEffect, useCallback } from "react";
import { GitBranch, Plus, Trash2, Clock, X } from "lucide-react";
import { useAppStore } from "@/lib/data";

interface RoutineBlock {
  id: string;
  title: string;
  day_of_week: number;
  start_time: string;
  duration_minutes: number;
  color: string | null;
  position: number | null;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const BLOCK_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#3b82f6", "#ec4899", "#14b8a6", "#f97316"];

/** 0 = Monday .. 6 = Sunday (matches the day_of_week column). */
function todayIndex(): number {
  return (new Date().getDay() + 6) % 7;
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const hour24 = h || 0;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  return `${hour24 % 12 || 12}:${String(m || 0).padStart(2, "0")} ${suffix}`;
}

function endTime(block: RoutineBlock): string {
  const end = toMinutes(block.start_time) + (block.duration_minutes || 0);
  const h = Math.floor(end / 60) % 24;
  const m = end % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function RoutinesCard() {
  const { store } = useAppStore();
  const [blocks, setBlocks] = useState<RoutineBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(todayIndex());
  const [showModal, setShowModal] = useState(false);

  const loadBlocks = useCallback(async () => {
    const s = store;
    if (!s) return;
    try {
      const rows = await s.list<RoutineBlock>("routine_blocks", {
        order: [
          { column: "day_of_week", ascending: true },
          { column: "start_time", ascending: true },
        ],
      });
      setBlocks(rows);
    } catch (e) {
      console.error("[RoutinesCard] Failed to load blocks:", e);
    } finally {
      setLoading(false);
    }
  }, [store]);

  useEffect(() => {
    loadBlocks();
  }, [loadBlocks]);

  const handleDelete = async (id: string) => {
    const s = store;
    if (!s) return;
    const { error } = await s.remove("routine_blocks", id);
    if (error) console.error("[RoutinesCard] Failed to delete block:", error);
    else await loadBlocks();
  };

  const today = todayIndex();
  const todayCount = blocks.filter((b) => b.day_of_week === today).length;
  const dayBlocks = blocks
    .filter((b) => b.day_of_week === activeDay)
    .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));

  return (
    <div className="flex h-full flex-col">
      {/* Sub-header */}
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {todayCount === 0
            ? "Nothing scheduled today"
            : `${todayCount} block${todayCount === 1 ? "" : "s"} today`}
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1 rounded-md p-1.5 text-xs font-medium text-accent hover:bg-lime-400/10"
        >
          <Plus size={14} />
          Add block
        </button>
      </div>

      {/* Day tabs */}
      <div className="mb-3 grid grid-cols-7 gap-1">
        {DAYS.map((d, i) => {
          const count = blocks.filter((b) => b.day_of_week === i).length;
          const isActive = activeDay === i;
          const isToday = i === today;
          return (
            <button
              key={d}
              onClick={() => setActiveDay(i)}
              className={`relative rounded-md py-1.5 text-[11px] font-medium transition-colors ${
                isActive
                  ? "bg-lime-400 text-black"
                  : isToday
                    ? "bg-lime-400/10 text-lime-400"
                    : "bg-white/5 dark:bg-black/5 text-muted-foreground hover:bg-white/10 dark:hover:bg-black/10"
              }`}
            >
              {d}
              {count > 0 && (
                <span
                  className={`absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold ${
                    isActive ? "bg-black text-lime-400" : "bg-lime-400 text-black"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Blocks for the selected day */}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="loading-spinner" />
          </div>
        ) : dayBlocks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <GitBranch size={22} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No blocks for {DAYS[activeDay]}.</p>
            <p className="text-xs text-muted-foreground">Add one to start building the week.</p>
          </div>
        ) : (
          dayBlocks.map((block) => (
            <div
              key={block.id}
              className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5 transition-colors hover:bg-white/10 dark:border-black/10 dark:bg-black/5 dark:hover:bg-black/10"
            >
              <span
                className="h-8 w-1 shrink-0 rounded-full"
                style={{ backgroundColor: block.color || "#6366f1" }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{block.title}</p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock size={9} />
                  {formatTime(block.start_time)} - {endTime(block)}
                </p>
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground">{block.duration_minutes}m</span>
              <button
                onClick={() => handleDelete(block.id)}
                className="hidden shrink-0 rounded p-1 text-red-400 hover:bg-red-500/20 group-hover:block"
                aria-label="Delete block"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <AddBlockModal
          onClose={() => setShowModal(false)}
          onAdded={() => {
            setShowModal(false);
            loadBlocks();
          }}
          store={store}
          defaultDay={activeDay}
        />
      )}
    </div>
  );
}

function AddBlockModal({
  onClose,
  onAdded,
  store,
  defaultDay,
}: {
  onClose: () => void;
  onAdded: () => void;
  store: ReturnType<typeof useAppStore>["store"];
  defaultDay: number;
}) {
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(defaultDay);
  const [startTime, setStartTime] = useState("09:00");
  const [duration, setDuration] = useState(30);
  const [color, setColor] = useState(BLOCK_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const s = store;
    if (!s || !title.trim()) return;
    setSaving(true);
    const { error } = await s.insert("routine_blocks", {
      title: title.trim(),
      day_of_week: day,
      start_time: startTime,
      duration_minutes: duration,
      color,
      position: 0,
    });
    if (error) console.error("[RoutinesCard] Failed to add block:", error);
    setSaving(false);
    if (!error) onAdded();
  };

  const inputClass =
    "w-full rounded-md bg-white/10 dark:bg-black/10 border border-white/10 dark:border-black/10 px-3 py-2 text-sm focus:outline-none focus:border-lime-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-white p-5 dark:border-black/10 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Add routine block</h2>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-white/10 dark:hover:bg-black/10"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Morning run, Deep work..."
            className={inputClass}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Day</label>
              <select value={day} onChange={(e) => setDay(Number(e.target.value))} className={inputClass}>
                {DAYS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Start</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Duration: {duration} min</label>
            <input
              type="range"
              min={15}
              max={240}
              step={15}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full accent-lime-400"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>15m</span>
              <span>1h</span>
              <span>2h</span>
              <span>4h</span>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">Color</label>
            <div className="flex gap-2">
              {BLOCK_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full transition-transform ${
                    color === c
                      ? "scale-125 ring-2 ring-lime-400 ring-offset-2 ring-offset-white dark:ring-offset-gray-900"
                      : ""
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>
          <button type="submit" disabled={!title.trim() || saving} className="button-primary w-full">
            {saving ? "Adding..." : "Add block"}
          </button>
        </form>
      </div>
    </div>
  );
}
