import { CircleCheck } from "lucide-react";
import { useSyncExternalStore } from "react";

type Item = { id: number; text: string };

let items: Item[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(text: string) {
  const id = Date.now() + Math.random();
  items = [...items, { id, text }];
  emit();
  setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, 3200);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export function Toasts() {
  const list = useSyncExternalStore(subscribe, () => items);
  return (
    <div className="toasts" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className="toast">
          <CircleCheck />
          {t.text}
        </div>
      ))}
    </div>
  );
}
