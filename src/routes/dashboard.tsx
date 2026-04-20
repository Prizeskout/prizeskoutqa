import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async ({ location }) => {
    // Only enforce on the client — SSR runs without browser localStorage
    // and would always redirect. Client-side guard is sufficient because
    // every Cloud query is RLS-scoped to the signed-in user anyway.
    if (typeof window === "undefined") return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  component: () => <Outlet />,
});
