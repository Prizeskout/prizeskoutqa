import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MapPin, MessageSquare } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { MarketingHero, MarketingBody } from "@/components/marketing/MarketingPage";
import { submitContactMessage } from "@/server/contact.functions";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact | PrizeSkout" },
      {
        name: "description",
        content:
          "Get in touch with PrizeSkout. We read every message and reply within one business day.",
      },
      { property: "og:title", content: "Contact | PrizeSkout" },
      {
        property: "og:description",
        content: "Reach the PrizeSkout team for sales, support, partnerships, or press inquiries.",
      },
    ],
  }),
  component: ContactPage,
});

const CHANNELS = [
  {
    icon: Mail,
    title: "Email",
    body: "hello@prizeskout.qa",
    note: "We reply within one business day.",
  },
  {
    icon: MessageSquare,
    title: "Sales",
    body: "sales@prizeskout.qa",
    note: "Demos, pricing, and procurement questions.",
  },
  {
    icon: MapPin,
    title: "Office",
    body: "Doha, Qatar",
    note: "By appointment. Drop us an email first.",
  },
];

function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = useServerFn(submitContactMessage);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      company: String(fd.get("company") ?? "").trim() || null,
      email: String(fd.get("email") ?? "").trim(),
      message: String(fd.get("message") ?? "").trim(),
    };
    setBusy(true);
    try {
      await submit({ data: payload });
      setSubmitted(true);
      form.reset();
      toast.success("Thanks! We will get back to you shortly.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <MarketingShell>
      <MarketingHero
        eyebrow="CONTACT"
        title="Talk to the PrizeSkout team"
        subtitle="Whether you want a demo, a quote, or just have a question, the fastest way is to send us a note."
      />
      <MarketingBody>
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            marginBottom: 40,
          }}
        >
          {CHANNELS.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.title}
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E5E2DB",
                  borderRadius: 10,
                  padding: 20,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "rgba(234, 88, 12, 0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 12,
                  }}
                >
                  <Icon size={18} color="#EA580C" />
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A18" }}>{c.title}</div>
                <div style={{ fontSize: 14, color: "#1A1A18", marginTop: 4 }}>{c.body}</div>
                <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 6, lineHeight: 1.5 }}>
                  {c.note}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5E2DB",
            borderRadius: 12,
            padding: 28,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1A1A18", margin: 0 }}>
            Send us a message
          </h2>
          <p style={{ fontSize: 13, color: "#6B6B6B", marginTop: 6 }}>
            Tell us a bit about your business and what you are trying to solve. We will reply
            within one business day.
          </p>

          {submitted ? (
            <div
              style={{
                marginTop: 20,
                padding: 16,
                borderRadius: 8,
                background: "rgba(34, 197, 94, 0.08)",
                border: "1px solid rgba(34, 197, 94, 0.25)",
                color: "#15803D",
                fontSize: 14,
              }}
            >
              Thanks for reaching out. We will get back to you shortly.
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                style={{
                  display: "block",
                  marginTop: 12,
                  background: "transparent",
                  border: "none",
                  color: "#15803D",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                  textDecoration: "underline",
                }}
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} style={{ marginTop: 20, display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gap: 14, gridTemplateColumns: "1fr 1fr" }}>
                <Field label="Name" name="name" placeholder="Your full name" required maxLength={200} />
                <Field label="Company" name="company" placeholder="Brand or retailer" maxLength={200} />
              </div>
              <Field
                label="Work email"
                name="email"
                type="email"
                placeholder="you@company.com"
                required
                maxLength={320}
              />
              <div>
                <label style={labelStyle}>Message</label>
                <textarea
                  name="message"
                  required
                  rows={5}
                  maxLength={5000}
                  placeholder="What would you like to know?"
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                style={{
                  marginTop: 4,
                  background: busy ? "#9A9A9A" : "#EA580C",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "12px 22px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: busy ? "wait" : "pointer",
                  justifySelf: "start",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!busy) e.currentTarget.style.background = "#C2410C";
                }}
                onMouseLeave={(e) => {
                  if (!busy) e.currentTarget.style.background = "#EA580C";
                }}
              >
                {busy ? "Sending..." : "Send message"}
              </button>
            </form>
          )}
        </div>
      </MarketingBody>
    </MarketingShell>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#1A1A18",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #E5E2DB",
  borderRadius: 8,
  fontSize: 14,
  color: "#1A1A18",
  background: "#FAFAF9",
  outline: "none",
  boxSizing: "border-box",
};

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  maxLength,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <div>
      <label htmlFor={name} style={labelStyle}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        style={inputStyle}
      />
    </div>
  );
}
