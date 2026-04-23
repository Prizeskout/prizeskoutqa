// User-facing server function for the "Refresh recommendations" button on the
// Pricing page. Runs the engine for the authenticated user only.
//
// Cron-triggered runs use scrape-runner -> /api/public/hooks/scrape-all which
// invokes the engine directly with the admin client (see that route).

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runPricingEngineForUser } from "./pricing-engine";

export const recomputePricing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    try {
      const result = await runPricingEngineForUser(supabase, userId);
      return {
        ok: true as const,
        written: result.written,
        seedsWiped: result.seedsWiped,
        skipped: result.skipped,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Engine failed";
      console.error("recomputePricing failed", err);
      return { ok: false as const, error: message };
    }
  });
