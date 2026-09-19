"use client";

import { useState, useEffect } from "react";
import { CheckSquare, Plus, Trash2, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/supabase/user";

export function TodoCard() {
  const { user } = useUser();
  const [todos, setTodos] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoDueDate, setNewTodoDueDate] = useState("");
  const [loading, setLoading] = useState(false);

  // Load todos from Supabase
  useEffect(() => {
    if (!user) return;
    loadTodos();
  }, [user]);

  const loadTodos = async () => {
    if (!user) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .eq("user_id", user.id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTodos(data);
    }
  };

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTodoTitle.trim()) return;

    setLoading(true);
    const supabase = createClient();
    const maxPosition = todos.length > 0 ? Math.max(...todos.map(t => t.position || 0)) : 0;

    const { error } = await supabase
      .from("todos")
      .insert({
        user_id: user.id,
        title: newTodoTitle,
        due_date: newTodoDueDate || null,
        position: maxPosition + 1,
        is_complete: false,
        priority: 0
      });

    if (!error) {
      setNewTodoTitle("");
      setNewTodoDueDate("");
      setIsAdding(false);
      await loadTodos();
    }
    setLoading(false);
  };

  const handleToggleTodo = async (todoId: string, isComplete: boolean) => {
    if (!user) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("todos")
      .update({ is_complete: !isComplete })
      .eq("id", todoId)
      .eq("user_id", user.id);

    if (!error) {
      await loadTodos();
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    if (!user) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("todos")
      .delete()
      .eq("id", todoId)
      .eq("user_id", user.id);

    if (!error) {
      await loadTodos();
    }
  };

  const handleReorderTodos = async (todoId: string, direction: "up" | "down") => {
    const index = todos.findIndex(t => t.id === todoId);
    if (index === -1) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === todos.length - 1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const newTodos = [...todos];
    [newTodos[index], newTodos[newIndex]] = [newTodos[newIndex], newTodos[index]];

    // Update positions in Supabase
    const supabase = createClient();
    for (let i = 0; i < newTodos.length; i++) {
      await supabase
        .from("todos")
        .update({ position: i })
        .eq("id", newTodos[i].id);
    }

    setTodos(newTodos);
  };

  const formatDueDate = (dueDate: string) => {
    if (!dueDate) return "";
    const date = new Date(dueDate);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const completedCount = todos.filter(t => t.is_complete).length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 flex items-center justify-center bg-violet-400/20 dark:bg-violet-400/10 rounded-lg">
            <CheckSquare size={18} className="text-violet-400" />
          </div>
          <span className="font-semibold text-lg">Today's Todos</span>
        </div>
        <span className="text-sm text-lime-400 font-medium">{completedCount}/{todos.length}</span>
      </div>

      {/* Todo List */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-4">
        {todos.map((todo, index) => (
          <div
            key={todo.id}
            className="group flex items-center space-x-3 p-2 rounded-md hover:bg-white/5 dark:hover:bg-black/5 transition-all"
          >
            <button
              onClick={() => handleToggleTodo(todo.id, todo.is_complete)}
              className={`flex-shrink-0 w-5 h-5 rounded border-2 transition-all flex items-center justify-center
                ${todo.is_complete
                  ? "bg-lime-400 border-lime-400"
                  : "border-white/30 dark:border-black/30 hover:border-lime-400"}`}
            >
              {todo.is_complete && <span className="text-black text-sm">✓</span>}
            </button>

            <div className="flex-1 min-w-0">
              <span
                className={`text-sm transition-all ${
                  todo.is_complete
                    ? "line-through text-muted-foreground"
                    : "text-foreground"
                }`}
              >
                {todo.title}
              </span>
            </div>

            {todo.due_date && (
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <Calendar size={12} />
                <span>{formatDueDate(todo.due_date)}</span>
              </div>
            )}

            <div className="hidden group-hover:flex items-center space-x-1">
              <button
                onClick={() => handleReorderTodos(todo.id, "up")}
                disabled={index === 0}
                className="p-1 rounded hover:bg-white/10 disabled:opacity-30"
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                onClick={() => handleReorderTodos(todo.id, "down")}
                disabled={index === todos.length - 1}
                className="p-1 rounded hover:bg-white/10 disabled:opacity-30"
                aria-label="Move down"
              >
                ↓
              </button>
              <button
                onClick={() => handleDeleteTodo(todo.id)}
                className="p-1 rounded hover:bg-red-500/20 text-red-400"
                aria-label="Delete todo"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Todo Form */}
      {!isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center space-x-2 p-2 rounded-md text-lime-400 hover:bg-lime-400/10 transition-all"
        >
          <Plus size={16} />
          <span className="text-sm font-medium">Add todo</span>
        </button>
      )}

      {isAdding && (
        <form onSubmit={handleAddTodo} className="space-y-2">
          <input
            type="text"
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full px-3 py-2 rounded-md bg-white/10 dark:bg-black/10 border border-white/10 text-sm focus:outline-none focus:border-lime-400"
            autoFocus
          />
          <input
            type="date"
            value={newTodoDueDate}
            onChange={(e) => setNewTodoDueDate(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-white/10 dark:bg-black/10 border border-white/10 text-sm focus:outline-none focus:border-lime-400"
          />
          <div className="flex space-x-2">
            <button
              type="submit"
              disabled={!newTodoTitle.trim() || loading}
              className="flex-1 px-3 py-2 rounded-md bg-lime-400 text-black text-sm font-medium hover:bg-lime-400/90 disabled:opacity-50"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewTodoTitle("");
                setNewTodoDueDate("");
              }}
              className="flex-1 px-3 py-2 rounded-md border border-white/10 text-sm font-medium hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
