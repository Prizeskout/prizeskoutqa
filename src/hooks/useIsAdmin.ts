// Returns whether the current authenticated user has the 'admin' role.
// Backed by the user_roles table + RLS so it's safe to read from the client.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) {
        console.error("Failed to check admin role", error);
        return false;
      }
      return !!data;
    },
    staleTime: 60_000,
  });
}
