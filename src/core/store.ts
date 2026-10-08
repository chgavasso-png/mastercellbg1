import { useSyncExternalStore } from "react";
import { TABLE, onReload, remote, reportSyncError, track, type Row } from "./remote";

export type Entity = { id: string; createdAt: string };
export type Draft<T extends Entity> = Omit<T, "id" | "createdAt"> & Partial<Pick<T, "id" | "createdAt">>;

const PREFIX = "mastter:";

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    return;
  }
};

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const isRemote = () => Boolean(remote);

const toItem = <T extends Entity>(row: Row) => ({ ...row.data, id: row.id, createdAt: row.created_at }) as T;

const toRow = <T extends Entity>(collection: string, item: T): Row => {
  const { id, createdAt, ...data } = item;
  return { collection, id, created_at: createdAt, data };
};

const sync = (label: string, request: PromiseLike<{ error: { message: string } | null }>) =>
  Promise.resolve(request).then(({ error }) => {
    if (error) reportSyncError(`${label}: ${error.message}`);
    return !error;
  });

export function createCollection<T extends Entity>(name: string, seed: () => T[] = () => []) {
  let items: T[] = remote ? [] : read<T[] | null>(name, null) ?? seed();
  const listeners = new Set<() => void>();

  const emit = (next: T[]) => {
    items = next;
    if (!remote) write(name, items);
    listeners.forEach((l) => l());
  };

  const upsertLocal = (item: T) =>
    emit(items.some((i) => i.id === item.id) ? items.map((i) => (i.id === item.id ? item : i)) : [item, ...items]);

  const load = async () => {
    if (!remote) return;
    const { data, error } = await remote.from(TABLE).select("*").eq("collection", name).order("created_at", { ascending: false });
    if (error) return reportSyncError(`${name}: ${error.message}`);
    emit((data as Row[]).map((r) => toItem<T>(r)));
  };

  if (remote) {
    track(load());
    onReload(load);
    remote
      .channel(`records-${name}`)
      .on("postgres_changes", { event: "*", schema: "public", table: TABLE, filter: `collection=eq.${name}` }, (payload) => {
        if (payload.eventType === "DELETE") emit(items.filter((i) => i.id !== (payload.old as Row).id));
        else upsertLocal(toItem<T>(payload.new as Row));
      })
      .subscribe();
  }

  return {
    name,
    all: () => items,
    get: (id: string) => items.find((i) => i.id === id),
    find: (predicate: (item: T) => boolean) => items.find(predicate),
    insert(draft: Draft<T>) {
      const item = { id: uid(), createdAt: new Date().toISOString(), ...draft } as T;
      emit([item, ...items]);
      if (remote) sync(name, remote.from(TABLE).insert(toRow(name, item)));
      return item;
    },
    update(id: string, patch: Partial<T>) {
      let updated: T | undefined;
      emit(items.map((i) => (i.id === id ? (updated = { ...i, ...patch }) : i)));
      if (remote && updated) sync(name, remote.from(TABLE).update({ data: toRow(name, updated).data }).eq("collection", name).eq("id", id));
      return updated;
    },
    patchLocal(id: string, patch: Partial<T>) {
      emit(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    },
    remove(id: string) {
      emit(items.filter((i) => i.id !== id));
      if (remote) sync(name, remote.from(TABLE).delete().eq("collection", name).eq("id", id));
    },
    async reset() {
      const fresh = seed();
      if (!remote) return emit(fresh);
      const ok = await sync(name, remote.from(TABLE).upsert(fresh.map((i) => toRow(name, i))));
      if (ok) await load();
    },
    reload: load,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export type Collection<T extends Entity> = ReturnType<typeof createCollection<T>>;

export function useCollection<T extends Entity>(collection: Collection<T>) {
  return useSyncExternalStore(collection.subscribe, collection.all);
}

export function createDocument<T extends object>(name: string, initial: T, options: { shared?: boolean } = {}) {
  const shared = Boolean(options.shared && remote);
  let value: T = shared ? { ...initial } : { ...initial, ...read<Partial<T>>(name, {}) };
  const listeners = new Set<() => void>();

  const emit = (next: T) => {
    value = next;
    listeners.forEach((l) => l());
  };

  if (shared && remote) {
    const load = async () => {
      const { data } = await remote!.from(TABLE).select("*").eq("collection", "settings").eq("id", name).maybeSingle();
      if (data) emit({ ...initial, ...(data as Row).data });
    };
    track(load());
    onReload(load);
  }

  return {
    get: () => value,
    set(patch: Partial<T>) {
      emit({ ...value, ...patch });
      if (shared && remote) sync(name, remote.from(TABLE).upsert({ collection: "settings", id: name, data: value }));
      else write(name, value);
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export type Doc<T extends object> = ReturnType<typeof createDocument<T>>;

export function useDocument<T extends object>(doc: Doc<T>) {
  return useSyncExternalStore(doc.subscribe, doc.get);
}
