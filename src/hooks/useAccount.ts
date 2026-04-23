// Returns the current user's account row (live access status + request fields).
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AccountRow = {
  user_id: string;
  live_status: "none" | "pending" | "approved" | "rejected";
  company_name: string | null;
  company_domain: string | null;
  use_case: string | null;
  expected_volume: string | null;
  billing_email: string | null;
  requested_at: string | null;
  decided_at: string | null;
  decision_note: string | null;
};

export function useAccount() {
  return useQuery({
    queryKey: ["account"],
    queryFn: async (): Promise<AccountRow | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("accounts")
        .select(
          "user_id, live_status, company_name, company_domain, use_case, expected_volume, billing_email, requested_at, decided_at, decision_note",
        )
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        console.error("Failed to load account", error);
        return null;
      }
      return (data ?? null) as AccountRow | null;
    },
    staleTime: 30_000,
  });
}
