import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Bot, CheckCircle2, ChevronRight, HelpCircle, LifeBuoy, Mail, Minus, Search, Send, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { submitContactMessage } from "@/server/contact.functions";
import { askSupportAgent } from "@/server/platform-admin.functions";
import { HELP_ARTICLES, HELP_CATEGORIES, type HelpArticle } from "@/lib/help-center-data";
import { safeClientErrorMessage } from "@/lib/api-error";

const SUPPORT_EMAIL = "support@prizeskout.qa";
type ChatMessage = { role: "user" | "assistant"; content: string; suggestedRoute?: string; escalate?: boolean; suggestions?: string[] };

export function ContactSupportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const submit = useServerFn(submitContactMessage);
  const ask = useServerFn(askSupportAgent);
  const [mode, setMode] = useState<"chat" | "ticket" | "help">("chat");
  const [helpSearch, setHelpSearch] = useState("");
  const [helpArticle, setHelpArticle] = useState<HelpArticle>();
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string>();
  const [chat, setChat] = useState<ChatMessage[]>([{ role: "assistant", content: "Hi, I’m Noura, your PrizeSkout support guide. How can I help?" }]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [ticketSent, setTicketSent] = useState(false);
  const [restored, setRestored] = useState(false);
  const storageKey = `prizeskout-support-workspace:${user?.id || "guest"}`;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) || "null") as {
        mode?: "chat" | "ticket" | "help"; helpSearch?: string; helpArticleId?: string;
        chatInput?: string; conversationId?: string; chat?: ChatMessage[]; message?: string;
      } | null;
      if (saved?.mode) setMode(saved.mode);
      if (typeof saved?.helpSearch === "string") setHelpSearch(saved.helpSearch);
      if (saved?.helpArticleId) setHelpArticle(HELP_ARTICLES.find((item) => item.id === saved.helpArticleId));
      if (typeof saved?.chatInput === "string") setChatInput(saved.chatInput);
      if (saved?.conversationId) setConversationId(saved.conversationId);
      if (Array.isArray(saved?.chat) && saved.chat.length) setChat(saved.chat);
      if (typeof saved?.message === "string") setMessage(saved.message);
    } catch { /* Ignore invalid local state and start fresh. */ }
    setRestored(true);
  }, [storageKey]);

  useEffect(() => {
    if (!restored || typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, JSON.stringify({ mode, helpSearch, helpArticleId: helpArticle?.id, chatInput, conversationId, chat, message }));
  }, [restored, storageKey, mode, helpSearch, helpArticle?.id, chatInput, conversationId, chat, message]);

  useEffect(() => {
    if (!open) return;
    const displayName = String(user?.user_metadata?.display_name || "");
    setName((current) => current || displayName);
    setEmail((current) => current || user?.email || "");
    if (!conversationId && chat.length === 1) {
      const firstName = (displayName || user?.email?.split("@")[0] || "").split(" ")[0];
      setChat([{ role: "assistant", content: `Hi${firstName ? ` ${firstName}` : ""}, I’m Noura, your PrizeSkout support guide. How can I help?` }]);
    }
  }, [open, user, conversationId, chat.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setMinimized(true); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const closeSupport = () => { setMinimized(false); onClose(); };

  const conversationForTicket = () => chat.filter((item) => item.role === "user").map((item) => item.content).join("\n");
  const openHumanSupport = () => { setTicketSent(false); setMode("ticket"); setMessage((current) => current || conversationForTicket()); };

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
      setMessage("");
      setTicketSent(true);
    } catch (error) { toast.error(safeClientErrorMessage(error, "Your message could not be sent. Please try again or email support@prizeskout.qa.")); }
    finally { setBusy(false); }
  };

  if (minimized) return <button type="button" onClick={() => setMinimized(false)} aria-label="Restore support conversation" style={{ position: "fixed", insetInlineEnd: 20, bottom: 20, zIndex: 401, display: "flex", alignItems: "center", gap: 9, padding: "12px 17px", border: 0, borderRadius: 999, background: "#EF681A", color: "#fff", boxShadow: "0 12px 30px rgba(0,0,0,.22)", fontWeight: 800, cursor: "pointer" }}><LifeBuoy size={17}/><span>Noura support</span><small style={{ opacity: .82 }}>Continue</small></button>;

  return <div role="dialog" aria-modal="false" aria-labelledby="noura-title" style={{ position: "fixed", insetInlineEnd: 20, bottom: 20, zIndex: 401, width: "min(460px,calc(100vw - 24px))", maxHeight: "calc(100vh - 40px)", overflowY: "auto", boxSizing: "border-box", background: "var(--ps-card,#fff)", border: "1px solid var(--ps-border,#E5E2DB)", borderRadius: 18, boxShadow: "0 24px 64px rgba(0,0,0,.25)", padding: 22 }}>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(239,104,26,.12)", color: "#EF681A", display: "grid", placeItems: "center" }}><LifeBuoy size={18}/></div><div><h2 id="noura-title" style={{ margin: 0, fontSize: 16 }}>Noura · PrizeSkout Support</h2><p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--ps-muted,#6B6B6B)" }}>Get an answer now or contact our team.</p></div></div>
        <div style={{ display: "flex", gap: 6 }}><button type="button" onClick={() => setMinimized(true)} aria-label="Minimize support" title="Minimize" style={iconButton}><Minus size={14}/></button><button type="button" onClick={closeSupport} aria-label="Close support" title="Close" style={iconButton}><X size={14}/></button></div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 5, padding: 4, borderRadius: 10, background: "var(--ps-hover,#F4F4F2)", marginBottom: 14 }}>
        {([ ["chat", "Noura", Bot], ["ticket", "Human", Mail], ["help", "Help", HelpCircle] ] as const).map(([id, label, Icon]) => <button key={id} type="button" onClick={() => setMode(id)} style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, padding: 8, border: 0, borderRadius: 7, background: mode === id ? "#fff" : "transparent", color: mode === id ? "#EF681A" : "#666", fontWeight: 700, cursor: "pointer" }}><Icon size={14}/>{label}</button>)}
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
      </div> : mode === "help" ? <HelpCenter search={helpSearch} onSearch={setHelpSearch} article={helpArticle} onArticle={setHelpArticle} onAsk={(article) => { setMode("chat"); void sendChat(`Help me with: ${article.title}`); }} /> : ticketSent ? <TicketSent onChat={() => { setTicketSent(false); setMode("chat"); }} onHelp={() => { setTicketSent(false); setMode("help"); }} onAnother={() => setTicketSent(false)} onMinimize={() => setMinimized(true)}/> : <>
        <a href={`mailto:${SUPPORT_EMAIL}`} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "9px 12px", borderRadius: 9, border: "1px solid var(--ps-border,#E5E2DB)", background: "var(--ps-hover,#FAFAF9)", color: "var(--ps-text,#1A1A18)", fontSize: 12.5, fontWeight: 600, textDecoration: "none" }}><Mail size={14}/>Email us directly at {SUPPORT_EMAIL}</a>
        <form onSubmit={handleTicket} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Name"><input value={name} onChange={(event) => setName(event.target.value)} required style={inputStyle}/></Field>
          <Field label="Email"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required style={inputStyle}/></Field>
          <Field label="How can we help?"><textarea value={message} onChange={(event) => setMessage(event.target.value)} required rows={5} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}/></Field>
          <button type="submit" disabled={busy} style={{ padding: "10px 16px", borderRadius: 9, border: 0, background: "#EF681A", color: "#fff", fontSize: 13, fontWeight: 700, cursor: busy ? "wait" : "pointer", opacity: busy ? .7 : 1 }}>{busy ? "Sending…" : "Send message"}</button>
        </form>
      </>}
    </div>;
}

