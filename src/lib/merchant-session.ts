import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type MerchantCredentials = { merchant_id: string; access_code: string };
const empty: MerchantCredentials = { merchant_id: "", access_code: "" };
const eventName = "prizeskout:merchant-session";
let pending: Promise<MerchantCredentials> | null = null;

export function storedMerchantCredentials(): MerchantCredentials {
  if (typeof window === "undefined") return empty;
  return {
    merchant_id: localStorage.getItem("ps_merchant_id")?.trim() ?? "",
    access_code: localStorage.getItem("ps_access_code")?.trim() ?? "",
  };
}

export async function resolveMerchantCredentials(): Promise<MerchantCredentials> {
  const stored = storedMerchantCredentials();
  if (stored.merchant_id && stored.access_code) return stored;
  if (pending) return pending;
  pending = (async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return empty;
    const response = await fetch("/api/auth/resolve-merchant", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const body = await response.json().catch(() => ({})) as { merchant_id?: string; code?: string };
    if (!response.ok || !body.merchant_id || !body.code) return empty;
    const resolved = { merchant_id: body.merchant_id, access_code: body.code };
    localStorage.setItem("ps_merchant_id", resolved.merchant_id);
    localStorage.setItem("ps_access_code", resolved.access_code);
    localStorage.setItem("ps_connected", "true");
    window.dispatchEvent(new CustomEvent(eventName, { detail: resolved }));
    return resolved;
  })().finally(() => { pending = null; });
  return pending;
}

export function useMerchantCredentials() {
  // Keep the server and browser's first render identical. Reading localStorage in
  // the state initializer makes an authenticated browser render the dashboard
  // while SSR renders the recovery state, which causes a hydration mismatch.
  const [credentials, setCredentials] = useState<MerchantCredentials>(empty);
  const [resolving, setResolving] = useState(true);
  useEffect(() => {
    const receive = (event: Event) => setCredentials((event as CustomEvent<MerchantCredentials>).detail ?? storedMerchantCredentials());
    window.addEventListener(eventName, receive);
    void resolveMerchantCredentials().then((value) => {
      setCredentials(value);
      setResolving(false);
    });
    return () => window.removeEventListener(eventName, receive);
  }, []);
  return { credentials, resolving };
}
