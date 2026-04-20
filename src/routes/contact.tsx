import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MapPin, MessageSquare } from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { MarketingHero, MarketingBody } from "@/components/marketing/MarketingPage";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact PrizeSkout, Talk to our team" },
      {
        name: "description",
        content:
          "Get in touch with PrizeSkout. Sales, support, partnerships, and press, we read every message and reply within one business day.",
      },
      { property: "og:title", content: "Contact PrizeSkout, Talk to our team" },
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
    body: "hello@prizeskout.com",
    note: "We reply within one business day.",
  },
  {
    icon: MessageSquare,
    title: "Sales",
    body: "sales@prizeskout.com",
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
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
              style={{ marginTop: 20, display: "grid", gap: 14 }}
            >
              <div style={{ display: "grid", gap: 14, gridTemplateColumns: "1fr 1fr" }}>
                <Field label="Name" name="name" placeholder="Your full name" required />
                <Field label="Company" name="company" placeholder="Brand or retailer" />
              </div>
              <Field label="Work email" name="email" type="email" placeholder="you@company.com" required />
              <div>
                <label style={labelStyle}>Message</label>
                <textarea
                  required
                  rows={5}
                  placeholder="What would you like to know?"
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                />
              </div>
              <button
                type="submit"
                style={{
                  marginTop: 4,
                  background: "#EA580C",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "12px 22px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  justifySelf: "start",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#C2410C")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#EA580C")}
              >
                Send message
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
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
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
        style={inputStyle}
      />
    </div>
  );
}
