import { useMemo, useState } from "react";
import { Sparkles, X } from "lucide-react";
import type {
  DashboardV2PlatformDemoPayload,
  DashboardV2PlatformDemoScreen,
} from "@/server/core/dashboard-v2-platform-demo";
import "./platform-reference-demo.css";

export const platformReferenceChrome = {
  confidenceLabel: "98%",
  confidenceDetail: "Controlled demonstration records are complete across the supplied platform model.",
  confidenceMissing: "Packaging costs are not connected in the demonstration scenario.",
  priorityItems: [
    ["Talabat settlement discrepancy · 2 branches", "QAR 8,420", "Critical"],
    ["Al Sadd refund rate +2.8 pts", "QAR 4,850", "Critical"],
    ["Reprice 7 menu items on Talabat", "+QAR 6,300/mo", "Opportunity"],
    ["Reduce merchant share on Weekend 25% Off", "+QAR 7,200/mo", "Opportunity"],
    ["Snoonu unknown deduction QAR 590", "QAR 590", "Needs review"],
    ["Lunch Combo below 12% margin floor", "QAR 1,840", "Needs review"],
  ].map(([title, amount, state], index) => ({
    id: `DEMO-${index + 1}`,
    title,
    amount,
    state,
    detail: "Controlled demonstration record · review before any external action.",
  })),
};

type TablePanel = {
  id: string;
  type: "table";
  title: string;
  sub: string;
  col: string;
  cols: ReadonlyArray<readonly [string, string, string?, number?]>;
  rows: ReadonlyArray<ReadonlyArray<string>>;
  filter?: number;
  action?: string;
  foot?: string;
};
type BarsPanel = {
  id: string;
  type: "bars";
  title: string;
  sub: string;
  col: string;
  bars: ReadonlyArray<readonly [string, number, number, string, string, number?]>;
};
type FeedPanel = {
  id: string;
  type: "feed";
  title: string;
  sub: string;
  col: string;
  feed: ReadonlyArray<readonly [string, string, string, string, number?]>;
};
type TogglePanel = {
  id: string;
  type: "toggles";
  title: string;
  sub: string;
  col: string;
  toggles: ReadonlyArray<readonly [string, string, number, string]>;
};
type DemoPanel = TablePanel | BarsPanel | FeedPanel | TogglePanel;
type ScreenData = {
  kicker: string;
  title: string;
  sub: string;
  cta: string;
  q: string;
  kpis: ReadonlyArray<readonly [string, string, string, string]>;
  panels: ReadonlyArray<DemoPanel>;
};

const POSITIVE = new Set([
  "Matched", "Connected", "Healthy", "Active", "Resolved", "Star", "Approved",
  "Success", "Live", "Delivered", "On", "Done", "Accepted", "Sent", "✓", "Opportunity",
]);
const NEGATIVE = new Set([
  "Action required", "Critical", "Loss maker", "Failed", "Margin trap", "Blocked",
  "Attention", "Revoked", "Loss",
]);
const WARNING = new Set([
  "Under review", "Pilot", "Needs review", "Pending", "Volume driver", "Paused",
  "Invited", "Degraded", "Watch", "Held", "Awaiting approval", "Scheduled",
]);
const BRAND = new Set(["Pricing opportunity", "Planned", "Recommended", "Info"]);

function tone(value: string) {
  if (POSITIVE.has(value)) return "positive";
  if (NEGATIVE.has(value)) return "negative";
  if (WARNING.has(value)) return "warning";
  if (BRAND.has(value)) return "brand";
  return "neutral";
}

function sortable(value: string) {
  const match = value.replaceAll(",", "").replace("−", "-").match(/-?\d+(\.\d+)?/);
  if (!match) return value.toLowerCase();
  let number = Number(match[0]);
  if (/K\b/.test(value)) number *= 1_000;
  if (/M\b/.test(value)) number *= 1_000_000;
  return number;
}

