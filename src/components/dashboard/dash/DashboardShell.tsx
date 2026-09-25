"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { useAppStore } from "@/lib/data";
import { LeftRail } from "./LeftRail";
import { CenterColumn } from "./CenterColumn";
import { RightColumn } from "./RightColumn";
import {
  type DashData,
  type DashMode,
  type RailLayout,
  startOfDay,
} from "./types";

const MODES: DashMode[] = ["work", "personal", "recovery"];

export function DashboardShell() {
  const { session, store, loading, isGuest, username } = useAppStore();
  const [data, setData] = useState<DashData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rail, setRail] = useState<RailLayout>({
    widgets: null,
    mode: "work",
    customized: false,
    raw: {},
  });
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(new Date()));

  const loadAll = useCallback(async () => {
    const s = store;
    if (!s) return;
    try {
      const [todos, habits, habitLogs, sessions, blocks, blockLogs, events] = await Promise.all([
        s.list("todos", { order: [{ column: "created_at", ascending: false }] }),
        s.list("habits", { order: [{ column: "created_at", ascending: true }] }),
        s.list("habit_logs", { order: [{ column: "completed_at", ascending: true }] }),
        s.list("pomodoro_sessions", { order: [{ column: "started_at", ascending: false }] }),
        s.list("routine_blocks", {
          order: [
            { column: "day_of_week", ascending: true },
            { column: "start_time", ascending: true },
          ],
        }),
        s.list("routine_block_logs", { order: [{ column: "completed_date", ascending: true }] }),
        s.list("events", { order: [{ column: "start_time", ascending: true }] }),
      ]);
      setData({ todos, habits, habitLogs, sessions, blocks, blockLogs, events });
      setLoadError(null);
    } catch (e) {
      console.error("[Dashboard] Failed to load data:", e);
      setLoadError(e instanceof Error ? e.message : "Failed to load data");
    }
  }, [store]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Persisted rail layout (mode + widget stack) from the profile.
  useEffect(() => {
    const s = store;
    if (!s) return;
    let cancelled = false;
    (async () => {
      try {
        const profile = await s.getProfile<{ dashboard_layout?: Record<string, unknown> } | null>();
        const dl = (profile?.dashboard_layout ?? {}) as Record<string, unknown>;
        if (cancelled) return;
        const mode =
          typeof dl.mode === "string" && (MODES as string[]).includes(dl.mode)
            ? (dl.mode as DashMode)
            : "work";
        setRail({
          widgets: Array.isArray(dl.left_widgets) ? (dl.left_widgets as RailLayout["widgets"]) : null,
          mode,
          customized: dl.rail_customized === true,
          raw: dl,
        });
      } catch (e) {
        console.error("[Dashboard] Failed to load layout:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [store]);

  const saveRail = useCallback(
    async (patch: { widgets?: RailLayout["widgets"]; mode?: DashMode; customized?: boolean }) => {
      const s = store;
      if (!s) return;
      const merged = { ...rail.raw };
      if (patch.widgets !== undefined) merged.left_widgets = patch.widgets;
      if (patch.mode !== undefined) merged.mode = patch.mode;
      if (patch.customized !== undefined) merged.rail_customized = patch.customized;
      setRail((prev) => ({
        widgets: patch.widgets !== undefined ? patch.widgets : prev.widgets,
        mode: patch.mode !== undefined ? patch.mode : prev.mode,
        customized: patch.customized !== undefined ? patch.customized : prev.customized,
        raw: merged,
      }));
      const { error } = await s.updateProfile({ dashboard_layout: merged });
      if (error) console.error("[Dashboard] Failed to save layout:", error);
    },
    [store, rail.raw],
  );

  if (loading) {
    return (
      <div className="dash-shell">
        <div className="col-span-full place-self-center">
          <LoaderCircle className="h-7 w-7 animate-spin text-lime-500" />
        </div>
      </div>
    );
  }

  if (!store || session.kind === "none") {
    return (
      <div className="dash-shell">
        <div className="col-span-full place-self-center">
          <div className="dash-card max-w-sm p-8 text-center">
            <p className="text-sm text-slate-500">
              Sign in or continue as a guest to see your dashboard.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-full bg-lime-400 px-5 py-2 text-sm font-bold text-[#101408]"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-shell">
      <LeftRail
        store={store}
        data={data}
        username={username}
        isGuest={isGuest}
        rail={rail}
        onSaveRail={saveRail}
      />
      <CenterColumn
        data={data}
        loadError={loadError}
        isGuest={isGuest}
        username={username}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />
      <RightColumn
        store={store}
        data={data}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onRefresh={loadAll}
      />
    </div>
  );
}
