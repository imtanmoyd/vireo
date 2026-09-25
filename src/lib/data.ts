// TEMPORARY: guest mode — remove once core app is stable.
// The GuestDataStore below (and the "guest" branch of createDataStore /
// AppStoreState) is part of the temporary guest feature.
//
// Migration note: guest rows are deliberately shaped exactly like the
// matching Supabase table columns (including the user_id column, filled with
// the guest id), so a future "claim your data" flow can copy localStorage
// rows straight into the user's Supabase account without any rewriting —
// just replace user_id with the new account id and insert.

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { type AppSession, getAppSession } from "./auth";

export type DataTable =
  | "todos"
  | "habits"
  | "habit_logs"
  | "journal_entries"
  | "events"
  | "routines"
  | "routine_blocks"
  | "routine_block_logs"
  | "pomodoro_sessions";

export type Row = Record<string, any> & { id: string };

export interface ListOptions {
  order?: Array<{ column: string; ascending?: boolean }>;
}

export type WriteResult = { error: string | null };

export interface DataStore {
  list<T = Row>(table: DataTable, options?: ListOptions): Promise<T[]>;
  insert(
    table: DataTable,
    row: Record<string, unknown>,
  ): Promise<WriteResult>;
  update(
    table: DataTable,
    id: string,
    patch: Record<string, unknown>,
  ): Promise<WriteResult>;
  remove(table: DataTable, id: string): Promise<WriteResult>;
  getProfile<T = Record<string, any>>(): Promise<T | null>;
  updateProfile(patch: Record<string, unknown>): Promise<WriteResult>;
}

/** Backed by Supabase; every query is scoped to the signed-in user. */
class SupabaseDataStore implements DataStore {
  constructor(private userId: string) {}

  async list<T = Row>(table: DataTable, options?: ListOptions): Promise<T[]> {
    const supabase = createClient();
    let query = supabase.from(table).select("*").eq("user_id", this.userId);
    for (const o of options?.order ?? []) {
      query = query.order(o.column, { ascending: o.ascending ?? true });
    }
    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    return (data ?? []) as T[];
  }

  async insert(
    table: DataTable,
    row: Record<string, unknown>,
  ): Promise<WriteResult> {
    const supabase = createClient();
    const { error } = await supabase
      .from(table)
      .insert({ ...row, user_id: this.userId });
    return { error: error ? error.message : null };
  }

  async update(
    table: DataTable,
    id: string,
    patch: Record<string, unknown>,
  ): Promise<WriteResult> {
    const supabase = createClient();
    const { error } = await supabase
      .from(table)
      .update(patch)
      .eq("id", id)
      .eq("user_id", this.userId);
    return { error: error ? error.message : null };
  }

  async remove(table: DataTable, id: string): Promise<WriteResult> {
    const supabase = createClient();
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("id", id)
      .eq("user_id", this.userId);
    return { error: error ? error.message : null };
  }

  async getProfile<T = Record<string, any>>(): Promise<T | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", this.userId)
      .maybeSingle();
    if (error) {
      console.error("[data] getProfile:", error.message);
      return null;
    }
    return (data ?? null) as T | null;
  }

  async updateProfile(patch: Record<string, unknown>): Promise<WriteResult> {
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", this.userId);
    return { error: error ? error.message : null };
  }
}

// TEMPORARY: guest mode — remove once core app is stable.
/** Backed by localStorage; row shapes mirror the Supabase tables. */
class GuestDataStore implements DataStore {
  constructor(private guestId: string) {}

  private storageKey(table: string): string {
    return `vireo-guest:${this.guestId}:${table}`;
  }

  private read<T>(table: string): T[] {
    try {
      const raw = window.localStorage.getItem(this.storageKey(table));
      return raw ? (JSON.parse(raw) as T[]) : [];
    } catch {
      return [];
    }
  }

  private write<T>(table: string, rows: T[]): void {
    window.localStorage.setItem(this.storageKey(table), JSON.stringify(rows));
  }

  async list<T = Row>(table: DataTable, options?: ListOptions): Promise<T[]> {
    const rows = this.read<T>(table);
    const order = options?.order;
    if (!order || order.length === 0) return rows;
    return [...rows].sort((a, b) => {
      for (const o of order) {
        const av = (a as Record<string, unknown>)[o.column] as string | number | null;
        const bv = (b as Record<string, unknown>)[o.column] as string | number | null;
        if (av === bv) continue;
        const cmp = (av ?? "") > (bv ?? "") ? 1 : (av ?? "") < (bv ?? "") ? -1 : 0;
        return o.ascending === false ? -cmp : cmp;
      }
      return 0;
    });
  }

  async insert(
    table: DataTable,
    row: Record<string, unknown>,
  ): Promise<WriteResult> {
    try {
      const rows = this.read<Row>(table);
      const now = new Date().toISOString();
      rows.push({
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        user_id: this.guestId,
        created_at: now,
        ...row,
      } as Row);
      this.write(table, rows);
      return { error: null };
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : "Failed to save locally",
      };
    }
  }

  async update(
    table: DataTable,
    id: string,
    patch: Record<string, unknown>,
  ): Promise<WriteResult> {
    try {
      const rows = this.read<Row>(table);
      const index = rows.findIndex((r) => r.id === id);
      if (index === -1) return { error: "Item not found" };
      rows[index] = { ...rows[index], ...patch };
      this.write(table, rows);
      return { error: null };
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : "Failed to save locally",
      };
    }
  }

  async remove(table: DataTable, id: string): Promise<WriteResult> {
    try {
      this.write(
        table,
        this.read<Row>(table).filter((r) => r.id !== id),
      );
      return { error: null };
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : "Failed to save locally",
      };
    }
  }

  async getProfile<T = Record<string, any>>(): Promise<T | null> {
    try {
      const raw = window.localStorage.getItem(this.storageKey("profile"));
      if (raw) return JSON.parse(raw) as T;
    } catch {
      // fall through to the default profile
    }
    return {
      id: this.guestId,
      display_name: "Guest",
      dashboard_layout: {},
      theme_prefs: {},
    } as T;
  }

  async updateProfile(patch: Record<string, unknown>): Promise<WriteResult> {
    try {
      const current = (await this.getProfile()) ?? {};
      window.localStorage.setItem(
        this.storageKey("profile"),
        JSON.stringify({ ...current, ...patch }),
      );
      return { error: null };
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : "Failed to save locally",
      };
    }
  }
}

export function createDataStore(session: AppSession): DataStore | null {
  switch (session.kind) {
    case "user":
      return new SupabaseDataStore(session.userId);
    case "guest": // TEMPORARY: guest mode — remove once core app is stable
      return new GuestDataStore(session.guestId);
    default:
      return null;
  }
}

export interface AppStoreState {
  session: AppSession;
  store: DataStore | null;
  loading: boolean;
  /** The signed-in user id, or the guest id for guest sessions. */
  ownerId: string | null;
  isGuest: boolean;
  username: string | null;
}

export function useAppStore(): AppStoreState {
  const [session, setSession] = useState<AppSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getAppSession().then((resolved) => {
      if (!cancelled) {
        setSession(resolved);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const store = useMemo(
    () => (session ? createDataStore(session) : null),
    [session],
  );

  const ownerId =
    session?.kind === "user"
      ? session.userId
      : session?.kind === "guest"
        ? session.guestId
        : null;

  return {
    session: session ?? { kind: "none" },
    store,
    loading,
    ownerId,
    isGuest: session?.kind === "guest",
    username: session?.kind === "user" ? session.username : null,
  };
}

