// Zen Mode: Anti-overwhelm focus mode for the problem workspace.
// Hides secondary counters, status badges, and extraneous chrome.

const ZEN_KEY = "habit-zen-mode";
const zenListeners = new Set<() => void>();
let memoryZen: boolean | null = null;

export const getZenMode = (): boolean => {
  if (memoryZen !== null) return memoryZen;
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(ZEN_KEY) === "1";
  } catch {
    return false;
  }
};

export const setZenMode = (active: boolean) => {
  memoryZen = active;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(ZEN_KEY, active ? "1" : "0");
    } catch {
      // ignore storage restrictions
    }
  }
  if (typeof document !== "undefined") {
    if (active) {
      document.documentElement.classList.add("zen-mode");
    } else {
      document.documentElement.classList.remove("zen-mode");
    }
  }
  zenListeners.forEach((l) => l());
};

export const toggleZenMode = () => setZenMode(!getZenMode());

export const subscribeZen = (l: () => void) => {
  zenListeners.add(l);
  window.addEventListener("storage", l);
  return () => {
    zenListeners.delete(l);
    window.removeEventListener("storage", l);
  };
};

export const initZenMode = () => {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (getZenMode()) {
    document.documentElement.classList.add("zen-mode");
  } else {
    document.documentElement.classList.remove("zen-mode");
  }
};
