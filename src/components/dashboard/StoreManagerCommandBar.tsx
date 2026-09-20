import { useEffect, useMemo, useRef, useState } from "react";

type Lang = "en" | "ar" | "fr";
type ManagerMessage = {
  role: "user" | "assistant";
  text: string;
  messageType?: "text" | "task" | "approval" | "execution" | "evidence" | "error";
};

const OG = "#EF681A";
const COPY = {
  en: {
    name: "Chat with your AI Store Manager",
    description: "Ask a question or assign store work here. PrizeSkout keeps the conversation in place and asks before protected changes.",
    placeholder: "Ask a question or assign a task…",
    send: "Send",
    working: "PrizeSkout is preparing a response",
    expand: "Expand chat",
    compact: "Compact chat",
    newChat: "New chat",
    saved: "Saved",
    session: "This session",
    manager: "AI Store Manager",
    approval: "Approval required",
    prepared: "Task prepared",
    completed: "Task completed",
    evidence: "Result ready",
    attention: "Needs attention",
    approve: "Approve and run",
    review: "Review details",
    change: "Request changes",
    helper: "Enter sends · Shift + Enter adds a new line",
    suggestions: ["What needs my attention today?", "Find products with incomplete information", "Prepare my highest-priority store tasks"],
    followUps: ["What should I do next?", "Explain this result", "Prepare the next step"],
    approvalFollowUps: ["What will change?", "Show me the affected products", "Change this task"],
  },
  ar: {
    name: "تحدث مع مدير المتجر الذكي",
    description: "اطرح سؤالاً أو فوّض أعمال المتجر هنا. يحافظ PrizeSkout على المحادثة في مكانها ويطلب موافقتك قبل التغييرات المحمية.",
    placeholder: "اطرح سؤالاً أو فوّض مهمة…",
    send: "إرسال",
    working: "يقوم PrizeSkout بإعداد الرد",
    expand: "توسيع المحادثة",
    compact: "تصغير المحادثة",
    newChat: "محادثة جديدة",
    saved: "محفوظة",
    session: "هذه الجلسة",
    manager: "مدير المتجر الذكي",
    approval: "الموافقة مطلوبة",
    prepared: "تم إعداد المهمة",
    completed: "اكتملت المهمة",
    evidence: "النتيجة جاهزة",
    attention: "يحتاج إلى الانتباه",
    approve: "الموافقة والتنفيذ",
    review: "مراجعة التفاصيل",
    change: "طلب تعديلات",
    helper: "Enter للإرسال · Shift + Enter لسطر جديد",
    suggestions: ["ما الذي يحتاج إلى انتباهي اليوم؟", "اعرض المنتجات ذات المعلومات الناقصة", "جهّز أهم مهام المتجر"],
    followUps: ["ماذا أفعل بعد ذلك؟", "اشرح هذه النتيجة", "جهّز الخطوة التالية"],
    approvalFollowUps: ["ما الذي سيتغير؟", "اعرض المنتجات المتأثرة", "عدّل هذه المهمة"],
  },
  fr: {
    name: "Discutez avec votre gestionnaire de boutique IA",
    description: "Posez une question ou déléguez une tâche ici. PrizeSkout conserve la conversation sur la page et demande votre validation avant tout changement protégé.",
    placeholder: "Posez une question ou déléguez une tâche…",
    send: "Envoyer",
    working: "PrizeSkout prépare une réponse",
    expand: "Agrandir le chat",
    compact: "Réduire le chat",
    newChat: "Nouveau chat",
    saved: "Enregistré",
    session: "Cette session",
    manager: "Gestionnaire de boutique IA",
    approval: "Validation requise",
    prepared: "Tâche préparée",
    completed: "Tâche terminée",
    evidence: "Résultat prêt",
    attention: "Attention requise",
    approve: "Valider et exécuter",
    review: "Voir les détails",
    change: "Demander des modifications",
    helper: "Entrée pour envoyer · Maj + Entrée pour une nouvelle ligne",
    suggestions: ["Que dois-je examiner aujourd’hui ?", "Trouver les produits aux informations incomplètes", "Préparer mes tâches prioritaires"],
    followUps: ["Que dois-je faire ensuite ?", "Expliquer ce résultat", "Préparer l’étape suivante"],
    approvalFollowUps: ["Qu’est-ce qui va changer ?", "Afficher les produits concernés", "Modifier cette tâche"],
  },
} as const;

function messageLabel(message: ManagerMessage, copy: (typeof COPY)[Lang]) {
  if (message.messageType === "approval") return copy.approval;
  if (message.messageType === "execution") return copy.completed;
  if (message.messageType === "evidence") return copy.evidence;
  if (message.messageType === "error") return copy.attention;
  if (message.messageType === "task") return copy.prepared;
  return copy.manager;
}

