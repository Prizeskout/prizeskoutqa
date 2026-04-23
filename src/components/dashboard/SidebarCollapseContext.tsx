import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Ctx = {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
};

const SidebarCollapseContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "ps:sidebar:collapsed";

/**
 * Lightweight client-side sidebar collapse state with localStorage persistence.
 * SSR-safe: defaults to expanded on first paint, then hydrates the saved value.
 */
export function SidebarCollapseProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "1") setCollapsedState(true);
    } catch {
      // ignore
    }
  }, []);

  const setCollapsed = useCallback((v: boolean) => {
    setCollapsedState(v);
    try {
      window.localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(() => setCollapsed(!collapsed), [collapsed, setCollapsed]);

  return (
    <SidebarCollapseContext.Provider value={{ collapsed, toggle, setCollapsed }}>
      {children}
    </SidebarCollapseContext.Provider>
  );
}

export function useSidebarCollapse(): Ctx {
  const ctx = useContext(SidebarCollapseContext);
  if (!ctx) {
    // Safe fallback so components don't crash if used outside the provider.
    return { collapsed: false, toggle: () => {}, setCollapsed: () => {} };
  }
  return ctx;
}
