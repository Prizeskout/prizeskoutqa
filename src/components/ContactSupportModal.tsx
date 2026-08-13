/**
 * ContactSupportModal — shared in-app "Contact support" surface, reachable
 * from the dashboard shells (PrizeSkoutDashboard, TopBar) and the public
 * marketing nav (LandingNav) alike, so merchants — including those using
 * PrizeSkout embedded inside a platform's own admin, e.g. Zid — never have
 * to leave the app to reach support.
 *
 * Reuses the same submitContactMessage server function as the public
 * /contact page — no separate backend needed.
 */
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { X, Mail, LifeBuoy, Bot, Send } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { submitContactMessage } from "@/server/contact.functions";
import { askSupportAgent } from "@/server/platform-admin.functions";

const SUPPORT_EMAIL = "support@prizeskout.qa";

export function ContactSupportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const submit = useServerFn(submitContactMessage);
  const ask = useServerFn(askSupportAgent);
  const [mode, setMode] = useState<"chat" | "ticket">("chat");
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chat, setChat] = useState<Array<{role:"user"|"assistant";content:string}>>([{role:"assistant",content:"Hi — I’m PrizeSkout Support. How can I help with your store, margins, channels, or payouts?"}]);
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy]       = useState(false);

  useEffect(() => {
    if (!open) return;
    setName((user?.user_metadata?.display_name as string | undefined) || "");
    setEmail(user?.email || "");
    setMessage("");
  }, [open, user]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();
    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      toast.error("Please fill in your name, email, and message.");
      return;
    }
    setBusy(true);
    try {
      await submit({ data: { name: trimmedName, email: trimmedEmail, message: trimmedMessage, company: null } });
      toast.success("Message sent — we'll get back to you shortly.");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send your message. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const handleChat=async(e:React.FormEvent)=>{e.preventDefault();const text=chatInput.trim();if(!text||chatBusy)return;const history=chat.slice(-10);setChat(x=>[...x,{role:"user",content:text}]);setChatInput("");setChatBusy(true);try{const r=await ask({data:{message:text,history,locale:document.documentElement.lang||"en"}});setChat(x=>[...x,{role:"assistant",content:r.answer}])}catch{setChat(x=>[...x,{role:"assistant",content:"I can’t answer right now. Please create a support ticket and our team will help."}])}finally{setChatBusy(false)}};

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", zIndex: 200 }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-support-title"
        style={{
          position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          zIndex: 201, width: "min(440px, calc(100vw - 32px))", maxHeight: "calc(100vh - 48px)",
          overflowY: "auto", background: "var(--ps-card, #fff)", border: "1px solid var(--ps-border, #E5E2DB)",
          borderRadius: 16, boxShadow: "0 24px 64px rgba(0,0,0,0.25)", padding: "24px 24px 22px",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              background: "rgba(239,104,26,0.12)", color: "#EF681A",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <LifeBuoy size={17} />
            </div>
            <div>
              <h2 id="contact-support-title" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--ps-text, #1A1A18)" }}>
                PrizeSkout support
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ps-muted, #6B6B6B)" }}>
                Get an answer now or contact our team.
              </p>
            </div>
          </div>
          <button
            type="button" onClick={onClose} aria-label="Close"
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 28, height: 28, borderRadius: 7, border: "1px solid var(--ps-border, #E5E2DB)",
              background: "transparent", color: "var(--ps-muted, #6B6B6B)", cursor: "pointer", flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,padding:4,borderRadius:10,background:"var(--ps-hover,#F4F4F2)",marginBottom:14}}>{([['chat','Ask support',Bot],['ticket','Human support',Mail]] as const).map(([id,label,Icon])=><button key={id} type="button" onClick={()=>setMode(id)} style={{display:'flex',justifyContent:'center',alignItems:'center',gap:6,padding:8,border:0,borderRadius:7,background:mode===id?'#fff':'transparent',color:mode===id?'#EF681A':'#666',fontWeight:700,cursor:'pointer'}}><Icon size={14}/>{label}</button>)}</div>
        {mode==='chat'?<div><div aria-live="polite" style={{height:290,overflow:'auto',display:'flex',flexDirection:'column',gap:9,padding:'2px 2px 12px'}}>{chat.map((x,i)=><div key={i} style={{alignSelf:x.role==='user'?'flex-end':'flex-start',maxWidth:'86%',padding:'9px 11px',borderRadius:11,background:x.role==='user'?'#EF681A':'var(--ps-hover,#F3F3F1)',color:x.role==='user'?'#fff':'var(--ps-text,#222)',fontSize:13,lineHeight:1.5,whiteSpace:'pre-wrap'}}>{x.content}</div>)}{chatBusy&&<small>Support is typing…</small>}</div><form onSubmit={handleChat} style={{display:'flex',gap:8}}><input autoFocus value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Ask a question…" style={{...inputStyle,flex:1}}/><button type="submit" aria-label="Send" disabled={chatBusy} style={{width:40,border:0,borderRadius:9,background:'#EF681A',color:'#fff',display:'grid',placeItems:'center'}}><Send size={15}/></button></form><button type="button" onClick={()=>{setMode('ticket');setMessage(chat.filter(x=>x.role==='user').map(x=>x.content).join('\n'))}} style={{width:'100%',marginTop:12,border:0,background:'transparent',color:'#EF681A',fontSize:12,fontWeight:700,cursor:'pointer'}}>Still need help? Create a human support ticket</button></div>:<>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
            padding: "9px 12px", borderRadius: 9, border: "1px solid var(--ps-border, #E5E2DB)",
            background: "var(--ps-hover, #FAFAF9)", color: "var(--ps-text, #1A1A18)",
            fontSize: 12.5, fontWeight: 600, textDecoration: "none",
          }}
        >
          <Mail size={14} style={{ flexShrink: 0 }} />
          Email us directly at {SUPPORT_EMAIL}
        </a>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--ps-muted, #6B6B6B)" }}>
            Name
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)} required
              style={inputStyle}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--ps-muted, #6B6B6B)" }}>
            Email
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              style={inputStyle}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--ps-muted, #6B6B6B)" }}>
            How can we help?
            <textarea
              value={message} onChange={(e) => setMessage(e.target.value)} required rows={4}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            />
          </label>
          <button
            type="submit" disabled={busy}
            style={{
              marginTop: 4, padding: "10px 16px", borderRadius: 9, border: "none",
              background: "#EF681A", color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? "Sending…" : "Send message"}
          </button>
        </form>
        </>}
      </div>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "9px 11px", borderRadius: 8, border: "1px solid var(--ps-border, #E5E2DB)",
  background: "var(--ps-surface-2, #fff)", color: "var(--ps-text, #1A1A18)", fontSize: 13,
  outline: "none",
};
