import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { getPublicOrigin } from "@/server/public-origin";

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

        const origin = getPublicOrigin(request);
        const redirectTo = `${origin}/dashboard`;

        // Try to generate a magic link. If the user doesn't exist yet, create
        // them first (email_confirm: true skips the confirmation requirement).
        let actionLink: string | null = null;

        const { data, error } = await admin.auth.admin.generateLink({
          type: "magiclink",
          email,
          options: { redirectTo },
        });

        if (!error && data?.properties?.action_link) {
          actionLink = data.properties.action_link;
        } else {
          // User likely doesn't exist — create them, then generate the link.
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

          const { data: data2, error: error2 } = await admin.auth.admin.generateLink({
            type: "magiclink",
            email,
            options: { redirectTo },
          });

          if (error2 || !data2?.properties?.action_link) {
            return new Response(
              JSON.stringify({ error: "Could not generate access link." }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          actionLink = data2.properties.action_link;
        }

        return new Response(
          JSON.stringify({ action_link: actionLink }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