function Table({
  panel,
  onPreview,
}: {
  panel: TablePanel;
  onPreview: (message: string) => void;
}) {
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState<{ column: number; direction: 1 | -1 } | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const options = panel.filter == null
    ? []
    : ["All", ...new Set(panel.rows.map((row) => row[panel.filter!] ?? "—"))];
  const rows = useMemo(() => {
    const visible = panel.rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => filter === "All" || panel.filter == null || row[panel.filter] === filter);
    if (!sort) return visible;
    return [...visible].sort((a, b) => {
      const left = sortable(a.row[sort.column] ?? "");
      const right = sortable(b.row[sort.column] ?? "");
      return sort.direction * (
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right))
      );
    });
  }, [filter, panel.filter, panel.rows, sort]);
  const template = panel.cols.map((column) => `minmax(0,${column[1]})`).join(" ");
  const selectedRow = selected == null ? null : panel.rows[selected];

  return (
    <>
      {options.length > 0 && (
        <div className="ps-platform-filters" aria-label={`${panel.title} filters`}>
          {options.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={filter === option}
              onClick={() => setFilter(option)}
            >
              {option}
            </button>
          ))}
        </div>
      )}
      <div className="ps-platform-table-scroll">
        <div
          className="ps-platform-table-row ps-platform-table-head"
          style={{ gridTemplateColumns: template, minWidth: panel.cols.length > 7 ? 1080 : undefined }}
        >
          {panel.cols.map((column, columnIndex) => (
            <button
              key={column[0]}
              type="button"
              style={{ textAlign: (column[2] || "left") as "left" | "right" | "center" }}
              onClick={() =>
                setSort((current) => ({
                  column: columnIndex,
                  direction:
                    current?.column === columnIndex && current.direction === -1 ? 1 : -1,
                }))
              }
            >
              {column[0]}
              {sort?.column === columnIndex ? (sort.direction === 1 ? " ↑" : " ↓") : ""}
            </button>
          ))}
        </div>
        {rows.map(({ row, index }) => (
          <button
            key={`${panel.id}-${index}`}
            type="button"
            className="ps-platform-table-row ps-platform-data-row"
            style={{ gridTemplateColumns: template, minWidth: panel.cols.length > 7 ? 1080 : undefined }}
            onClick={() => setSelected(index)}
          >
            {row.map((value, columnIndex) => {
              const column = panel.cols[columnIndex];
              const pill = Boolean(column?.[3]);
              return (
                <span
                  key={`${value}-${columnIndex}`}
                  style={{ textAlign: (column?.[2] || "left") as "left" | "right" | "center" }}
                  data-pill={pill || undefined}
                  data-tone={pill ? tone(value) : undefined}
                >
                  {value}
                </span>
              );
            })}
          </button>
        ))}
      </div>
      <footer className="ps-platform-panel-foot">
        <span>{panel.foot ?? `${rows.length} rows`}</span>
        {panel.action && (
          <button type="button" onClick={() => onPreview(panel.action!)}>
            {panel.action}
          </button>
        )}
      </footer>
      {selectedRow && (
        <>
          <button
            type="button"
            className="ps-platform-drawer-scrim"
            aria-label="Close details"
            onClick={() => setSelected(null)}
          />
          <aside
            className="ps-platform-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ps-platform-drawer-title"
          >
            <header>
              <div>
                <small>{panel.title}</small>
                <strong id="ps-platform-drawer-title">{selectedRow[0]}</strong>
              </div>
              <button type="button" aria-label="Close details" onClick={() => setSelected(null)}>
                <X size={17} />
              </button>
            </header>
            <div className="ps-platform-drawer-body">
              {panel.cols.slice(1).map((column, index) => (
                <div key={column[0]}>
                  <span>{column[0]}</span>
                  <strong>{selectedRow[index + 1]}</strong>
                </div>
              ))}
              <p><i /> Controlled demonstration record · retained only for this demo workspace</p>
            </div>
            <footer>
              <a href={`/dashboard/ai-copilot?q=${encodeURIComponent(selectedRow[0])}`}>
                Ask Copilot
              </a>
              <button type="button" onClick={() => onPreview(panel.action ?? "Create action")}>
                {panel.action ?? "Create action"}
              </button>
            </footer>
          </aside>
        </>
      )}
    </>
  );
}

