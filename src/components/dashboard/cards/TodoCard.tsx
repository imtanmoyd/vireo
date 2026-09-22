"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CheckSquare,
  Plus,
  Trash2,
  Calendar,
  Flag,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
} from "lucide-react";
import { useAppStore } from "@/lib/data";

interface TodoRow {
  id: string;
  title: string;
  due_date: string | null;
  is_complete: boolean;
  priority: number;
  position: number | null;
}

type Group = "overdue" | "today" | "tomorrow" | "week" | "later" | "someday";

const GROUP_ORDER: Group[] = ["overdue", "today", "tomorrow", "week", "later", "someday"];

const GROUP_LABEL: Record<Group, string> = {
  overdue: "Overdue",
  today: "Today",
  tomorrow: "Tomorrow",
  week: "This week",
  later: "Later",
  someday: "No date",
};

const GROUP_TEXT: Record<Group, string> = {
  overdue: "text-red-400",
  today: "text-amber-400",
  tomorrow: "text-blue-400",
  week: "text-violet-400",
  later: "text-muted-foreground",
  someday: "text-muted-foreground",
};

const GROUP_BADGE: Record<Group, string> = {
  overdue: "bg-red-500/15 text-red-400 border border-red-500/30",
  today: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  tomorrow: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  week: "bg-violet-500/15 text-violet-400 border border-violet-500/30",
  later: "bg-white/10 text-muted-foreground border border-white/10 dark:border-black/10",
  someday: "bg-white/5 text-muted-foreground border border-transparent",
};

const PRIORITY_TEXT: Record<number, string> = {
  0: "text-muted-foreground",
  1: "text-amber-400",
  2: "text-red-400",
};

function startOfDayMs(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function dayDiff(iso: string): number {
  return Math.round((startOfDayMs(new Date(iso)) - startOfDayMs(new Date())) / 86400000);
}

function groupOf(todo: TodoRow): Group {
  if (!todo.due_date) return "someday";
  const diff = dayDiff(todo.due_date);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff <= 7) return "week";
  return "later";
}

