import { useEffect, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";

/**
 * On the very first client paint after SSR, our dashboard loaders return empty
 * arrays (the SSR has no Supabase session). This hook detects that case once,
 * triggers `router.invalidate()` to re-run the loader on the client (which now
 * has access to localStorage auth), and reports `isHydrating === true` while
 * the real data is in flight so the page can render its skeleton.
 *
 * Subsequent navigations / refreshes already use the route's `pendingComponent`
 * normally, so this hook only fires when needed.
 */
export function useHydrationRefetch(isEmpty: boolean) {
  const router = useRouter();
  const [isHydrating, setIsHydrating] = useState(isEmpty);
  const triggered = useRef(false);

  useEffect(() => {
    if (!isEmpty || triggered.current) {
      if (!isEmpty) setIsHydrating(false);
      return;
    }
    triggered.current = true;
    setIsHydrating(true);
    router.invalidate({ sync: true }).finally(() => setIsHydrating(false));
  }, [isEmpty, router]);

  return isHydrating;
}
