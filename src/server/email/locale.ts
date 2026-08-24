// Locale utilities shared by every email path.
//
// The set here MUST stay in sync with src/lib/i18n.ts (the UI). Email is a
// server concern, so this module deliberately does not import the client i18n
// bundle — it only needs the locale codes and the saved-preference lookup.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const EMAIL_LOCALES = ["en", "ar", "fr"] as const;
export type EmailLocale = (typeof EMAIL_LOCALES)[number];

const RTL_EMAIL_LOCALES = new Set<EmailLocale>(["ar"]);

export function isRtl(locale: EmailLocale): boolean {
  return RTL_EMAIL_LOCALES.has(locale);
}

/** Coerce any input (query string, header, DB value) to a supported locale. */
export function normalizeLocale(input: unknown): EmailLocale {
  const s = typeof input === "string" ? input.slice(0, 2).toLowerCase() : "";
  return (EMAIL_LOCALES as readonly string[]).includes(s) ? (s as EmailLocale) : "en";
}

/**
 * Resolve the language to render an email in for a given user id, reading the
 * saved account preference (profiles.preferred_locale). Falls back to English
 * for unknown users or any lookup failure — email must never block on this.
 *
 * NOTE: profiles.preferred_locale is added by
 * 20260851000000_email_locale_and_delivery.sql and is not yet in the generated
 * Supabase types, hence the narrow cast (consistent with other ps_* access in
 * this codebase until types are regenerated).
 */
export async function resolveUserLocale(userId: string | null | undefined): Promise<EmailLocale> {
  if (!userId) return "en";
  try {
    const { data } = await (supabaseAdmin.from("profiles") as any)
      .select("preferred_locale")
      .eq("id", userId)
      .maybeSingle();
    return normalizeLocale(data?.preferred_locale);
  } catch {
    return "en";
  }
}

/** Absolute base URL for links inside emails (relative URLs don't work in mail). */
export function appUrl(path = "/"): string {
  const base =
    process.env.APP_URL ||
    process.env.SITE_URL ||
    process.env.PUBLIC_APP_URL ||
    "https://app.prizeskout.com";
  const trimmed = base.replace(/\/+$/, "");
  return path.startsWith("/") ? `${trimmed}${path}` : `${trimmed}/${path}`;
}
