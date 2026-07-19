// Landing page for the magic link sent by /api/auth/email-bridge (login
// intent). The Supabase client auto-consumes the token in the URL fragment
// on mount and establishes a session; from there this page asks the server
// to verify that session and resolve which merchant it actually belongs to
// (see /api/auth/resolve-merchant) — nothing here trusts client state.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthShell, PrimaryAuthButton } from "@/components/auth/AuthShared";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Signing you in… | PrizeSkout" }] }),
  component: AuthCallbackPage,
});

const OG = "#EF681A";

function AuthCallbackPage() {
  const [status, setStatus] = useState<"checking" | "error">("checking");
  const [message, setMessage] = useState("Verifying your access…");
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!session) {
        setStatus("error");
        setMessage("This link is invalid or has expired. Please request a new one.");
        return;
      }

      try {
        const res = await fetch("/api/auth/resolve-merchant", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json() as { merchant_id?: string; code?: string; error?: string };
        if (cancelled) return;

        if (!res.ok || !data.merchant_id) {
          setStatus("error");
          setMessage(data.error ?? "No PrizeSkout account found for this email.");
          return;
        }

        localStorage.setItem("ps_merchant_id", data.merchant_id);
        if (data.code) localStorage.setItem("ps_access_code", data.code);
        localStorage.setItem("ps_connected", "true");
        navigate({ to: "/dashboard/revenue-hub" });
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Connection error. Please try again.");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <AuthShell>
      {status === "checking" ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
          <span style={{ width: 28, height: 28, borderRadius: "50%",
            border: `3px solid rgba(239,104,26,0.2)`, borderTopColor: OG,
            animation: "pk-cb-spin .75s linear infinite" }} />
          <style>{"@keyframes pk-cb-spin{to{transform:rotate(360deg)}}"}</style>
          <p style={{ fontSize: 13.5, color: "#9CA3AF", margin: 0 }}>{message}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#ffffff", margin: 0 }}>Could not sign you in</h1>
          <p style={{ fontSize: 13.5, color: "#9CA3AF", lineHeight: 1.6, margin: 0 }}>{message}</p>
          <PrimaryAuthButton onClick={() => navigate({ to: "/access" })}>Back to sign in</PrimaryAuthButton>
        </div>
      )}
    </AuthShell>
  );
}
