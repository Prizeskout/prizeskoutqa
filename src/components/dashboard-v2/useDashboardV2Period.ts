import { useEffect, useState } from "react";

export type DashboardV2Period = 7 | 30;
const eventName = "prizeskout:dashboard-v2-period";

function readPeriod(): DashboardV2Period {
  if (typeof window === "undefined") return 30;
  return new URL(window.location.href).searchParams.get("period") === "7" ? 7 : 30;
}

export function setDashboardV2Period(period: DashboardV2Period): void {
  const url = new URL(window.location.href);
  if (period === 30) url.searchParams.delete("period");
  else url.searchParams.set("period", String(period));
  window.history.replaceState(window.history.state, "", url);
  window.dispatchEvent(new CustomEvent(eventName, { detail: period }));
}

export function useDashboardV2Period(): DashboardV2Period {
  const [period, setPeriod] = useState<DashboardV2Period>(readPeriod);
  useEffect(() => {
    const onPeriod = (event: Event) => setPeriod((event as CustomEvent<DashboardV2Period>).detail);
    const onPopState = () => setPeriod(readPeriod());
    window.addEventListener(eventName, onPeriod);
    window.addEventListener("popstate", onPopState);
    return () => { window.removeEventListener(eventName, onPeriod); window.removeEventListener("popstate", onPopState); };
  }, []);
  return period;
}
