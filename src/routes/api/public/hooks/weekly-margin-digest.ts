import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createNotification } from "@/server/notifications";

function weekKey(date = new Date()) {
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = monday.getUTCDay() || 7;
  monday.setUTCDate(monday.getUTCDate() - day + 1);
  return monday.toISOString().slice(0, 10);
}

export const Route = createFileRoute("/api/public/hooks/weekly-margin-digest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.CRON_SECRET;
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!expected || token !== expected) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: subscribers, error } = await supabaseAdmin
          .from("user_notification_settings")
          .select("user_id")
          .eq("pref_key", "weekly_digest")
          .eq("enabled", true);
        if (error) return Response.json({ error: error.message }, { status: 500 });

        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        let sent = 0;
        for (const subscriber of subscribers ?? []) {
          const [{ count: checked }, { count: breaches }, { count: repriced }] = await Promise.all([
            supabaseAdmin.from("ps_decide_results").select("id", { count: "exact", head: true }).eq("account_id", subscriber.user_id).gte("created_at", since),
            supabaseAdmin.from("ps_decide_results").select("id", { count: "exact", head: true }).eq("account_id", subscriber.user_id).eq("floor_breached", true).gte("created_at", since),
            supabaseAdmin.from("ps_ingest_events").select("id", { count: "exact", head: true }).eq("account_id", subscriber.user_id).eq("status", "repriced").gte("updated_at", since),
          ]);
          await createNotification({
            userId: subscriber.user_id,
            preferenceKey: "weekly_digest",
            category: "pricing",
            severity: (breaches ?? 0) > 0 ? "warning" : "success",
            title: "Your weekly margin summary",
            body: `${checked ?? 0} products checked · ${breaches ?? 0} below your target · ${repriced ?? 0} prices changed.`,
            linkTo: "/dashboard/revenue-hub",
            dedupeKey: `weekly-margin-digest:${weekKey()}`,
            dedupeWindowMinutes: 8 * 24 * 60,
            metadata: { checked: checked ?? 0, breaches: breaches ?? 0, repriced: repriced ?? 0, week: weekKey() },
          });
          sent++;
        }
        return Response.json({ success: true, subscribers: subscribers?.length ?? 0, sent, week: weekKey() });
      },
    },
  },
});
