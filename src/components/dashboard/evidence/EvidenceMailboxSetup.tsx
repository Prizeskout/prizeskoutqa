import { useState } from "react";
import { Check, Clipboard, Inbox, Loader2, Mail, ShieldCheck } from "lucide-react";
import { friendlyClientMessage } from "@/lib/api-error";

type Mailbox = {
  address: string;
  status: string;
  created_at: string;
  options: Array<{ id: string; status: string; address?: string; explanation: string }>;
};

const credentials = () => ({
  merchant_id: localStorage.getItem("ps_merchant_id") ?? "",
  access_code: localStorage.getItem("ps_access_code") ?? "",
});

export function EvidenceMailboxSetup() {
  const [mailbox, setMailbox] = useState<Mailbox | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function prepareMailbox() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const auth = credentials();
      const response = await fetch("/api/evidence/mailbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(auth),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Private forwarding could not be prepared.");
      setMailbox(body as Mailbox);
    } catch (reason) {
      setError(friendlyClientMessage(reason, "Private forwarding could not be prepared."));
    } finally {
      setBusy(false);
    }
  }

  async function copyAddress() {
    if (!mailbox?.address) return;
    await navigator.clipboard.writeText(mailbox.address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="ps-v2-card ps-v2-module-card ps-evidence-mailbox" aria-labelledby="evidence-mailbox-title">
      <header>
        <div>
          <h2 id="evidence-mailbox-title"><Mail size={17} /> Private evidence forwarding</h2>
          <p>Collect payout statements, order exports, contracts, and promotion confirmations from the business inbox you already control.</p>
        </div>
        <span className="ps-v2-readonly"><ShieldCheck size={13} /> Merchant controlled</span>
      </header>

      {!mailbox ? (
        <div className="ps-evidence-mailbox-intro">
          <div>
            <strong>Your address is created only when you choose this setup.</strong>
            <p>Forward individual messages or create a rule in your current mailbox. PrizeSkout retains the original privately before processing it.</p>
          </div>
          <button className="ps-v2-action" type="button" disabled={busy} onClick={() => void prepareMailbox()}>
            {busy ? <Loader2 className="ps-v2-spin" size={14} /> : <Inbox size={14} />}
            {busy ? "Preparing…" : "Show or create private address"}
          </button>
        </div>
      ) : (
        <div className="ps-evidence-mailbox-ready">
          <div className="ps-evidence-mailbox-address">
            <span>PRIVATE FORWARDING ADDRESS</span>
            <strong>{mailbox.address}</strong>
            <small>Status: {mailbox.status}</small>
          </div>
          <button className="ps-v2-action" type="button" onClick={() => void copyAddress()}>
            {copied ? <Check size={14} /> : <Clipboard size={14} />}
            {copied ? "Copied" : "Copy address"}
          </button>
          <div className="ps-evidence-mailbox-options">
            {mailbox.options.map((option) => (
              <article key={option.id}>
                <strong>{option.id === "connected_mailbox" ? "Connected mailbox" : option.id === "automatic_forwarding_rule" ? "Automatic forwarding rule" : "Direct forwarding"}</strong>
                <p>{option.explanation}</p>
                <span data-ready={option.status === "ready"}>{option.status === "ready" ? "Ready" : "Not configured"}</span>
              </article>
            ))}
          </div>
        </div>
      )}
      {error && <p className="ps-v2-form-error" role="alert">{error}</p>}
    </section>
  );
}
