// signup: provisions a Supabase Auth user for a merchant's email at the end
// of onboarding (silent, email_confirm:true, no email sent — this just
// makes email login possible later).
//
// login: the public "Access your dashboard -> Email" tab. Anyone can submit
// any email here, so this must never create an account or hand back
// anything usable on its own — it only confirms the email belongs to a
// real onboarded merchant. The actual sign-in email is sent afterward, by
// the browser calling Supabase's own signInWithOtp (see access.tsx) — that
// is what makes this a real magic link: the merchant has to open their
// inbox and click it, rather than the server handing a usable link straight
// back in this response.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/auth/email-bridge")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseUrl = process.env.SUPABASE_URL;

        if (!serviceKey || !supabaseUrl) {
          return new Response(
            JSON.stringify({ error: "Service not configured." }),
            { status: 503, headers: { "Content-Type": "application/json" } },
          );
        }

        let email: string;
        let intent: string;
        try {
          const body = await request.json();
          email = (body?.email ?? "").trim().toLowerCase();
          intent = body?.intent === "signup" ? "signup" : body?.intent === "login" ? "login" : "";
        } catch {
          return new Response(
            JSON.stringify({ error: "Invalid request body." }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        if (!email || !email.includes("@")) {
          return new Response(
            JSON.stringify({ error: "Valid email address required." }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }
        if (!intent) {
          return new Response(
            JSON.stringify({ error: "intent must be \"signup\" or \"login\"." }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const admin = createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        if (intent === "signup") {
          const { error: createError } = await admin.auth.admin.createUser({
            email,
            email_confirm: true,
          });
          if (createError && createError.message !== "A user with this email address has already been registered") {
            return new Response(
              JSON.stringify({ error: "Could not create access for this email." }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }
          return new Response(JSON.stringify({ ok: true }), {
            status: 200, headers: { "Content-Type": "application/json" },
          });
        }

        // login — only confirm a real merchant owns this email. No Supabase
        // auth call here at all: nothing about "does this email have an
        // account" should be revealed by this endpoint's behavior beyond
        // what the merchant lookup itself already discloses.
        const { data: row } = await admin
          .from("ps_access_codes")
          .select("merchant_id")
          .eq("email", email)
          .limit(1)
          .maybeSingle();
        if (!row) {
          return new Response(
            JSON.stringify({ error: "No PrizeSkout account found for this email. Complete onboarding to get access." }),
            { status: 404, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200, headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
