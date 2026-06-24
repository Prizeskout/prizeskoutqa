/**
 * ModeContext — tracks whether the dashboard is in Sandbox or Live mode.
 *
 * canAccessLive: true when the user has activated a paid plan.
 * Activation is stubbed via user_metadata.live_enabled so the payment
 * gateway can simply call activatePlan() after verifying a payment intent —
 * no other wiring needed.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export type Mode = "sandbox" | "live";
export type PlanTier = "starter" | "standard" | "enterprise";

interface ModeContextValue {
  mode: Mode;
  switchMode: (next: Mode) => void;
  canAccessLive: boolean;
  activatingPlan: boolean;
  /** Called by PlanGateModal after the user selects a plan (stub = immediate). */
  activatePlan: (tier: PlanTier) => Promise<void>;
  /** Whether the plan-gate modal is open. */
  planGateOpen: boolean;
  openPlanGate: () => void;
  closePlanGate: () => void;
}

const ModeContext = createContext<ModeContextValue | null>(null);

function storageKey(userId: string) {
  return `ps_mode_${userId}`;
}

export function ModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("sandbox");
  const [planGateOpen, setPlanGateOpen] = useState(false);
  const [activatingPlan, setActivatingPlan] = useState(false);

  // Live access is granted when user_metadata.live_enabled is true.
  // PAYMENT GATEWAY INTEGRATION POINT: replace this check with a real
  // subscription query (e.g. Stripe subscription status) when ready.
  const canAccessLive =
    Boolean(user?.user_metadata?.live_enabled) === true;

  // Restore persisted mode for users who already have live access.
  useEffect(() => {
    if (!user) return;
    const stored = localStorage.getItem(storageKey(user.id)) as Mode | null;
    if (stored === "live" && canAccessLive) {
      setMode("live");
    } else {
      setMode("sandbox");
    }
  }, [user?.id, canAccessLive]);

  const switchMode = useCallback(
    (next: Mode) => {
      if (next === "live" && !canAccessLive) {
        setPlanGateOpen(true);
        return;
      }
      setMode(next);
      if (user) {
        localStorage.setItem(storageKey(user.id), next);
      }
    },
    [canAccessLive, user],
  );

  /**
   * PAYMENT GATEWAY INTEGRATION POINT
   *
   * Today: immediately marks the user as live-enabled (no real payment).
   *
   * Production flow:
   *   1. Create a Stripe (or other) payment intent/session on your server.
   *   2. Redirect user to checkout.
   *   3. On webhook (payment_intent.succeeded): call the equivalent of
   *      supabase.auth.admin.updateUserById(userId, { user_metadata: { live_enabled: true, plan_tier: tier } })
   *   4. This function can remain as the "post-payment success" handler
   *      that updates local state after the redirect back to the dashboard.
   */
  const activatePlan = useCallback(
    async (tier: PlanTier) => {
      setActivatingPlan(true);
      try {
        const { error } = await supabase.auth.updateUser({
          data: { live_enabled: true, plan_tier: tier },
        });
        if (error) throw error;

        // Refresh the local session so user_metadata is up to date.
        await supabase.auth.refreshSession();

        setPlanGateOpen(false);
        setMode("live");
        if (user) localStorage.setItem(storageKey(user.id), "live");
      } finally {
        setActivatingPlan(false);
      }
    },
    [user],
  );

  const openPlanGate = useCallback(() => setPlanGateOpen(true), []);
  const closePlanGate = useCallback(() => setPlanGateOpen(false), []);

  return (
    <ModeContext.Provider
      value={{
        mode,
        switchMode,
        canAccessLive,
        activatingPlan,
        activatePlan,
        planGateOpen,
        openPlanGate,
        closePlanGate,
      }}
    >
      {children}
    </ModeContext.Provider>
  );
}

export function useModeContext() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useModeContext must be used inside ModeProvider");
  return ctx;
}
