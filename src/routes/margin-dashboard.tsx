import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/margin-dashboard")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    // The former Margin mini-product read from margin_orders, a second and
    // incompatible financial ledger. All financial views now live in the main
    // dashboard and are backed by the normalized Economic Twin.
    throw redirect({ to: "/dashboard" });
  },
  component: () => null,
});