function Panel({
  panel,
  onPreview,
}: {
  panel: DemoPanel;
  onPreview: (message: string) => void;
}) {
  const [toggles, setToggles] = useState<Record<number, boolean>>({});
  return (
    <section className="ps-platform-panel" style={{ gridColumn: panel.col }}>
      <header>
        <div>
          <h2>{panel.title}</h2>
          <p>{panel.sub}</p>
        </div>
      </header>
      {panel.type === "table" && <Table panel={panel} onPreview={onPreview} />}
      {panel.type === "bars" && (
        <div className="ps-platform-bars">
          {panel.bars.map(([label, offset, width, color, value, weight]) => (
            <div key={label}>
              <span style={{ fontWeight: weight ?? 400 }}>{label}</span>
              <i><b style={{ left: `${offset}%`, width: `${width}%`, background: color }} /></i>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      )}
      {panel.type === "feed" && (
        <div className="ps-platform-feed">
          {panel.feed.map(([time, title, detail, tag, live], index) => (
            <article key={`${time}-${index}`}>
              <time>{time}</time>
              <i data-live={Boolean(live)} data-tone={tone(tag)} />
              <div><strong>{title}</strong><p>{detail}</p></div>
              <span data-tone={tone(tag)}>{tag}</span>
            </article>
          ))}
        </div>
      )}
      {panel.type === "toggles" && (
        <div className="ps-platform-toggles">
          {panel.toggles.map(([title, detail, defaultOn, mode], index) => {
            const on = toggles[index] ?? Boolean(defaultOn);
            return (
              <button
                key={title}
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => {
                  setToggles((current) => ({ ...current, [index]: !on }));
                  onPreview(`${title} · ${on ? "disabled" : "enabled"}`);
                }}
              >
                <div><strong>{title}</strong><span>{detail}</span></div>
                <em>{on ? mode : "Off"}</em>
                <i data-on={on}><b /></i>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function PlatformReferenceDemo({
  screen,
  data,
}: {
  screen: DashboardV2PlatformDemoScreen;
  data: DashboardV2PlatformDemoPayload;
}) {
  const config = data[screen] as unknown as ScreenData;
  const [toast, setToast] = useState("");
  function preview(message: string) {
    setToast(`${message} · preview only — no live change sent`);
    window.setTimeout(() => setToast(""), 2800);
  }
  return (
    <div className="ps-platform-demo" data-screen={screen}>
      <div className="ps-platform-heading">
        <div>
          <p>{config.kicker}</p>
          <h1>{config.title} <span>{config.sub}</span></h1>
        </div>
        <div>
          <a href={`/dashboard/ai-copilot?q=${encodeURIComponent(config.q)}`}>
            <Sparkles size={13} aria-hidden="true" /> Ask Copilot
          </a>
          <button type="button" onClick={() => preview(config.cta)}>{config.cta}</button>
        </div>
      </div>
      <section className="ps-platform-kpis" aria-label={`${config.kicker} summary`}>
        {config.kpis.map(([label, value, detail, valueTone]) => (
          <article key={label} data-tone={valueTone || "neutral"}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
          </article>
        ))}
      </section>
      <div className="ps-platform-panels">
        {config.panels.map((panel) => (
          <Panel key={panel.id} panel={panel} onPreview={preview} />
        ))}
      </div>
      <div className="ps-platform-toast" role="status" data-open={Boolean(toast)}>{toast}</div>
    </div>
  );
}
