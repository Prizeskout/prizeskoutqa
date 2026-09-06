import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const AuditLead = z.object({
  company: z.string().trim().min(2).max(200),
  name: z.string().trim().min(2).max(200),
  job_title: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(60).optional().default(""),
  company_size: z.enum(["1", "2-5", "6-20", "21-50", "51+"]),
  commerce_stack: z.string().trim().max(1000).optional().default(""),
  challenge: z.string().trim().min(10).max(3000),
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
          lead_type: "profit_audit",
          name: parsed.name,
          company: parsed.company,
          job_title: parsed.job_title,
          email: parsed.email,
          phone: parsed.phone || null,
          company_size: parsed.company_size,
          commerce_stack: parsed.commerce_stack || null,
          market: parsed.market,
          preferred_language: parsed.language,
          message: parsed.challenge,
          user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
        };
        let { error } = await supabase.from("contact_messages").insert(structuredLead);
        // Keep the landing form operational during rolling deployments where
        // application code can arrive before the additive lead-field migration.
        if (error && ["42703", "PGRST204"].includes(error.code ?? "")) {
          const fallbackMessage = [
            "Profit audit request",
            `Role: ${parsed.job_title}`,
            `Branches: ${parsed.company_size}`,
            `Phone: ${parsed.phone || "Not supplied"}`,
            `Stack: ${parsed.commerce_stack || "Not supplied"}`,
            `Market: ${parsed.market}`,
            `Preferred language: ${parsed.language}`,
            "",
            parsed.challenge,
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
          console.error("Profit audit lead insert failed", error);
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
