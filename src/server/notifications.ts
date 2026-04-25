// ============================================================================
// Notification helpers (Week 7)
// ----------------------------------------------------------------------------
// Server-side helpers for creating in-app notifications. Always uses the admin
// client because notifications are emitted from background flows (webhook
// retries, cron, scrape runners) where the originating user_id may not match
// the caller. RLS prevents end-users from inserting their own notifications.
// ============================================================================

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type NotificationCategory =
  | "webhook_failure"
  | "overage"
  | "scrape_failure"
  | "pricing"
  | "system";

export type NotificationSeverity = "info" | "warning" | "error" | "success";

export type CreateNotificationInput = {
  userId: string;
  category: NotificationCategory;
  severity?: NotificationSeverity;
  title: string;
  body?: string;
  linkTo?: string;
  metadata?: Record<string, unknown>;
  /**
   * If set, suppress this notification when an unread one with the same
   * category + dedupeKey already exists for the user. Prevents flooding
   * (e.g. one webhook endpoint failing 50 times in a row).
   */
  dedupeKey?: string;
  /**
   * Window (minutes) over which dedupeKey applies. Default 60 minutes.
   */
  dedupeWindowMinutes?: number;
};

/**
 * Create a notification for a user. Never throws — failures are logged and
 * swallowed so they don't break the originating request.
 */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    if (input.dedupeKey) {
      const windowMinutes = input.dedupeWindowMinutes ?? 60;
      const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
      const { data: existing } = await supabaseAdmin
        .from("notifications")
        .select("id")
        .eq("user_id", input.userId)
        .eq("category", input.category)
        .is("read_at", null)
        .gte("created_at", since)
        .contains("metadata", { dedupe_key: input.dedupeKey })
        .limit(1)
        .maybeSingle();
      if (existing) return;
    }

    const metadata: Record<string, unknown> = { ...(input.metadata ?? {}) };
    if (input.dedupeKey) metadata.dedupe_key = input.dedupeKey;

    const { error } = await supabaseAdmin.from("notifications").insert({
      user_id: input.userId,
      category: input.category,
      severity: input.severity ?? "info",
      title: input.title,
      body: input.body ?? null,
      link_to: input.linkTo ?? null,
      metadata,
    });
    if (error) console.error("createNotification failed", error);
  } catch (err) {
    console.error("createNotification threw", err);
  }
}
