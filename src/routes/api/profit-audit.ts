import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const AuditLead = z.object({
  company: z.string().trim().min(2).max(200),
  name: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(320),
  company_type: z.enum(["merchant", "delivery_platform", "technology_partner", "other"]),
  challenge: z.string().trim().max(3000).optional().default(""),
  market: z.string().trim().max(8).optional().default("QA"),
  language: z.enum(["en", "ar"]).optional().default("en"),
  website: z.string().max(0).optional().default(""),
  form_started_at: z.number().int().positive(),
});

export const Route = createFileRoute("/api/profit-audit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed: z.infer<typeof AuditLead>;
        try {
          parsed = AuditLead.parse(await request.json());
        } catch (error) {
          const issue = error instanceof z.ZodError ? error.issues[0] : null;
          return Response.json(
            { error: issue?.message ?? "Please review the form and try again." },
            { status: 422 },
          );
        }
        const elapsed = Date.now() - parsed.form_started_at;
        if (parsed.website || elapsed < 1500 || elapsed > 86_400_000)
          return Response.json(
            { error: "Please refresh the page and try again." },
            { status: 422 },
          );
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!supabaseUrl || !supabaseKey)
          return Response.json({ error: "The form is temporarily unavailable." }, { status: 503 });
        const supabase = createClient(supabaseUrl, supabaseKey);
        const structuredLead = {
          lead_type: "contact",
          name: parsed.name,
          company: parsed.company,
          email: parsed.email,
          market: parsed.market,
          preferred_language: parsed.language,
          message: [
            `Company type: ${parsed.company_type.replaceAll("_", " ")}`,
            "",
            parsed.challenge || "No additional context supplied.",
          ].join("\n"),
          user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
        };
        let { error } = await supabase.from("contact_messages").insert(structuredLead);
        // Keep the landing form operational during rolling deployments where
        // application code can arrive before the additive lead-field migration.
        if (error && ["42703", "PGRST204"].includes(error.code ?? "")) {
          const fallbackMessage = [
            "Talk to our team request",
            `Company type: ${parsed.company_type.replaceAll("_", " ")}`,
            `Market: ${parsed.market}`,
            `Preferred language: ${parsed.language}`,
            "",
            parsed.challenge || "No additional context supplied.",
          ].join("\n");
          ({ error } = await supabase.from("contact_messages").insert({
            name: parsed.name,
            company: parsed.company,
            email: parsed.email,
            message: fallbackMessage,
            user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
          }));
        }
        if (error) {
          console.error("Contact lead insert failed", error);
          return Response.json(
            {
              error:
                "We could not submit your request. Please try again or email hello@prizeskout.qa.",
            },
            { status: 500 },
          );
        }
        return Response.json({ ok: true }, { status: 201 });
      },
    },
  },
});
