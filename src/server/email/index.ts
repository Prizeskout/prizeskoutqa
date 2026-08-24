// Public entry point for sending localized email.
//
// Each helper resolves the recipient's language (explicit override > saved
// account preference > English), renders the template, and sends. Product
// mail (digest, alerts) is additionally gated by the user's email opt-out;
// transactional mail (welcome, auth) ignores that switch.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveUserLocale, normalizeLocale, appUrl, type EmailLocale } from "./locale";
import { sendEmail, type SendResult } from "./send";
import { welcomeEmail, weeklyDigestEmail, alertEmail, authEmail, type AuthEmailType } from "./templates";

export { emailTransportConfigured } from "./send";
export { resolveUserLocale, normalizeLocale, appUrl } from "./locale";
export type { EmailLocale } from "./locale";

/**
 * Master email opt-out (user_notification_settings pref_key
 * 'email_notifications'). A missing row means enabled — email is opt-out for
 * product mail, not opt-in.
 */
export async function emailNotificationsEnabled(userId: string): Promise<boolean> {
  try {
    const { data } = await supabaseAdmin
      .from("user_notification_settings")
      .select("enabled")
      .eq("user_id", userId)
      .eq("pref_key", "email_notifications")
      .maybeSingle();
    return data?.enabled ?? true;
  } catch {
    return true;
  }
}

async function pickLocale(explicit: EmailLocale | string | undefined, userId?: string): Promise<EmailLocale> {
  if (explicit) return normalizeLocale(explicit);
  return resolveUserLocale(userId);
}

/** Welcome email — transactional, sent once at onboarding completion. */
export async function sendWelcomeEmail(params: {
  to: string;
  userId?: string;
  locale?: EmailLocale | string;
  store?: string;
  dashboardUrl?: string;
}): Promise<SendResult> {
  const locale = await pickLocale(params.locale, params.userId);
  const { subject, html, text } = welcomeEmail(
    { store: params.store, dashboardUrl: params.dashboardUrl ?? appUrl("/dashboard") },
    locale,
  );
  return sendEmail({ to: params.to, subject, html, text });
}

/** Weekly margin digest — product mail, respects the email opt-out. */
export async function sendWeeklyDigestEmail(params: {
  to: string;
  userId: string;
  locale?: EmailLocale | string;
  checked: number;
  breaches: number;
  repriced: number;
}): Promise<SendResult> {
  if (!(await emailNotificationsEnabled(params.userId))) return { ok: false, skipped: true };
  const locale = await pickLocale(params.locale, params.userId);
  const { subject, html, text } = weeklyDigestEmail(
    {
      checked: params.checked,
      breaches: params.breaches,
      repriced: params.repriced,
      url: appUrl("/dashboard/revenue-hub"),
      manageUrl: appUrl("/dashboard/settings"),
    },
    locale,
  );
  return sendEmail({ to: params.to, subject, html, text });
}

/** Generic alert email — product mail, respects the email opt-out. */
export async function sendAlertEmail(params: {
  to: string;
  userId: string;
  title: string;
  body?: string;
  linkTo?: string;
  locale?: EmailLocale | string;
}): Promise<SendResult> {
  if (!(await emailNotificationsEnabled(params.userId))) return { ok: false, skipped: true };
  const locale = await pickLocale(params.locale, params.userId);
  const { subject, html, text } = alertEmail(
    {
      title: params.title,
      body: params.body,
      url: appUrl(params.linkTo ?? "/dashboard"),
      manageUrl: appUrl("/dashboard/settings"),
    },
    locale,
  );
  return sendEmail({ to: params.to, subject, html, text });
}

/** Auth email (magic link / signup / recovery / invite / email change). */
export async function sendAuthEmail(params: {
  to: string;
  type: AuthEmailType;
  actionUrl: string;
  locale: EmailLocale | string;
}): Promise<SendResult> {
  const locale = normalizeLocale(params.locale);
  const { subject, html, text } = authEmail({ type: params.type, actionUrl: params.actionUrl }, locale);
  return sendEmail({ to: params.to, subject, html, text });
}
