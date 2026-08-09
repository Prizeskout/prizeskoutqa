import { useState } from "react";

type Lang = "en" | "ar" | "fr";

const OG = "#EF681A";
const COPY = {
  en: {
    name: "PrizeSkout Assistant",
    description: "Ask a question or describe an outcome. PrizeSkout will choose the right tool, act when safe, and ask once before any protected change.",
    placeholder: "What would you like PrizeSkout to handle?",
    submit: "Send",
    working: "Working",
    open: "Open assistant",
    suggestions: ["What needs my attention today?", "Find products with incomplete information", "Prepare my highest priority store tasks"],
  },
  ar: {
    name: "مساعد PrizeSkout",
    description: "اطرح سؤالاً أو صف النتيجة المطلوبة. سيختار PrizeSkout الأداة المناسبة وينفذ ما هو آمن ويطلب موافقتك مرة واحدة قبل أي تغيير محمي.",
    placeholder: "ما الذي تريد من PrizeSkout إنجازه؟",
    submit: "إرسال",
    working: "جارٍ التنفيذ",
    open: "فتح المساعد",
    suggestions: ["ما الذي يحتاج إلى انتباهي اليوم؟", "اعرض المنتجات ذات المعلومات الناقصة", "جهّز أهم مهام المتجر"],
  },
  fr: {
    name: "Assistant PrizeSkout",
    description: "Posez une question ou décrivez le résultat souhaité. PrizeSkout choisit le bon outil, agit lorsque cela est sûr et demande une seule validation avant tout changement protégé.",
    placeholder: "Que souhaitez vous confier à PrizeSkout ?",
    submit: "Envoyer",
    working: "En cours",
    open: "Ouvrir l’assistant",
    suggestions: ["Que dois je examiner aujourd’hui ?", "Trouver les produits aux informations incomplètes", "Préparer mes tâches prioritaires"],
  },
} as const;

export function StoreManagerCommandBar({
  context,
  examples,
  onSubmit,
  onOpenAssistant,
  busy = false,
  lang = "en",
}: {
  context: string;
  examples: string[];
  onSubmit: (prompt: string) => void;
  onOpenAssistant: () => void;
  busy?: boolean;
  lang?: Lang;
}) {
  const c = COPY[lang];
  const [value, setValue] = useState("");
  const suggestions = [...new Set([...examples, ...c.suggestions])].slice(0, 3);
  const submit = () => {
    const prompt = value.trim();
    if (!prompt || busy) return;
    onSubmit(prompt);
    setValue("");
  };

  return (
    <section
      data-tour="copilot-command"
      style={{
        margin: "18px 30px 0",
        padding: "16px 18px",
        border: `1px solid color-mix(in srgb,${OG} 28%,var(--border))`,
        borderRadius: 15,
        background: `linear-gradient(135deg,color-mix(in srgb,${OG} 6%,var(--surface)),var(--surface))`,
        boxShadow: "0 10px 28px rgba(15,23,42,.06)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap", marginBottom: 11 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, color: "var(--text)" }}>{c.name}</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3, maxWidth: 760 }}>{c.description}</div>
          <div style={{ fontSize: 10.5, color: OG, marginTop: 5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em" }}>{context}</div>
        </div>
        <button type="button" onClick={onOpenAssistant} style={{ border: "1px solid var(--border)", borderRadius: 999, padding: "8px 11px", background: "var(--surface)", color: "var(--text)", fontFamily: "inherit", fontWeight: 800, fontSize: 11.5, cursor: "pointer" }}>{c.open}</button>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
        <input
          aria-label={c.name}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") submit(); }}
          placeholder={c.placeholder}
          style={{ flex: 1, minWidth: 0, border: "1.5px solid var(--border)", borderRadius: 11, padding: "12px 14px", background: "var(--surface)", color: "var(--text)", fontFamily: "inherit", fontSize: 14.5, outline: "none" }}
        />
        <button type="button" disabled={!value.trim() || busy} onClick={submit} style={{ border: 0, borderRadius: 11, padding: "11px 18px", background: OG, color: "#fff", fontFamily: "inherit", fontWeight: 850, cursor: value.trim() && !busy ? "pointer" : "default", opacity: value.trim() && !busy ? 1 : 0.55 }}>{busy ? c.working : c.submit}</button>
      </div>
      <div style={{ display: "flex", gap: 7, overflowX: "auto", marginTop: 9 }}>
        {suggestions.map((example) => (
          <button key={example} type="button" onClick={() => setValue(example)} style={{ whiteSpace: "nowrap", border: "1px solid var(--border)", borderRadius: 999, padding: "6px 9px", background: "var(--surface)", color: "var(--muted)", fontFamily: "inherit", fontSize: 10.5, cursor: "pointer" }}>{example}</button>
        ))}
      </div>
    </section>
  );
}
