import { AlertCircle, Check, Circle, HelpCircle } from "lucide-react";
import { useId } from "react";

export type TruthTrailStatus = "verified" | "review" | "missing" | "optional";

export type TruthTrailStep = {
  id: string;
  label: string;
  detail: string;
  status: TruthTrailStatus;
  onSelect?: () => void;
};

const statusCopy: Record<TruthTrailStatus, string> = {
  verified: "Verified",
  review: "Review",
  missing: "Missing",
  optional: "Optional",
};

const statusIcon = {
  verified: Check,
  review: AlertCircle,
  missing: HelpCircle,
  optional: Circle,
};

export function TruthTrail({
  steps,
  title = "Truth Trail",
}: {
  steps: TruthTrailStep[];
  title?: string;
}) {
  const titleId = useId();
  return (
    <section className="truth-trail" aria-labelledby={titleId}>
      <style>{`
      .truth-trail{background:var(--surface);border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow);padding:18px;overflow:hidden}
      .truth-trail-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:16px}.truth-trail-head h2{margin:0;color:var(--text);font-size:14px;font-weight:750;letter-spacing:-.018em}.truth-trail-head p{margin:0;color:var(--muted);font-size:10.5px;line-height:1.45}
      .truth-trail-list{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));list-style:none;margin:0;padding:0}.truth-trail-step{position:relative;min-width:0}.truth-trail-step:not(:last-child):after{content:"";position:absolute;top:15px;inset-inline-start:calc(50% + 18px);inset-inline-end:calc(-50% + 18px);height:1px;background:var(--border)}
      .truth-trail-item{position:relative;z-index:1;display:grid;grid-template-rows:32px auto auto auto;justify-items:center;width:100%;min-height:104px;padding:0 6px;border:0;background:transparent;color:var(--text);font-family:inherit;text-align:center}.truth-trail-item[data-action="true"]{cursor:pointer}.truth-trail-item[data-action="true"]:hover .truth-trail-node{transform:translateY(-1px);box-shadow:0 7px 15px -9px rgba(15,31,61,.7)}
      .truth-trail-node{width:32px;height:32px;display:grid;place-items:center;border:1px solid var(--border);border-radius:999px;background:var(--surface);transition:transform .15s var(--ease),box-shadow .15s var(--ease)}.truth-trail-item[data-status="verified"] .truth-trail-node{background:#EAF8F3;border-color:#B9E6D6;color:#087F5B}.truth-trail-item[data-status="review"] .truth-trail-node{background:#FFF7E8;border-color:#F1D49D;color:#A66508}.truth-trail-item[data-status="missing"] .truth-trail-node{background:#FFF1EF;border-color:#F0C1BC;color:#B42318}.truth-trail-item[data-status="optional"] .truth-trail-node{background:var(--surface2);color:var(--muted)}
      .truth-trail-label{margin-top:8px;font-size:10.5px;font-weight:800;line-height:1.25}.truth-trail-state{margin-top:3px;font-size:9px;font-weight:750;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}.truth-trail-detail{margin-top:4px;color:var(--muted);font-size:9.5px;line-height:1.35;overflow-wrap:anywhere}.truth-trail-item[data-status="review"] .truth-trail-state{color:#A66508}.truth-trail-item[data-status="verified"] .truth-trail-state{color:#087F5B}.truth-trail-item[data-status="missing"] .truth-trail-state{color:#B42318}
      .truth-trail-item:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:8px}
      @media(max-width:900px){.truth-trail-list{grid-template-columns:repeat(4,minmax(0,1fr));row-gap:16px}.truth-trail-step:nth-child(4):after{display:none}}
      @media(max-width:620px){.truth-trail-head{display:block}.truth-trail-head p{margin-top:4px}.truth-trail-list{display:grid;grid-template-columns:1fr;gap:0}.truth-trail-step:not(:last-child):after{top:31px;bottom:-1px;inset-inline-start:15px;inset-inline-end:auto;width:1px;height:auto}.truth-trail-item{grid-template-columns:32px minmax(82px,.55fr) minmax(0,1fr);grid-template-rows:auto auto;column-gap:10px;min-height:66px;padding:0;text-align:start;justify-items:start;align-items:center}.truth-trail-node{grid-row:1 / 3}.truth-trail-label{margin:0}.truth-trail-state{margin:0}.truth-trail-detail{grid-column:2 / 4;margin:0;align-self:start}.truth-trail-step:nth-child(4):after{display:block}}
      @media(prefers-reduced-motion:reduce){.truth-trail *{transition-duration:.01ms!important}}
    `}</style>
      <div className="truth-trail-head">
        <h2 id={titleId}>{title}</h2>
        <p>Order truth stays separate from terms, payout evidence, and receipt confirmation.</p>
      </div>
      <ol className="truth-trail-list">
        {steps.map((step) => {
          const Icon = statusIcon[step.status];
          const content = (
            <>
              <span className="truth-trail-node">
                <Icon size={14} aria-hidden="true" />
              </span>
              <span className="truth-trail-label">{step.label}</span>
              <span className="truth-trail-state">{statusCopy[step.status]}</span>
              <span className="truth-trail-detail">{step.detail}</span>
            </>
          );
          return (
            <li className="truth-trail-step" key={step.id}>
              {step.onSelect ? (
                <button
                  type="button"
                  className="truth-trail-item"
                  data-status={step.status}
                  data-action="true"
                  onClick={step.onSelect}
                  aria-label={`${step.label}: ${statusCopy[step.status]}. ${step.detail}`}
                >
                  {content}
                </button>
              ) : (
                <div className="truth-trail-item" data-status={step.status}>
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