function TicketSent({ onChat, onHelp, onAnother, onMinimize }: { onChat: () => void; onHelp: () => void; onAnother: () => void; onMinimize: () => void }) {
  return <div aria-live="polite" style={{ minHeight: 330, display: "flex", flexDirection: "column", justifyContent: "center", gap: 13 }}>
    <div style={{ padding: 16, borderRadius: 12, border: "1px solid #A7E7BD", background: "#ECFDF3", color: "#087A33" }}><div style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 800 }}><CheckCircle2 size={19}/>Message sent</div><p style={{ margin: "7px 0 0", fontSize: 13, lineHeight: 1.5 }}>Our support team will get back to you shortly. You can keep using PrizeSkout while you wait.</p></div>
    <div style={{ fontSize: 12, fontWeight: 800 }}>What would you like to do next?</div>
    <button type="button" onClick={onChat} style={actionButton}>Continue with Noura <ArrowRight size={14}/></button>
    <button type="button" onClick={onHelp} style={actionButton}>Browse the Help Center <ArrowRight size={14}/></button>
    <button type="button" onClick={onAnother} style={actionButton}>Send another message <ArrowRight size={14}/></button>
    <button type="button" onClick={onMinimize} style={{ ...textButton, alignSelf: "center", marginTop: 4 }}>Minimize and continue working</button>
  </div>;
}

