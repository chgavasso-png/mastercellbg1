import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const remote: SupabaseClient | null = url && key ? createClient(url, key) : null;

export const TABLE = "records";

export type Row = { collection: string; id: string; created_at: string; data: Record<string, unknown> };

const errorListeners = new Set<(message: string) => void>();

export const onSyncError = (listener: (message: string) => void) => {
  errorListeners.add(listener);
  return () => {
    errorListeners.delete(listener);
  };
};

export const reportSyncError = (message: string) => errorListeners.forEach((l) => l(message));

const pending = new Set<Promise<unknown>>();

export const track = <T,>(promise: Promise<T>) => {
  pending.add(promise);
  promise.finally(() => pending.delete(promise));
  return promise;
};

export const whenReady = () => Promise.allSettled([...pending]);

const reloaders = new Set<() => Promise<unknown>>();

export const onReload = (fn: () => Promise<unknown>) => reloaders.add(fn);

export const reloadAll = () => Promise.allSettled([...reloaders].map((fn) => fn()));

export async function nextNumber(kind: "order" | "repair") {
  if (!remote) return undefined;
  const { data, error } = await remote.rpc("next_number", { kind });
  if (error) throw new Error(error.message);
  return Number(data);
}
