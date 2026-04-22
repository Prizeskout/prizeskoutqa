// Server function for the public Contact form. Validates input with zod and
// inserts into contact_messages using the publishable-key client. RLS allows
// anonymous inserts when length checks pass.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const ContactSchema = z.object({
  name: z.string().trim().min(1).max(200),
  company: z.string().trim().max(200).optional().nullable(),
  email: z.string().trim().email().max(320),
  message: z.string().trim().min(1).max(5000),
});

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ContactSchema.parse(input))
  .handler(async ({ data }) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Backend is not configured");
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase.from("contact_messages").insert({
      name: data.name,
      company: data.company ?? null,
      email: data.email,
      message: data.message,
    });
    if (error) {
      console.error("contact_messages insert failed", error);
      throw new Error("Could not send your message. Please try again.");
    }
    return { ok: true };
  });