function HelpCenter({ search, onSearch, article, onArticle, onAsk }: { search: string; onSearch: (value: string) => void; article?: HelpArticle; onArticle: (article?: HelpArticle) => void; onAsk: (article: HelpArticle) => void }) {
  if (article) return <div style={{ minHeight: 390 }}>
    <button type="button" onClick={() => onArticle(undefined)} style={{ ...textButton, margin: "0 0 14px" }}><ArrowLeft size={12} style={{ display: "inline", verticalAlign: "-2px" }}/> All help</button>
    <div style={{ fontSize: 10.5, color: "#EF681A", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em" }}>{article.category}</div>
    <h3 style={{ margin: "6px 0 8px", fontSize: 20 }}>{article.title}</h3>
    <p style={{ margin: "0 0 16px", color: "var(--ps-muted,#666)", fontSize: 13, lineHeight: 1.55 }}>{article.summary}</p>
    <ol style={{ paddingInlineStart: 21, margin: 0, display: "grid", gap: 11, fontSize: 13, lineHeight: 1.55 }}>{article.body.map((paragraph) => <li key={paragraph}>{paragraph}</li>)}</ol>
    <div style={{ display: "flex", gap: 9, marginTop: 20, flexWrap: "wrap" }}>{article.route && <a href={article.route} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 11px", borderRadius: 8, background: "#EF681A", color: "#fff", fontSize: 12, fontWeight: 800, textDecoration: "none" }}>Open screen <ArrowRight size={12}/></a>}<button type="button" onClick={() => onAsk(article)} style={{ padding: "8px 11px", border: "1px solid var(--ps-border,#ddd)", borderRadius: 8, background: "#fff", color: "#EF681A", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>Ask Noura</button></div>
  </div>;

  const query = search.trim().toLowerCase();
  const matches = query ? HELP_ARTICLES.filter((item) => `${item.title} ${item.summary} ${item.category} ${item.keywords.join(" ")}`.toLowerCase().includes(query)) : [];
  return <div style={{ minHeight: 390 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, background: "var(--ps-hover,#F4F4F2)", marginBottom: 12 }}><Search size={16} color="#6B6B6B"/><input autoFocus type="search" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search for help" style={{ border: 0, outline: 0, background: "transparent", width: "100%", fontSize: 14 }}/></div>
    <div style={{ maxHeight: 345, overflowY: "auto" }}>{query ? <>{matches.map((item) => <HelpRow key={item.id} title={item.title} detail={item.category} onClick={() => onArticle(item)}/>) }{!matches.length && <div style={{ padding: 28, textAlign: "center", color: "#777", fontSize: 13 }}>No article matched. Ask Noura or contact human support.</div>}</> : HELP_CATEGORIES.map((category) => { const articles = HELP_ARTICLES.filter((item) => item.category === category); return <div key={category} style={{ marginBottom: 5 }}><div style={{ padding: "10px 4px 5px", fontSize: 11, color: "#777", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em" }}>{category}</div>{articles.map((item) => <HelpRow key={item.id} title={item.title} detail={item.summary} onClick={() => onArticle(item)}/>)}</div>; })}</div>
  </div>;
}

function HelpRow({ title, detail, onClick }: { title: string; detail: string; onClick: () => void }) { return <button type="button" onClick={onClick} style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center", padding: "11px 5px", border: 0, borderBottom: "1px solid var(--ps-border,#eee)", background: "transparent", textAlign: "left", cursor: "pointer" }}><span><b style={{ display: "block", fontSize: 13 }}>{title}</b><small style={{ display: "block", marginTop: 3, color: "#777", lineHeight: 1.35 }}>{detail}</small></span><ChevronRight size={16} color="#777"/></button>; }

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--ps-muted,#6B6B6B)" }}>{label}{children}</label>; }
const inputStyle: React.CSSProperties = { padding: "9px 11px", borderRadius: 8, border: "1px solid var(--ps-border,#E5E2DB)", background: "var(--ps-surface-2,#fff)", color: "var(--ps-text,#1A1A18)", fontSize: 13, outline: "none", minWidth: 0 };
const iconButton: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 7, border: "1px solid var(--ps-border,#E5E2DB)", background: "transparent", color: "var(--ps-muted,#6B6B6B)", cursor: "pointer" };
const textButton: React.CSSProperties = { display: "inline-block", marginTop: 7, border: 0, background: "transparent", padding: 0, color: "#EF681A", fontSize: 11.5, fontWeight: 800, cursor: "pointer" };
const suggestionButton: React.CSSProperties = { display: "block", marginTop: 6, padding: "6px 9px", border: "1px solid var(--ps-border,#E5E2DB)", borderRadius: 99, background: "#fff", color: "var(--ps-text,#222)", fontSize: 11, cursor: "pointer", textAlign: "left" };
const actionButton: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "10px 12px", border: "1px solid var(--ps-border,#E5E2DB)", borderRadius: 9, background: "var(--ps-surface-2,#fff)", color: "var(--ps-text,#222)", fontSize: 12.5, fontWeight: 700, cursor: "pointer" };
