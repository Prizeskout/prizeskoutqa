import { useMemo, useRef, useState } from "react";
import { Check, CircleCheck, FileSpreadsheet, ListChecks, MessagesSquare, X } from "lucide-react";
import "./CostCaptureWorkspace.css";

export type CostCaptureProduct = {
  sku: string;
  name_en: string;
  current_price: number;
  currency: string;
  source_platform: string;
};

type Draft = Record<string, string>;

const normalized = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
const parseCsvRow = (line: string) => {
  const cells: string[] = [];
  let value = "", quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && quoted && line[index + 1] === '"') { value += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { cells.push(value.trim()); value = ""; }
    else value += char;
  }
  cells.push(value.trim());
  return cells;
};

export function CostCaptureWorkspace({ products, onClose, onSave, onAskAI }: {
  products: CostCaptureProduct[];
  onClose: () => void;
  onSave: (costs: Array<{ product: CostCaptureProduct; cost: number }>) => Promise<void>;
  onAskAI?: () => void;
}) {
  const [drafts, setDrafts] = useState<Draft>({});
  const [selected, setSelected] = useState(() => new Set(products.map(product => product.sku)));
  const [sharedCost, setSharedCost] = useState("");
  const [notice, setNotice] = useState("Choose the fastest way to add reliable cost evidence.");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const validRows = useMemo(() => products.flatMap(product => {
    const cost = Number(drafts[product.sku]);
    return Number.isFinite(cost) && cost >= 0 ? [{ product, cost }] : [];
  }), [drafts, products]);

  const ingestRows = (rows: unknown[][]) => {
    if (rows.length < 2) return setNotice("That file has no product rows to review.");
    const headers = rows[0].map(normalized);
    const skuIndex = headers.findIndex(header => ["sku", "productsku", "itemsku", "code"].includes(header));
    const costIndex = headers.findIndex(header => ["cost", "unitcost", "productcost", "basecost", "cogs"].includes(header));
    const nameIndex = headers.findIndex(header => ["product", "productname", "name", "item"].includes(header));
    if (costIndex < 0 || (skuIndex < 0 && nameIndex < 0)) {
      return setNotice("I could not identify the columns. Include SKU (or product name) and Cost.");
    }
    const next = { ...drafts };
    let matched = 0, ambiguous = 0;
    rows.slice(1).forEach(row => {
      const cost = Number(String(row[costIndex] ?? "").replace(/[^0-9.-]/g, ""));
      if (!Number.isFinite(cost) || cost < 0) return;
      const sku = skuIndex >= 0 ? normalized(row[skuIndex]) : "";
      const name = nameIndex >= 0 ? normalized(row[nameIndex]) : "";
      const matches = products.filter(product => (sku && normalized(product.sku) === sku) || (!sku && name && normalized(product.name_en) === name));
      if (matches.length === 1) { next[matches[0].sku] = String(cost); matched += 1; }
      else if (matches.length > 1) ambiguous += 1;
    });
    setDrafts(next);
    setNotice(`${matched} cost${matched === 1 ? "" : "s"} matched${ambiguous ? `; ${ambiguous} ambiguous row${ambiguous === 1 ? " needs" : "s need"} review` : " automatically"}. Nothing has been saved yet.`);
  };

  const upload = async (file?: File) => {
    if (!file) return;
    try {
      const rows = (await file.text()).split(/\r?\n/).filter(Boolean).map(parseCsvRow);
      ingestRows(rows as unknown[][]);
    } catch {
      setNotice("I could not read that file. Try a CSV with SKU and Cost columns.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const applyShared = () => {
    const value = Number(sharedCost);
    if (!Number.isFinite(value) || value < 0 || !selected.size) return setNotice("Select products and enter a valid shared unit cost.");
    setDrafts(current => ({ ...current, ...Object.fromEntries([...selected].map(sku => [sku, String(value)])) }));
    setNotice(`Shared cost prepared for ${selected.size} selected product${selected.size === 1 ? "" : "s"}. Review before saving.`);
  };

  const save = async () => {
    if (!validRows.length) return setNotice("Add at least one cost before saving.");
    setSaving(true);
    try { await onSave(validRows); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Costs could not be saved."); setSaving(false); }
  };

  return <div className="ps-cost-workspace-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="ps-cost-workspace" role="dialog" aria-modal="true" aria-labelledby="cost-workspace-title">
      <header>
        <div><span>Cost evidence</span><h2 id="cost-workspace-title">Complete product costs, your way</h2><p>Import a supplier sheet, apply one cost to a group, or review a planning suggestion. PrizeSkout keeps these costs internal.</p></div>
        <button type="button" className="ps-cost-close" onClick={onClose} aria-label="Close cost workspace"><X size={20} /></button>
      </header>
      <div className="ps-cost-methods">
        <button type="button" onClick={() => inputRef.current?.click()}><FileSpreadsheet size={20}/><b>Upload cost sheet</b><small>CSV · assisted column and SKU matching</small></button>
        <button type="button" onClick={onAskAI}><MessagesSquare size={20}/><b>Ask the AI cost assistant</b><small>Describe a supplier list or ask for help grouping similar products</small></button>
        <div className="ps-cost-shared"><ListChecks size={20}/><b>Apply a shared cost</b><small>Use one value for the selected products</small><div><input inputMode="decimal" value={sharedCost} onChange={e => setSharedCost(e.target.value)} placeholder={products[0]?.currency ?? "Cost"}/><button type="button" onClick={applyShared}>Apply</button></div></div>
        <input ref={inputRef} hidden type="file" accept=".csv,text/csv" onChange={event => void upload(event.target.files?.[0])}/>
      </div>
      <div className="ps-cost-notice"><CircleCheck size={16}/><span>{notice}</span></div>
      <div className="ps-cost-table-wrap"><table className="ps-cost-table">
        <thead><tr><th><input type="checkbox" checked={selected.size === products.length} onChange={event => setSelected(event.target.checked ? new Set(products.map(p => p.sku)) : new Set())} aria-label="Select all products"/></th><th>Product</th><th>Selling price</th><th>Planning range</th><th>Unit cost</th></tr></thead>
        <tbody>{products.map(product => {
          const currency = product.currency || "QAR";
          return <tr key={`${product.source_platform}:${product.sku}`}>
            <td><input type="checkbox" checked={selected.has(product.sku)} onChange={() => setSelected(current => { const next = new Set(current); next.has(product.sku) ? next.delete(product.sku) : next.add(product.sku); return next; })} aria-label={`Select ${product.name_en}`}/></td>
            <td><b>{product.name_en || product.sku}</b><small>{product.sku} · {product.source_platform}</small></td>
            <td>{currency} {product.current_price.toFixed(2)}</td>
            <td><div className="ps-cost-suggestions">{[.25,.35,.45].map(rate => <button type="button" key={rate} onClick={() => setDrafts(current => ({...current, [product.sku]: (product.current_price * rate).toFixed(2)}))}>{Math.round(rate * 100)}%</button>)}</div><small>of selling price · estimate only</small></td>
            <td><label><span>{currency}</span><input inputMode="decimal" value={drafts[product.sku] ?? ""} onChange={event => setDrafts(current => ({...current, [product.sku]: event.target.value}))} placeholder="0.00" aria-label={`Unit cost for ${product.name_en}`}/></label></td>
          </tr>;
        })}</tbody>
      </table></div>
      <footer><div><Check size={16}/><span><b>{validRows.length}</b> of {products.length} ready to confirm</span></div><div><button type="button" className="ps-cost-secondary" onClick={onClose}>Cancel</button><button type="button" className="ps-cost-primary" disabled={!validRows.length || saving} onClick={() => void save()}>{saving ? "Saving…" : `Confirm ${validRows.length} cost${validRows.length === 1 ? "" : "s"}`}</button></div></footer>
    </section>
  </div>;
}
