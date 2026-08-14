import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Bot, LifeBuoy, Mail, Send, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { submitContactMessage } from "@/server/contact.functions";
import { askSupportAgent } from "@/server/platform-admin.functions";

const SUPPORT_EMAIL = "support@prizeskout.qa";
type ChatMessage = { role: "user" | "assistant"; content: string; suggestedRoute?: string; escalate?: boolean; suggestions?: string[] };

export function ContactSupportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const submit = useServerFn(submitContactMessage);
  const ask = useServerFn(askSupportAgent);
  const [mode, setMode] = useState<"chat" | "ticket">("chat");
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string>();
  const [chat, setChat] = useState<ChatMessage[]>([{ role: "assistant", content: "Hi, I’m Noura, your PrizeSkout support guide. How can I help?" }]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const displayName = String(user?.user_metadata?.display_name || "");
    setName(displayName);
    setEmail(user?.email || "");
    setMessage("");
    if (!conversationId && chat.length === 1) {
      const firstName = (displayName || user?.email?.split("@")[0] || "").split(" ")[0];
      setChat([{ role: "assistant", content: `Hi${firstName ? ` ${firstName}` : ""}, I’m Noura, your PrizeSkout support guide. How can I help?` }]);
    }
  }, [open, user, conversationId, chat.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const conversationForTicket = () => chat.filter((item) => item.role === "user").map((item) => item.content).join("\n");
  const openHumanSupport = () => { setMode("ticket"); setMessage(conversationForTicket()); };

  const sendChat = async (text: string) => {
    if (!text.trim() || chatBusy) return;
    const history = chat.slice(-10).map(({ role, content }) => ({ role, content }));
    setChat((items) => [...items, { role: "user", content: text }]);
    setChatInput("");
    setChatBusy(true);
    try {
      const result = await ask({ data: {
        message: text, history, locale: document.documentElement.lang || "en",
        email: user?.email || undefined, conversationId, page: location.pathname,
      } });
      if (result.conversationId) setConversationId(result.conversationId);
      setChat((items) => [...items, {
        role: "assistant", content: result.answer, suggestedRoute: result.suggestedRoute,
        escalate: result.escalate, suggestions: result.suggestedQuestions,
      }]);
    } catch {
      setChat((items) => [...items, { role: "assistant", content: "I can’t answer reliably right now. Please contact our human support team.", escalate: true }]);
    } finally { setChatBusy(false); }
  };

  const handleTicket = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) { toast.error("Please fill in your name, email, and message."); return; }
    setBusy(true);
    try {
      await submit({ data: { name: name.trim(), email: email.trim(), message: message.trim(), company: null } });
      toast.success("Message sent — we’ll get back to you shortly.");
      onClose();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not send your message."); }
    finally { setBusy(false); }
  };

  return <>
    <div aria-hidden onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 400 }} />
    <div role="dialog" aria-modal="true" aria-labelledby="noura-title" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 401, width: "min(460px,calc(100vw - 24px))", maxHeight: "calc(100vh - 24px)", overflowY: "auto", boxSizing: "border-box", background: "var(--ps-card,#fff)", border: "1px solid var(--ps-border,#E5E2DB)", borderRadius: 18, boxShadow: "0 24px 64px rgba(0,0,0,.25)", padding: 22 }}>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(239,104,26,.12)", color: "#EF681A", display: "grid", placeItems: "center" }}><LifeBuoy size={18}/></div><div><h2 id="noura-title" style={{ margin: 0, fontSize: 16 }}>Noura · PrizeSkout Support</h2><p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--ps-muted,#6B6B6B)" }}>Get an answer now or contact our team.</p></div></div>
        <button type="button" onClick={onClose} aria-label="Close" style={iconButton}><X size={14}/></button>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, padding: 4, borderRadius: 10, background: "var(--ps-hover,#F4F4F2)", marginBottom: 14 }}>
        {([ ["chat", "Chat with Noura", Bot], ["ticket", "Human support", Mail] ] as const).map(([id, label, Icon]) => <button key={id} type="button" onClick={() => setMode(id)} style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, padding: 8, border: 0, borderRadius: 7, background: mode === id ? "#fff" : "transparent", color: mode === id ? "#EF681A" : "#666", fontWeight: 700, cursor: "pointer" }}><Icon size={14}/>{label}</button>)}
      </div>

      {mode === "chat" ? <div>
        <div aria-live="polite" style={{ height: 330, overflowY: "auto", display: "flex", flexDirection: "column", gap: 9, padding: "2px 2px 12px" }}>
          {chat.map((item, index) => <div key={index} style={{ alignSelf: item.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%" }}>
            <div style={{ padding: "9px 11px", borderRadius: 11, background: item.role === "user" ? "#EF681A" : "var(--ps-hover,#F3F3F1)", color: item.role === "user" ? "#fff" : "var(--ps-text,#222)", fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{item.content}</div>
            {item.suggestedRoute?.startsWith("/") && <a href={item.suggestedRoute} style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, color: "#EF681A", fontSize: 11.5, fontWeight: 700, textDecoration: "none" }}>Open the right screen <ArrowRight size={12}/></a>}
            {item.suggestions?.map((question) => <button key={question} type="button" onClick={() => void sendChat(question)} style={suggestionButton}>{question}</button>)}
            {item.escalate && <button type="button" onClick={openHumanSupport} style={textButton}>Talk to a person →</button>}
          </div>)}
          {chatBusy && <small style={{ color: "var(--ps-muted,#777)" }}>Noura is thinking…</small>}
        </div>
        <form onSubmit={(event) => { event.preventDefault(); void sendChat(chatInput); }} style={{ display: "flex", gap: 8 }}><input autoFocus value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Ask Noura a question…" style={{ ...inputStyle, flex: 1 }}/><button type="submit" aria-label="Send" disabled={chatBusy || !chatInput.trim()} style={{ width: 42, border: 0, borderRadius: 9, background: "#EF681A", color: "#fff", display: "grid", placeItems: "center", cursor: "pointer" }}><Send size={15}/></button></form>
        <button type="button" onClick={openHumanSupport} style={{ ...textButton, width: "100%", textAlign: "center", marginTop: 12 }}>Talk to the human support team</button>
      </div> : <>
        <a href={`mailto:${SUPPORT_EMAIL}`} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "9px 12px", borderRadius: 9, border: "1px solid var(--ps-border,#E5E2DB)", background: "var(--ps-hover,#FAFAF9)", color: "var(--ps-text,#1A1A18)", fontSize: 12.5, fontWeight: 600, textDecoration: "none" }}><Mail size={14}/>Email us directly at {SUPPORT_EMAIL}</a>
        <form onSubmit={handleTicket} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Name"><input value={name} onChange={(event) => setName(event.target.value)} required style={inputStyle}/></Field>
          <Field label="Email"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required style={inputStyle}/></Field>
          <Field label="How can we help?"><textarea value={message} onChange={(event) => setMessage(event.target.value)} required rows={5} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}/></Field>
          <button type="submit" disabled={busy} style={{ padding: "10px 16px", borderRadius: 9, border: 0, background: "#EF681A", color: "#fff", fontSize: 13, fontWeight: 700, cursor: busy ? "wait" : "pointer", opacity: busy ? .7 : 1 }}>{busy ? "Sending…" : "Send message"}</button>
        </form>
      </>}
    </div>
  </>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--ps-muted,#6B6B6B)" }}>{label}{children}</label>; }
const inputStyle: React.CSSProperties = { padding: "9px 11px", borderRadius: 8, border: "1px solid var(--ps-border,#E5E2DB)", background: "var(--ps-surface-2,#fff)", color: "var(--ps-text,#1A1A18)", fontSize: 13, outline: "none", minWidth: 0 };
const iconButton: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 7, border: "1px solid var(--ps-border,#E5E2DB)", background: "transparent", color: "var(--ps-muted,#6B6B6B)", cursor: "pointer" };
const textButton: React.CSSProperties = { display: "inline-block", marginTop: 7, border: 0, background: "transparent", padding: 0, color: "#EF681A", fontSize: 11.5, fontWeight: 800, cursor: "pointer" };
const suggestionButton: React.CSSProperties = { display: "block", marginTop: 6, padding: "6px 9px", border: "1px solid var(--ps-border,#E5E2DB)", borderRadius: 99, background: "#fff", color: "var(--ps-text,#222)", fontSize: 11, cursor: "pointer", textAlign: "left" };
