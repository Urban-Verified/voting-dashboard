import { useSyncExternalStore } from "react";

export type Complexity = "easy" | "technical";

const STORAGE_KEY = "complexity";

function detectInitial(): Complexity {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "easy" || stored === "technical") return stored;
  } catch { /* ignore */ }
  return "easy";
}

let _complexity: Complexity = detectInitial();
const _listeners = new Set<() => void>();

export function setComplexity(c: Complexity) {
  _complexity = c;
  try { localStorage.setItem(STORAGE_KEY, c); } catch { /* ignore */ }
  _listeners.forEach(fn => fn());
}

export function useComplexity() {
  const complexity = useSyncExternalStore(
    (cb) => { _listeners.add(cb); return () => { _listeners.delete(cb); }; },
    () => _complexity,
  );
  return { complexity, isEasy: complexity === "easy", isTechnical: complexity === "technical" };
}
