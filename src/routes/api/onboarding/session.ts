import { createFileRoute } from "@tanstack/react-router";
import { issueOnboardingCapability } from "@/server/onboarding-capability";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/onboarding/session")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => null) as { merchant_id?: string; access_code?: string } | null;
        const merchantId = body?.merchant_id?.trim();
        if (merchantId) {
          const code = body?.access_code?.trim().toUpperCase() ?? "";
          const { data } = await supabaseAdmin.from("ps_access_codes").select("merchant_id").eq("code", code).maybeSingle();
          if (!data || data.merchant_id !== merchantId) return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        return Response.json(issueOnboardingCapability(merchantId), { headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
