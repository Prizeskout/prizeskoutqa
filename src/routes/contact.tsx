import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MapPin, MessageSquare } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { submitContactMessage } from "@/server/contact.functions";
import logo from "@/assets/logo-light.svg";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Book a Demo | PrizeSkout" },
      {
        name: "description",
        content:
          "Book a PrizeSkout demo and see how margin intelligence works across your stores and connected channels.",
      },
      { property: "og:title", content: "Book a Demo | PrizeSkout" },
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
    <main className="demo-contact">
      <style>{contactCss}</style>
      <nav className="demo-contact-nav"><a href="/" aria-label="PrizeSkout home"><img src={logo} alt="PrizeSkout" /></a><a href="/">Back to home</a></nav>
      <header className="demo-contact-hero">
        <div><span>BOOK A DEMO</span><h1>See your margins<br/><em>more clearly.</em></h1><p>Tell us how your business operates. We will show you how PrizeSkout protects profit across your stores and connected channels.</p><div className="demo-promises"><span>✓ A walkthrough shaped around your business</span><span>✓ Your channels, costs and margin questions</span><span>✓ Clear next steps with no pressure</span></div></div>
        <aside><small>WHAT TO EXPECT</small><strong>30 minutes with the PrizeSkout team</strong><p>We will focus on the revenue risks and operating work that matter to you.</p><div><span>01</span>Understand your setup</div><div><span>02</span>Show relevant workflows</div><div><span>03</span>Answer commercial questions</div></aside>
      </header>
      <section className="demo-contact-body">
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
      </section>
      <footer className="demo-contact-footer"><img src={logo} alt="PrizeSkout"/><span>Margin Intelligence for modern commerce</span><small>QFC licensed · 04412 · Doha, Qatar</small></footer>
    </main>
  );
}

const contactCss = `
  .demo-contact{min-height:100vh;background:radial-gradient(circle at 15% 18%,rgba(243,106,33,.1),transparent 24%),radial-gradient(circle at 88% 34%,rgba(24,166,106,.08),transparent 24%),#f7f9fc;color:#10182d;font-family:'Chillax',system-ui,sans-serif}.demo-contact *{box-sizing:border-box}.demo-contact a{text-decoration:none;color:inherit}.demo-contact-nav{height:78px;max-width:1240px;margin:auto;padding:0 28px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #dfe5ed}.demo-contact-nav img{width:145px;display:block}.demo-contact-nav>a:last-child{padding:9px 13px;border:1px solid #dce2ea;border-radius:10px;background:#fff;font-size:12px;font-weight:700}.demo-contact-hero{max-width:1120px;margin:auto;padding:78px 28px 56px;display:grid;grid-template-columns:1.15fr .75fr;align-items:center;gap:70px}.demo-contact-hero>div>span,.demo-contact-hero aside>small{color:#f36a21;font-size:9px;font-weight:900;letter-spacing:.15em}.demo-contact-hero h1{margin:17px 0;font-size:clamp(48px,6vw,76px);line-height:1;letter-spacing:-.055em}.demo-contact-hero h1 em{color:#f36a21;font-style:normal}.demo-contact-hero>div>p{max-width:650px;color:#657086;font-size:17px;line-height:1.7}.demo-promises{display:grid;gap:9px;margin-top:25px;color:#34415a;font-size:12px;font-weight:700}.demo-promises span::first-letter{color:#18a66a}.demo-contact-hero aside{padding:28px;border:1px solid #dfe5ed;border-radius:22px;background:#fff;box-shadow:0 25px 70px #10182d12}.demo-contact-hero aside>strong{display:block;margin:10px 0;font-size:22px;line-height:1.25}.demo-contact-hero aside>p{color:#687389;font-size:12px;line-height:1.6}.demo-contact-hero aside>div{display:flex;align-items:center;gap:11px;padding:12px 0;border-top:1px solid #e7ebf1;font-size:11px;font-weight:700}.demo-contact-hero aside>div span{width:27px;height:27px;display:grid;place-items:center;border-radius:8px;background:#fff1e8;color:#f36a21;font-size:8px;font-weight:900}.demo-contact-body{max-width:1000px;margin:0 auto;padding:0 28px 90px}.demo-contact-body>div:first-child{gap:12px!important;margin-bottom:22px!important}.demo-contact-body>div:first-child>div{border-color:#dfe5ed!important;border-radius:16px!important;padding:18px!important;box-shadow:0 12px 35px #10182d08}.demo-contact-body>div:last-child{border-color:#dfe5ed!important;border-radius:22px!important;padding:34px!important;box-shadow:0 28px 75px #10182d10}.demo-contact-body h2{font-size:25px!important;color:#10182d!important}.demo-contact-body form{gap:17px!important}.demo-contact-body label{color:#34415a!important;font-size:11px!important;font-weight:800!important}.demo-contact-body input,.demo-contact-body textarea{padding:14px 15px!important;border-color:#dbe2eb!important;border-radius:11px!important;background:#f8fafc!important;color:#10182d!important;transition:border-color .2s,box-shadow .2s}.demo-contact-body input:focus,.demo-contact-body textarea:focus{border-color:#f36a21!important;box-shadow:0 0 0 4px #f36a2112;outline:none}.demo-contact-body button[type=submit]{min-width:160px;padding:14px 22px!important;border-radius:11px!important;background:#f36a21!important}.demo-contact-footer{padding:30px max(28px,calc((100vw - 1120px)/2));display:flex;align-items:center;gap:24px;border-top:1px solid #dfe5ed;background:#fff}.demo-contact-footer img{width:128px}.demo-contact-footer span{color:#657086;font-size:11px}.demo-contact-footer small{margin-inline-start:auto;color:#7b8597;font-size:9px}@media(max-width:800px){.demo-contact-hero{grid-template-columns:1fr;padding:56px 18px 38px;gap:28px}.demo-contact-nav{height:68px;padding:0 18px}.demo-contact-nav img{width:125px}.demo-contact-body{padding:0 18px 60px}.demo-contact-body>div:last-child{padding:23px!important}.demo-contact-body form>div:first-child{grid-template-columns:1fr!important}.demo-contact-footer{padding:25px 18px;flex-direction:column;align-items:flex-start;gap:9px}.demo-contact-footer small{margin:0}.demo-contact-hero h1{font-size:48px}}
`;

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
