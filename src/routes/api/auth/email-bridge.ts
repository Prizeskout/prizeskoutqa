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
        try {
          const body = await request.json();
          email = (body?.email ?? "").trim().toLowerCase();
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

        const admin = createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const origin = new URL(request.url).origin;

        const { data, error } = await admin.auth.admin.generateLink({
          type: "magiclink",
          email,
          options: { redirectTo: `${origin}/dashboard` },
        });

        if (error || !data?.properties?.hashed_token) {
          return new Response(
            JSON.stringify({ error: "No account found for this email." }),
            { status: 404, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(
          JSON.stringify({ token_hash: data.properties.hashed_token }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