function formatDue(iso: string): string {
  const diff = dayDiff(iso);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** 'YYYY-MM-DD' from a date input -> end-of-day ISO timestamp. */
function dueInputToIso(input: string): string | null {
  if (!input) return null;
  const d = new Date(`${input}T23:59:59`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function sortTodos(a: TodoRow, b: TodoRow): number {
  const pa = a.position ?? 0;
  const pb = b.position ?? 0;
  if (pa !== pb) return pa - pb;
  return (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999");
}

export function TodoCard() {
  const { store, ownerId } = useAppStore();
  const [todos, setTodos] = useState<TodoRow[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [dueInput, setDueInput] = useState("");
  const [priority, setPriority] = useState(1);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<Group>>(new Set());
  const [showDone, setShowDone] = useState(false);

  const loadTodos = useCallback(async () => {
    const s = store;
    if (!s || !ownerId) return;
    try {
      const rows = await s.list<TodoRow>("todos", {
        order: [
          { column: "position", ascending: true },
          { column: "created_at", ascending: false },
        ],
      });
      setTodos(rows);
    } catch (e) {
      console.error("[TodoCard] Failed to load todos:", e);
    }
  }, [store, ownerId]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    const s = store;
    if (!s || !title.trim()) return;
    setSaving(true);
    const maxPosition = todos.length > 0 ? Math.max(...todos.map((t) => t.position ?? 0)) : 0;
    const { error } = await s.insert("todos", {
      title: title.trim(),
      due_date: dueInputToIso(dueInput),
      position: maxPosition + 1,
      is_complete: false,
      priority,
    });
    if (error) console.error("[TodoCard] Failed to add todo:", error);
    setTitle("");
    setDueInput("");
    setPriority(1);
    setIsAdding(false);
    setSaving(false);
    await loadTodos();
  };

  const handleToggle = async (todo: TodoRow) => {
    const s = store;
    if (!s) return;
    const { error } = await s.update("todos", todo.id, { is_complete: !todo.is_complete });
    if (error) console.error("[TodoCard] Failed to update todo:", error);
    else await loadTodos();
  };

  const handleDelete = async (id: string) => {
    const s = store;
    if (!s) return;
    const { error } = await s.remove("todos", id);
    if (error) console.error("[TodoCard] Failed to delete todo:", error);
    else await loadTodos();
  };

  const handleReorder = async (groupItems: TodoRow[], todo: TodoRow, dir: "up" | "down") => {
    const s = store;
    if (!s) return;
    const index = groupItems.findIndex((t) => t.id === todo.id);
    if (index === -1) return;
    const neighbor = dir === "up" ? groupItems[index - 1] : groupItems[index + 1];
    if (!neighbor) return;
    const aPos = todo.position ?? groupItems.indexOf(todo);
    const bPos = neighbor.position ?? groupItems.indexOf(neighbor);
    await s.update("todos", todo.id, { position: bPos });
    await s.update("todos", neighbor.id, { position: aPos });
    await loadTodos();
  };

  const grouped = useMemo(() => {
    const map = {} as Record<Group, TodoRow[]>;
    for (const g of GROUP_ORDER) map[g] = [];
    for (const t of todos) {
      if (!t.is_complete) map[groupOf(t)].push(t);
    }
    for (const g of GROUP_ORDER) map[g].sort(sortTodos);
    return map;
  }, [todos]);

  const completed = todos.filter((t) => t.is_complete);
  const overdueCount = grouped.overdue.length;
  const remaining = todos.filter((t) => !t.is_complete).length;

  const toggleGroup = (g: Group) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });

  const inputClass =
    "w-full rounded-md bg-white/10 dark:bg-black/10 border border-white/10 dark:border-black/10 px-3 py-2 text-sm focus:outline-none focus:border-lime-400";

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {remaining} open
          {overdueCount > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 font-medium text-red-400">
              <AlertTriangle size={11} />
              {overdueCount} overdue
            </span>
          )}
        </p>
        <button
          onClick={() => setIsAdding((v) => !v)}
          className="flex items-center gap-1 rounded-md p-1.5 text-xs font-medium text-accent hover:bg-lime-400/10"
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddTodo} className="mb-3 space-y-2 rounded-lg bg-white/5 dark:bg-black/5 p-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            className={inputClass}
            autoFocus
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={dueInput}
              onChange={(e) => setDueInput(e.target.value)}
              className={inputClass}
              aria-label="Due date"
            />
            <select
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className={`${inputClass} w-28`}
              aria-label="Priority"
            >
              <option value={0}>Low</option>
              <option value={1}>Medium</option>
              <option value={2}>High</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={!title.trim() || saving} className="button-primary flex-1">
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setTitle("");
                setDueInput("");
              }}
              className="button-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {todos.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <CheckSquare size={24} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nothing yet.</p>
            <p className="text-xs text-muted-foreground">Add your first task above.</p>
          </div>
        ) : (
          <>
            {GROUP_ORDER.map((g) => {
              const items = grouped[g];
              if (items.length === 0) return null;
              const isOpen = !collapsed.has(g);
              return (
                <section key={g}>
                  <button onClick={() => toggleGroup(g)} className="mb-1 flex w-full items-center gap-1.5">
                    {isOpen ? (
                      <ChevronDown size={12} className="text-muted-foreground" />
                    ) : (
                      <ChevronRight size={12} className="text-muted-foreground" />
                    )}
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${GROUP_TEXT[g]}`}>
                      {GROUP_LABEL[g]}
                    </span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${GROUP_BADGE[g]}`}>
                      {items.length}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="space-y-1">
                      {items.map((todo) => (
                        <TodoRowItem
                          key={todo.id}
                          todo={todo}
                          group={g}
                          groupItems={items}
                          onToggle={handleToggle}
                          onDelete={handleDelete}
                          onReorder={handleReorder}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}

            {completed.length > 0 && (
              <section className="pt-1">
                <button onClick={() => setShowDone((v) => !v)} className="mb-1 flex w-full items-center gap-1.5">
                  {showDone ? (
                    <ChevronDown size={12} className="text-muted-foreground" />
                  ) : (
                    <ChevronRight size={12} className="text-muted-foreground" />
                  )}
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Done</span>
                  <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {completed.length}
                  </span>
                </button>
                {showDone && (
                  <div className="space-y-1 opacity-60">
                    {completed.map((todo) => (
                      <div key={todo.id} className="group flex items-center gap-2.5 rounded-lg p-2 hover:bg-white/5 dark:hover:bg-black/5">
                        <button
                          onClick={() => handleToggle(todo)}
                          className="shrink-0 text-accent"
                          aria-label="Mark as not done"
                        >
                          <CheckSquare size={16} />
                        </button>
                        <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground line-through">
                          {todo.title}
                        </p>
                        <button
                          onClick={() => handleDelete(todo.id)}
                          className="hidden shrink-0 rounded p-1 text-red-400 hover:bg-red-500/20 group-hover:block"
                          aria-label="Delete todo"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface RowItemProps {
  todo: TodoRow;
  group: Group;
  groupItems: TodoRow[];
  onToggle: (todo: TodoRow) => void;
  onDelete: (id: string) => void;
  onReorder: (groupItems: TodoRow[], todo: TodoRow, dir: "up" | "down") => void;
}

function TodoRowItem({ todo, group, groupItems, onToggle, onDelete, onReorder }: RowItemProps) {
  const index = groupItems.findIndex((t) => t.id === todo.id);
  return (
    <div className="group flex items-start gap-2.5 rounded-lg p-2 hover:bg-white/5 dark:hover:bg-black/5">
      <button
        onClick={() => onToggle(todo)}
        className="mt-0.5 shrink-0 text-muted-foreground hover:text-accent"
        aria-label="Toggle complete"
      >
        <CheckSquare size={15} className="opacity-50" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{todo.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {todo.due_date && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                GROUP_BADGE[group]
              }`}
            >
              <Calendar size={9} />
              {formatDue(todo.due_date)}
            </span>
          )}
          <Flag size={10} className={PRIORITY_TEXT[todo.priority] ?? "text-muted-foreground"} />
        </div>
      </div>
      <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
        <button
          onClick={() => onReorder(groupItems, todo, "up")}
          disabled={index === 0}
          className="rounded p-1 text-muted-foreground hover:bg-white/10 disabled:opacity-30"
          aria-label="Move up"
        >
          <ArrowUp size={12} />
        </button>
        <button
          onClick={() => onReorder(groupItems, todo, "down")}
          disabled={index === groupItems.length - 1}
          className="rounded p-1 text-muted-foreground hover:bg-white/10 disabled:opacity-30"
          aria-label="Move down"
        >
          <ArrowDown size={12} />
        </button>
        <button
          onClick={() => onDelete(todo.id)}
          className="rounded p-1 text-red-400 hover:bg-red-500/20"
          aria-label="Delete todo"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