export function StoreManagerCommandBar({
  context,
  examples,
  messages,
  onSubmit,
  onNewChat,
  error,
  needsReview = false,
  approvalReady = false,
  onApprove,
  onReview,
  saved = false,
  busy = false,
  lang = "en",
}: {
  context: string;
  examples: string[];
  messages: ManagerMessage[];
  onSubmit: (prompt: string) => void;
  onNewChat: () => void;
  error?: string | null;
  needsReview?: boolean;
  approvalReady?: boolean;
  onApprove?: () => void;
  onReview?: () => void;
  saved?: boolean;
  busy?: boolean;
  lang?: Lang;
}) {
  const c = COPY[lang];
  const [value, setValue] = useState("");
  const [expanded, setExpanded] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const conversationStarted = messages.length > 0 || busy || Boolean(error);
  const visibleMessages = expanded ? messages : messages.slice(-4);
  const suggestions = useMemo(() => {
    const contextual = needsReview ? c.approvalFollowUps : conversationStarted ? c.followUps : c.suggestions;
    return [...new Set([...(conversationStarted ? [] : examples), ...contextual])].slice(0, 3);
  }, [c, conversationStarted, examples, needsReview]);

  useEffect(() => {
    const transcript = transcriptRef.current;
    if (transcript) transcript.scrollTop = transcript.scrollHeight;
  }, [busy, expanded, messages.length]);

  const submit = () => {
    const prompt = value.trim();
    if (!prompt || busy) return;
    setExpanded(true);
    onSubmit(prompt);
    setValue("");
    window.requestAnimationFrame(() => composerRef.current?.focus());
  };

  const startNewChat = () => {
    onNewChat();
    setValue("");
    setExpanded(false);
    window.requestAnimationFrame(() => composerRef.current?.focus());
  };

  return (
    <section
      data-tour="copilot-command"
      className="ps-command-deck"
      aria-label={c.name}
      style={{
        margin: "18px 30px 0",
        padding: "16px 18px",
        border: `1px solid color-mix(in srgb,${OG} 28%,var(--border))`,
        borderRadius: 15,
        background: `linear-gradient(135deg,color-mix(in srgb,${OG} 6%,var(--surface)),var(--surface))`,
        boxShadow: "0 10px 28px rgba(15,23,42,.06)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap", marginBottom: conversationStarted ? 13 : 11 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: "var(--text)" }}>{c.name}</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3, maxWidth: 760, lineHeight: 1.5 }}>{c.description}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 5 }}>
            <span style={{ fontSize: 10.5, color: OG, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em" }}>{context}</span>
            {conversationStarted && <span style={{ fontSize: 10, color: saved ? "#15803D" : "var(--muted)", fontWeight: 800, textTransform: "uppercase" }}>· {saved ? c.saved : c.session}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {messages.length > 0 && (
            <button type="button" onClick={startNewChat} disabled={busy} style={{ minHeight: 38, border: 0, padding: "8px 4px", background: "transparent", color: "var(--muted)", fontFamily: "inherit", fontWeight: 750, fontSize: 11.5, cursor: busy ? "not-allowed" : "pointer" }}>{c.newChat}</button>
          )}
          <button type="button" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)} style={{ minHeight: 38, border: "1px solid var(--border)", borderRadius: 999, padding: "8px 11px", background: "var(--surface)", color: "var(--text)", fontFamily: "inherit", fontWeight: 800, fontSize: 11.5, cursor: "pointer" }}>
            {expanded ? c.compact : c.expand}
          </button>
        </div>
      </div>

      {conversationStarted && (
        <div
          ref={transcriptRef}
          role="log"
          aria-label={c.name}
          aria-live="polite"
          aria-relevant="additions text"
          style={{
            maxHeight: expanded ? 430 : 230,
            overflowY: "auto",
            overscrollBehavior: "contain",
            display: "grid",
            gap: 8,
            padding: "12px",
            marginBottom: 12,
            border: "1px solid var(--border)",
            borderRadius: 12,
            background: "color-mix(in srgb,var(--surface2) 62%,var(--surface))",
          }}
        >
          {!expanded && messages.length > visibleMessages.length && (
            <button type="button" onClick={() => setExpanded(true)} style={{ justifySelf: "center", border: 0, padding: "4px 8px", background: "transparent", color: "var(--muted)", fontFamily: "inherit", fontSize: 11.5, fontWeight: 750, cursor: "pointer" }}>
              {c.expand}
            </button>
          )}
          {visibleMessages.map((message, index) => {
            const structured = message.role === "assistant" && message.messageType && message.messageType !== "text";
            const isError = message.messageType === "error";
            const isApproval = message.messageType === "approval";
            return (
              <div
                key={`${message.role}-${messages.length - visibleMessages.length + index}-${message.text.slice(0, 24)}`}
                style={{
                  justifySelf: message.role === "user" ? "end" : "start",
                  width: structured ? "min(100%,720px)" : "auto",
                  maxWidth: message.role === "user" ? "min(82%,680px)" : "min(92%,760px)",
                  borderRadius: message.role === "user" ? "12px 12px 3px 12px" : "3px 12px 12px 12px",
                  padding: "10px 12px",
                  background: message.role === "user" ? "var(--navy)" : isError ? "color-mix(in srgb,#DC2626 8%,var(--surface))" : isApproval ? "color-mix(in srgb,#F59E0B 8%,var(--surface))" : "var(--surface)",
                  border: message.role === "assistant" ? `1px solid ${isError ? "color-mix(in srgb,#DC2626 28%,var(--border))" : isApproval ? "color-mix(in srgb,#F59E0B 38%,var(--border))" : "var(--border)"}` : "none",
                  color: message.role === "user" ? "#fff" : isError ? "#B91C1C" : "var(--text)",
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                }}
              >
                {message.role === "assistant" && <div style={{ marginBottom: 4, color: isError ? "#B91C1C" : isApproval ? "#A16207" : OG, fontSize: 10.5, fontWeight: 850, letterSpacing: ".05em", textTransform: "uppercase" }}>{messageLabel(message, c)}</div>}
                {message.text}
              </div>
            );
          })}
          {busy && (
            <div role="status" style={{ justifySelf: "start", display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--border)", borderRadius: "3px 12px 12px 12px", padding: "10px 12px", background: "var(--surface)", color: "var(--muted)", fontSize: 13 }}>
              <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: OG, boxShadow: `0 0 0 4px color-mix(in srgb,${OG} 12%,transparent)`, animation: "pk-pulse 1.2s ease-in-out infinite" }} />
              {c.working}…
            </div>
          )}
          {error && !messages.some((message) => message.messageType === "error" && message.text === error) && (
            <div role="alert" style={{ justifySelf: "start", maxWidth: "min(92%,760px)", border: "1px solid color-mix(in srgb,#DC2626 28%,var(--border))", borderRadius: "3px 12px 12px 12px", padding: "10px 12px", background: "color-mix(in srgb,#DC2626 8%,var(--surface))", color: "#B91C1C", fontSize: 13.5, lineHeight: 1.55 }}>
              <strong style={{ display: "block", marginBottom: 3, fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".05em" }}>{c.attention}</strong>
              {error}
            </div>
          )}
          {needsReview && !busy && !error && (
            <div style={{ justifySelf: "start", width: "min(100%,720px)", boxSizing: "border-box", border: "1px solid color-mix(in srgb,#F59E0B 38%,var(--border))", borderRadius: 12, padding: "11px 12px", background: "color-mix(in srgb,#F59E0B 7%,var(--surface))" }}>
              <strong style={{ display: "block", color: "var(--text)", fontSize: 12.5 }}>{c.approval}</strong>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 9 }}>
                {approvalReady && onApprove && <button type="button" onClick={onApprove} style={{ minHeight: 40, border: 0, borderRadius: 9, padding: "9px 12px", background: OG, color: "#fff", fontFamily: "inherit", fontWeight: 850, cursor: "pointer" }}>{c.approve}</button>}
                {onReview && <button type="button" onClick={onReview} style={{ minHeight: 40, border: `1px solid ${OG}`, borderRadius: 9, padding: "9px 12px", background: "var(--surface)", color: OG, fontFamily: "inherit", fontWeight: 800, cursor: "pointer" }}>{c.review}</button>}
                <button type="button" onClick={() => { setValue(lang === "en" ? "Change this task: " : lang === "fr" ? "Modifier cette tâche : " : "عدّل هذه المهمة: "); composerRef.current?.focus(); }} style={{ minHeight: 40, border: 0, padding: "9px 8px", background: "transparent", color: "var(--muted)", fontFamily: "inherit", fontWeight: 750, cursor: "pointer" }}>{c.change}</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
        <textarea
          ref={composerRef}
          aria-label={c.placeholder}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={c.placeholder}
          rows={expanded ? 2 : 1}
          disabled={busy}
          style={{ flex: "1 1 260px", minWidth: 0, minHeight: 44, maxHeight: 120, boxSizing: "border-box", resize: "vertical", border: "1.5px solid var(--border)", borderRadius: 11, padding: "11px 14px", background: "var(--surface)", color: "var(--text)", fontFamily: "inherit", fontSize: 14.5, lineHeight: 1.45, outline: "none" }}
        />
        <button type="button" disabled={!value.trim() || busy} onClick={submit} style={{ minHeight: 44, border: 0, borderRadius: 11, padding: "11px 20px", background: OG, color: "#fff", fontFamily: "inherit", fontWeight: 850, cursor: value.trim() && !busy ? "pointer" : "not-allowed", opacity: value.trim() && !busy ? 1 : 0.5 }}>{c.send}</button>
      </div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 9 }}>
        {suggestions.map((suggestion) => (
          <button key={suggestion} type="button" disabled={busy} onClick={() => { setValue(suggestion); composerRef.current?.focus(); }} style={{ minHeight: 34, whiteSpace: "normal", textAlign: "start", border: "1px solid var(--border)", borderRadius: 999, padding: "6px 10px", background: "var(--surface)", color: "var(--muted)", fontFamily: "inherit", fontSize: 10.5, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? .55 : 1 }}>{suggestion}</button>
        ))}
      </div>
      <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 10.5 }}>{c.helper}</div>
    </section>
  );
}
