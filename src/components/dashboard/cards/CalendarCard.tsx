"use client";

import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/data";

/** Realtime only applies to Supabase-backed sessions; guests just re-render. */
function createEventsChannel(userId: string, onChange: () => void) {
  const supabase = createClient();
  return supabase
    .channel(`events:user_id=eq.${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "events",
        filter: `user_id=eq.${userId}`,
      },
      onChange,
    )
    .subscribe();
}

export function CalendarCard() {
  const { session, store } = useAppStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventTime, setNewEventTime] = useState("09:00");
  const [loading, setLoading] = useState(false);

  // Load events on mount and subscribe to realtime changes
  useEffect(() => {
    if (!store) return;
    loadEvents();

    // Realtime subscriptions only apply to Supabase-backed sessions; guest
    // data lives in localStorage and updates on the next render anyway.
    const channel =
      session?.kind === "user" ? createEventsChannel(session.userId, () => loadEvents()) : null;

    return () => {
      channel?.unsubscribe();
    };
  }, [store, session]);

  const loadEvents = async () => {
    const s = store;
    if (!s) return;
    try {
      const rows = await s.list("events", {
        order: [{ column: "start_time", ascending: true }],
      });
      setEvents(rows);
    } catch (e) {
      console.error("[CalendarCard] Failed to load events:", e);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const s = store;
    if (!s || !newEventTitle.trim() || !selectedDate) return;

    setLoading(true);

    const [hours, minutes] = newEventTime.split(":").map(Number);
    const eventDate = new Date(selectedDate);
    eventDate.setHours(hours, minutes, 0);

    const { error } = await s.insert("events", {
      title: newEventTitle,
      start_time: eventDate.toISOString(),
      end_time: new Date(eventDate.getTime() + 60 * 60 * 1000).toISOString(),
      all_day: false
    });

    if (error) {
      console.error("[CalendarCard] Failed to add event:", error);
    } else {
      setNewEventTitle("");
      setNewEventTime("09:00");
      setIsAddingEvent(false);
      await loadEvents();
    }
    setLoading(false);
  };

  const handleDeleteEvent = async (eventId: string) => {
    const s = store;
    if (!s) return;

    const { error } = await s.remove("events", eventId);
    if (error) {
      console.error("[CalendarCard] Failed to delete event:", error);
    } else {
      await loadEvents();
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start_time);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const monthName = currentDate.toLocaleDateString("en-US", { month: "short" });
  const year = currentDate.getFullYear();
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 flex items-center justify-center bg-lime-400/20 dark:bg-lime-400/10 rounded-lg">
            <CalendarIcon size={18} className="text-accent" />
          </div>
          <span className="font-semibold text-lg">Calendar</span>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-1 rounded hover:bg-white/10 dark:hover:bg-black/10"
          aria-label="Previous month"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold">
          {monthName} {year}
        </span>
        <button
          onClick={handleNextMonth}
          className="p-1 rounded hover:bg-white/10 dark:hover:bg-black/10"
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2 text-xs font-semibold text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-center h-6">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 flex-1 overflow-hidden">
        {emptyDays.map((_, i) => (
          <div key={`empty-${i}`} className="bg-white/5 dark:bg-black/5 rounded" />
        ))}
        {days.map((day) => {
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
          const dayEvents = getEventsForDate(date);
          const isSelected = selectedDate?.toDateString() === date.toDateString();
          const isToday = new Date().toDateString() === date.toDateString();

          return (
            <button
              key={day}
              onClick={() => setSelectedDate(date)}
              className={`p-1 rounded text-xs font-semibold transition-all
                ${isSelected ? "bg-lime-400 text-black" : ""}
                ${isToday && !isSelected ? "border-2 border-lime-400" : ""}
                ${!isSelected && !isToday ? "hover:bg-white/10 dark:hover:bg-black/10" : ""}`}
            >
              <div>{day}</div>
              {dayEvents.length > 0 && (
                <div className="text-xs font-semibold text-accent">{dayEvents.length}•</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Date Events */}
      {selectedDate && (
        <div className="mt-4 pt-4 border-t border-white/10 dark:border-black/10">
          <div className="text-xs font-semibold text-muted-foreground mb-2">
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric"
            })}
          </div>

          <div className="space-y-2 max-h-[120px] overflow-y-auto">
            {getEventsForDate(selectedDate).map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-2 rounded bg-white/5 dark:bg-black/5 text-xs"
              >
                <div>
                  <div className="font-medium">{event.title}</div>
                  <div className="text-muted-foreground">
                    {new Date(event.start_time).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteEvent(event.id)}
                  className="p-1 rounded hover:bg-red-500/20 text-red-400"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          {!isAddingEvent && (
            <button
              onClick={() => setIsAddingEvent(true)}
              className="mt-2 flex items-center space-x-1 p-2 rounded text-accent hover:bg-lime-400/10 text-xs font-medium w-full justify-center"
            >
              <Plus size={14} />
              <span>Add event</span>
            </button>
          )}

          {isAddingEvent && (
            <form onSubmit={handleAddEvent} className="mt-2 space-y-2">
              <input
                type="text"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                placeholder="Event title"
                className="w-full px-2 py-1 rounded text-xs bg-white/10 dark:bg-black/10 border border-white/10 focus:outline-none focus:border-lime-400"
                autoFocus
              />
              <input
                type="time"
                value={newEventTime}
                onChange={(e) => setNewEventTime(e.target.value)}
                className="w-full px-2 py-1 rounded text-xs bg-white/10 dark:bg-black/10 border border-white/10 focus:outline-none focus:border-lime-400"
              />
              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={!newEventTitle.trim() || loading}
                  className="flex-1 px-2 py-1 rounded bg-lime-400 text-black text-xs font-medium hover:bg-lime-400/90 disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingEvent(false);
                    setNewEventTitle("");
                    setNewEventTime("09:00");
                  }}
                  className="flex-1 px-2 py-1 rounded border border-white/10 text-xs font-medium hover:bg-white/5"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
