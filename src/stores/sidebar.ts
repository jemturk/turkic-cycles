import { create } from "zustand";

// The desktop-web sidebar's collapsed/expanded state (DesktopSidebar). The sidebar
// only exists on the web, so it's remembered in this browser's localStorage --
// guarded, since storage can be blocked (private windows, cleared site data), in
// which case it just starts expanded.
const STORAGE_KEY = "turanci.sidebarCollapsed";

function readCollapsed(): boolean {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

type SidebarStore = {
  collapsed: boolean;
  toggle: () => void;
};

export const useSidebar = create<SidebarStore>((set, get) => ({
  collapsed: readCollapsed(),
  toggle: () => {
    const collapsed = !get().collapsed;
    set({ collapsed });
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      // Not remembered; it still toggles for this visit.
    }
  },
}));
