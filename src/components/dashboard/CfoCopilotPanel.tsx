import { useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";
import type { CfoInsight } from "@/lib/cfo-insight";

type CfoMessage = {
  role: "user" | "assistant";
  text: string;
  messageType?: "text" | "task" | "approval" | "execution" | "evidence" | "error";
  metadata?: Record<string, unknown>;
};

const OG = "#EF681A";
const confidenceTone: Record<CfoInsight["confidence"], { color: string; background: string }> = {
  high: { color: "#047857", background: "color-mix(in srgb,#10B981 10%,var(--surface))" },
  medium: { color: "#A16207", background: "color-mix(in srgb,#F59E0B 10%,var(--surface))" },
  low: { color: "#B45309", background: "color-mix(in srgb,#F97316 9%,var(--surface))" },
  insufficient: { color: "#B91C1C", background: "color-mix(in srgb,#DC2626 8%,var(--surface))" },
};

function isCfoInsight(value: unknown): value is CfoInsight {
  return Boolean(
    value && typeof value === "object" && typeof (value as CfoInsight).conclusion === "string",
  );
}

function InsightCard({
  insight,
  onSubmit,
}: {
  insight: CfoInsight;
  onSubmit: (prompt: string) => void;
}) {
  const tone = confidenceTone[insight.confidence];
  return (
    <article
      style={{
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
        background: "var(--surface)",
        width: "min(100%,780px)",
      }}
    >
      <div style={{ padding: "13px 14px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <strong
            style={{ fontSize: 11, color: OG, textTransform: "uppercase", letterSpacing: ".06em" }}
          >
            CFO conclusion
          </strong>
          <span
            style={{
              borderRadius: 999,
              padding: "4px 8px",
              color: tone.color,
              background: tone.background,
              fontSize: 10.5,
              fontWeight: 850,
              textTransform: "uppercase",
            }}
          >
            {insight.confidence} confidence
          </span>
        </div>
        <p
          style={{
            margin: "9px 0 0",
            color: "var(--text)",
            fontSize: 14,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
          }}
        >
          {insight.conclusion}
        </p>
        {insight.impact.amount != null && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 11px",
              borderRadius: 9,
              background: "var(--surface2)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                color: "var(--muted)",
                fontSize: 10.5,
                textTransform: "uppercase",
                letterSpacing: ".05em",
              }}
            >
              {insight.impact.label}
            </div>
            <strong
              style={{
                display: "block",
                marginTop: 3,
                fontSize: 20,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {insight.impact.currency ? `${insight.impact.currency} ` : ""}
              {insight.impact.amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}
            </strong>
          </div>
        )}
        {insight.drivers.length > 0 && (
          <div style={{ display: "grid", gap: 7, marginTop: 12 }}>
            <strong style={{ fontSize: 11.5 }}>What drove it</strong>
            {insight.drivers.map((driver, index) => (
              <div
                key={`${driver.label}-${index}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "start",
                  padding: "8px 10px",
                  borderRadius: 9,
                  background: "var(--surface2)",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: "var(--text)" }}>{driver.label}</div>
                  {driver.evidence_refs.length > 0 && (
                    <div
                      style={{
                        marginTop: 2,
                        color: "var(--muted)",
                        fontSize: 10.5,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {driver.evidence_refs.join(" · ")}
                    </div>
                  )}
                </div>
                <span
                  style={{
                    flex: "0 0 auto",
                    color:
                      driver.direction === "negative"
                        ? "#B91C1C"
                        : driver.direction === "positive"
                          ? "#047857"
                          : "var(--muted)",
                    fontSize: 11.5,
                    fontWeight: 800,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {driver.amount != null
                    ? driver.amount.toLocaleString("en-US", { maximumFractionDigits: 2 })
                    : driver.direction}
                </span>
              </div>
            ))}
          </div>
        )}
        {insight.limitations.length > 0 && (
          <div
            style={{
              marginTop: 12,
              borderInlineStart: "3px solid #F59E0B",
              padding: "7px 10px",
              background: "color-mix(in srgb,#F59E0B 6%,var(--surface))",
              color: "var(--muted)",
              fontSize: 11.5,
              lineHeight: 1.5,
            }}
          >
            <strong style={{ display: "block", color: "var(--text)", marginBottom: 3 }}>
              What is still unknown
            </strong>
            {insight.limitations.join(" · ")}
          </div>
        )}
        {insight.evidence_used.length > 0 && (
          <details style={{ marginTop: 11 }}>
            <summary
              style={{ color: "var(--muted)", fontSize: 11.5, fontWeight: 750, cursor: "pointer" }}
            >
              Evidence used ({insight.evidence_used.length})
            </summary>
            <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
              {insight.evidence_used.map((evidence, index) => (
                <div
                  key={`${evidence.source}-${index}`}
                  style={{
                    padding: "7px 9px",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                >
                  <strong>{evidence.label}</strong>
                  <div style={{ marginTop: 2, color: "var(--muted)" }}>
                    {[evidence.source, evidence.period, evidence.freshness]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
      {insight.actions.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 7,
            flexWrap: "wrap",
            padding: "10px 12px",
            borderTop: "1px solid var(--border)",
            background: "var(--surface2)",
          }}
        >
          {insight.actions.map((action) => (
            <button
              key={`${action.label}-${action.prompt}`}
              type="button"
              onClick={() => onSubmit(action.prompt)}
              style={{
                minHeight: 36,
                border: action.kind === "ask" ? `1px solid ${OG}` : "1px solid var(--border)",
                borderRadius: 9,
                padding: "7px 10px",
                background: "var(--surface)",
                color: action.kind === "ask" ? OG : "var(--text)",
                fontFamily: "inherit",
                fontSize: 11.5,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

export function CfoCopilotPanel({
  messages,
  value,
  onChange,
  onSubmit,
  onNewChat,
  onSwitchToManager,
  documents,
  onDocumentsChange,
  saved,
  busy,
  error,
}: {
  messages: CfoMessage[];
  value: string;
  onChange: (value: string) => void;
  onSubmit: (prompt: string) => void;
  onNewChat: () => void;
  onSwitchToManager: () => void;
  documents: File[];
  onDocumentsChange: (files: File[]) => void;
  saved: boolean;
  busy: boolean;
  error?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const visibleMessages = expanded ? messages : messages.slice(-6);
  const suggestions = messages.length
    ? [
        "What changed compared with the previous 30 days?",
        "Which evidence supports that conclusion?",
        "What should I review next?",
      ]
    : [
        "What did I actually keep from orders this month?",
        "Which channel needs financial attention?",
        "What evidence is missing for a reliable forecast?",
      ];

  useEffect(() => {
    const transcript = transcriptRef.current;
    if (!transcript) return;
    const entries = transcript.querySelectorAll<HTMLElement>("[data-cfo-message]");
    const newest = entries.item(entries.length - 1);
    if (newest) transcript.scrollTop = Math.max(0, newest.offsetTop - transcript.offsetTop - 8);
  }, [busy, expanded, messages.length]);

  const submit = (prompt = value) => {
    const next = prompt.trim();
    if (!next || busy) return;
    onSubmit(next);
    onChange("");
    window.requestAnimationFrame(() => composerRef.current?.focus());
  };

  return (
    <section
      className="ps-cfo-chat-panel"
      data-tour="copilot"
      aria-label="CFO Copilot conversation"
      style={{ display: "grid", gap: 11 }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: 14 }}>Ask about your business</h3>
          <p style={{ margin: "3px 0 0", color: "var(--muted)", fontSize: 11.5 }}>
            Evidence-backed answers about profit, payouts, fees, trends, and risk
          </p>
          <div
            style={{
              marginTop: 5,
              color: saved ? "#047857" : "var(--muted)",
              fontSize: 10,
              fontWeight: 850,
              textTransform: "uppercase",
            }}
          >
            {saved ? "Saved conversation" : "This session"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={onNewChat}
              disabled={busy}
              style={{
                minHeight: 36,
                border: 0,
                padding: "7px 4px",
                background: "transparent",
                color: "var(--muted)",
                fontFamily: "inherit",
                fontSize: 11.5,
                fontWeight: 750,
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              New chat
            </button>
          )}
          <button
            type="button"
            onClick={onSwitchToManager}
            style={{
              minHeight: 36,
              border: "1px solid var(--border)",
              borderRadius: 9,
              padding: "7px 10px",
              background: "var(--surface)",
              color: "var(--text)",
              fontFamily: "inherit",
              fontSize: 11.5,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Store Manager →
          </button>
        </div>
      </header>

      {(messages.length > 0 || busy || error) && (
        <div
          ref={transcriptRef}
          role="log"
          aria-label="CFO conversation history"
          aria-live="polite"
          aria-relevant="additions text"
          style={{
            maxHeight: expanded ? 520 : 360,
            overflowY: "auto",
            overscrollBehavior: "contain",
            display: "grid",
            gap: 9,
            padding: 12,
            border: "1px solid var(--border)",
            borderRadius: 12,
            background: "color-mix(in srgb,var(--surface2) 64%,var(--surface))",
          }}
        >
          {!expanded && messages.length > visibleMessages.length && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              style={{
                justifySelf: "center",
                border: 0,
                background: "transparent",
                color: "var(--muted)",
                fontFamily: "inherit",
                fontSize: 11.5,
                fontWeight: 750,
                cursor: "pointer",
              }}
            >
              Show earlier messages
            </button>
          )}
          {visibleMessages.map((message, index) => {
            const insight = isCfoInsight(message.metadata?.insight)
              ? message.metadata.insight
              : null;
            return (
              <div
                data-cfo-message
                key={`${message.role}-${messages.length - visibleMessages.length + index}-${message.text.slice(0, 20)}`}
                style={{
                  justifySelf: message.role === "user" ? "end" : "start",
                  maxWidth: message.role === "user" ? "min(82%,680px)" : "min(96%,800px)",
                }}
              >
                {message.role === "assistant" && insight ? (
                  <InsightCard insight={insight} onSubmit={submit} />
                ) : (
                  <div
                    style={{
                      borderRadius:
                        message.role === "user" ? "12px 12px 3px 12px" : "3px 12px 12px 12px",
                      padding: "9px 12px",
                      background:
                        message.role === "user"
                          ? "var(--navy)"
                          : message.messageType === "error"
                            ? "color-mix(in srgb,#DC2626 8%,var(--surface))"
                            : "var(--surface)",
                      border: message.role === "assistant" ? "1px solid var(--border)" : "none",
                      color:
                        message.role === "user"
                          ? "#fff"
                          : message.messageType === "error"
                            ? "#B91C1C"
                            : "var(--text)",
                      fontSize: 13,
                      lineHeight: 1.55,
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {message.text}
                  </div>
                )}
              </div>
            );
          })}
          {busy && (
            <div
              role="status"
              style={{
                justifySelf: "start",
                display: "flex",
                alignItems: "center",
                gap: 8,
                border: "1px solid var(--border)",
                borderRadius: "3px 12px 12px 12px",
                padding: "10px 12px",
                background: "var(--surface)",
                color: "var(--muted)",
                fontSize: 12.5,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: OG,
                  animation: "pk-pulse 1.2s ease-in-out infinite",
                }}
              />
              Reviewing retained financial evidence…
            </div>
          )}
          {error && (
            <div
              role="alert"
              style={{
                justifySelf: "start",
                maxWidth: "min(96%,800px)",
                border: "1px solid color-mix(in srgb,#DC2626 28%,var(--border))",
                borderRadius: "3px 12px 12px 12px",
                padding: "10px 12px",
                background: "color-mix(in srgb,#DC2626 8%,var(--surface))",
                color: "#B91C1C",
                fontSize: 12.5,
              }}
            >
              {error}
            </div>
          )}
          {messages.length > 4 && (
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded((current) => !current)}
              style={{
                justifySelf: "center",
                border: 0,
                background: "transparent",
                color: "var(--muted)",
                fontFamily: "inherit",
                fontSize: 11.5,
                fontWeight: 750,
                cursor: "pointer",
              }}
            >
              {expanded ? "Compact conversation" : "Expand conversation"}
            </button>
          )}
        </div>
      )}

      {documents.length > 0 && (
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {documents.map((file) => (
            <div
              key={`${file.name}-${file.lastModified}`}
              style={{
                display: "flex",
                gap: 7,
                alignItems: "center",
                border: "1px solid var(--border)",
                borderRadius: 9,
                padding: "7px 9px",
                background: "var(--surface2)",
                fontSize: 11,
              }}
            >
              <FileText size={14} aria-hidden="true" />
              <span>{file.name}</span>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() => onDocumentsChange(documents.filter((item) => item !== file))}
                style={{
                  border: 0,
                  background: "transparent",
                  color: "#B91C1C",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "flex-end",
          flexWrap: "wrap",
          padding: 7,
          border: `1.5px solid color-mix(in srgb,${OG} 30%,var(--border))`,
          borderRadius: 12,
          background: "var(--surface)",
        }}
      >
        <button
          type="button"
          aria-label="Attach financial evidence"
          title="Attach payout statement, order report, or cost file"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          style={{
            flex: "0 0 auto",
            minWidth: 42,
            height: 42,
            display: "grid",
            placeItems: "center",
            border: "1px solid var(--border)",
            borderRadius: 9,
            background: "var(--surface2)",
            color: "var(--text)",
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          <FileText size={17} aria-hidden="true" />
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".csv,.xlsx,.xls,.pdf,text/csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          disabled={busy}
          onChange={(event) => {
            onDocumentsChange(Array.from(event.target.files ?? []).slice(0, 12));
            event.target.value = "";
          }}
          style={{ display: "none" }}
        />
        <textarea
          ref={composerRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          rows={2}
          disabled={busy}
          placeholder="Ask a financial question…"
          aria-label="Ask CFO Copilot"
          style={{
            flex: "1 1 280px",
            minWidth: 0,
            minHeight: 42,
            maxHeight: 120,
            resize: "vertical",
            border: 0,
            outline: 0,
            padding: "9px 10px",
            background: "transparent",
            color: "var(--text)",
            fontFamily: "inherit",
            fontSize: 14,
            lineHeight: 1.45,
          }}
        />
        <button
          type="button"
          onClick={() => submit()}
          disabled={busy || !value.trim()}
          style={{
            minHeight: 42,
            border: 0,
            borderRadius: 9,
            padding: "10px 16px",
            background: OG,
            color: "#fff",
            fontFamily: "inherit",
            fontWeight: 850,
            cursor: busy || !value.trim() ? "not-allowed" : "pointer",
            opacity: busy || !value.trim() ? 0.5 : 1,
          }}
        >
          {busy ? "Working…" : "Send"}
        </button>
      </div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            disabled={busy}
            onClick={() => submit(suggestion)}
            style={{
              minHeight: 34,
              border: "1px solid var(--border)",
              borderRadius: 999,
              padding: "6px 10px",
              background: "var(--surface)",
              color: "var(--muted)",
              fontFamily: "inherit",
              fontSize: 10.5,
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.55 : 1,
            }}
          >
            {suggestion}
          </button>
        ))}
      </div>
      <div style={{ color: "var(--muted)", fontSize: 10.5 }}>
        Enter sends · Shift + Enter adds a line · Attach CSV, Excel, or PDF evidence
      </div>
    </section>
  );
}
