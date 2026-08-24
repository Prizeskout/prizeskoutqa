// Bridges the UI language switch to the persisted account setting.
//
// Language still lives in localStorage for instant, anonymous-friendly
// switching (see i18n.ts). When the user is signed in we ALSO persist the
// choice to profiles.preferred_locale so server-fired email can be rendered in
// it, and on login we pull that saved value back down (the account preference
// wins over the local guess).
import { supabase } from "@/integrations/supabase/client";
import { applyLocale, i18n, LOCALES, type Locale } from "@/lib/i18n";

async function authHeader(): Promise<Record<string, string>> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  } catch {
    return {};
  }
}

/**
 * Apply a locale across i18n + <html> dir/lang + localStorage, and persist it
 * to the signed-in account (best-effort; anonymous users just keep the local
 * choice). Safe to call from any UI language control.
 */
export async function setLocale(locale: Locale): Promise<void> {
  i18n.changeLanguage(locale);
  applyLocale(locale);
  const headers = await authHeader();
  if (!headers.Authorization) return;
  try {
    await fetch("/api/settings/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ locale }),
    });
  } catch {
    // Non-fatal: the local switch already took effect.
  }
}

/** On login, adopt the saved account language if it differs from the current one. */
export async function hydrateLocaleFromServer(): Promise<void> {
  const headers = await authHeader();
  if (!headers.Authorization) return;
  try {
    const res = await fetch("/api/settings/locale", { headers });
    if (!res.ok) return;
    const { locale } = (await res.json()) as { locale?: string };
    const current = i18n.language?.slice(0, 2);
    if (locale && (LOCALES as readonly string[]).includes(locale) && current !== locale) {
      i18n.changeLanguage(locale);
      applyLocale(locale as Locale);
    }
  } catch {
    // Non-fatal.
  }
}
