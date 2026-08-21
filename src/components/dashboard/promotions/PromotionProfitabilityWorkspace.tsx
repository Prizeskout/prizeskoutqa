import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FlaskConical, Save, ShieldCheck } from "lucide-react";
import {
  reconcilePromotionFunding,
  simulatePromotion,
  validatePromotionInputs,
  type PromotionProduct,
  type PromotionInputs,
} from "@/lib/promotion-profitability";
import type { ContractTerm } from "@/components/dashboard/payout/ContractIntelligenceVault";
import type { SavedPromotionScenario } from "@/server/core/promotion-scenarios";
import { MerchantField } from "@/components/ui/MerchantField";

const input = {
  width: "100%",
  boxSizing: "border-box" as const,
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "9px 10px",
  background: "var(--surface)",
  color: "var(--text)",
  fontFamily: "inherit",
};
const money = (n: number, currency: string) =>
  `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const n = (value: string, fallback = 0) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;

export function PromotionProfitabilityWorkspace({
  products,
  contract,
  currency,
}: {
  products: PromotionProduct[];
  contract: ContractTerm | null;
  currency: string;
}) {
  const [name, setName] = useState("Proposed marketplace campaign");
  const [discount, setDiscount] = useState("20");
  const [platformFunding, setPlatformFunding] = useState("");
  const [commission, setCommission] = useState("");
  const [vatOnFees, setVatOnFees] = useState("");
  const [paymentFee, setPaymentFee] = useState("");
  const [fixedOrderFee, setFixedOrderFee] = useState("");
  const [commissionBase, setCommissionBase] = useState<
    "gross_before_discount" | "net_after_discount" | "eligible_sales" | "unknown"
  >("unknown");
  const [lift, setLift] = useState("25");
  const [orders, setOrders] = useState("100");
  const [days, setDays] = useState("7");
  const [floor, setFloor] = useState("15");
  const [selected, setSelected] = useState<string[]>([]);
  const [saved, setSaved] = useState<SavedPromotionScenario[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fundingDrafts, setFundingDrafts] = useState<
    Record<string, { promised: string; actual: string }>
  >({});
  const [targetChannels, setTargetChannels] = useState<string[]>([
    products[0]?.source_platform ?? "zid",
  ]);
  const [financeReviewer, setFinanceReviewer] = useState("");
  const [operationsReviewer, setOperationsReviewer] = useState("");
  const [launchReferences, setLaunchReferences] = useState<Record<string, string>>({});
  const [simulationRequest, setSimulationRequest] = useState<{ inputs: PromotionInputs; selected: string[]; signature: string; calculatedAt: string } | null>(null);

  useEffect(() => setSelected(products.map((p) => p.sku)), [products]);
  useEffect(() => {
    if (!contract) return;
    if (contract.promotion_funding_platform_pct != null)
      setPlatformFunding(String(contract.promotion_funding_platform_pct));
    if (contract.commission_rate_pct != null) setCommission(String(contract.commission_rate_pct));
    if (contract.vat_on_fees_pct != null) setVatOnFees(String(contract.vat_on_fees_pct));
    if (contract.payment_fee_pct != null) setPaymentFee(String(contract.payment_fee_pct));
    if (contract.fixed_order_fee != null) setFixedOrderFee(String(contract.fixed_order_fee));
    setCommissionBase(contract.commission_base ?? "unknown");
  }, [contract]);

  const call = async (payload: Record<string, unknown>) => {
    const response = await fetch("/api/channels/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: localStorage.getItem("ps_merchant_id") ?? "",
        access_code: localStorage.getItem("ps_access_code") ?? "",
        platform: "promotion_scenarios",
        ...payload,
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error ?? "Promotion request failed.");
    return data;
  };
  const load = () =>
    call({ action: "list" })
      .then((data) => setSaved(data.scenarios ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load campaigns."));
  useEffect(() => {
    load();
  }, []);

  const inputs = useMemo(
    () => ({
      discount_pct: n(discount),
      platform_funding_pct: n(platformFunding),
      commission_pct: n(commission),
      vat_on_fees_pct: n(vatOnFees),
      payment_fee_pct: n(paymentFee),
      fixed_order_fee: n(fixedOrderFee),
      commission_base: commissionBase,
      expected_conversion_lift_pct: n(lift),
      baseline_orders: n(orders),
      duration_days: n(days),
      minimum_margin_pct: n(floor),
    }),
    [
      discount,
      platformFunding,
      commission,
      vatOnFees,
      paymentFee,
      fixedOrderFee,
      commissionBase,
      lift,
      orders,
      days,
      floor,
    ],
  );
  const inputSignature = JSON.stringify({ inputs, selected, targetChannels });
  const validationErrors = useMemo(() => validatePromotionInputs(inputs), [inputs]);
  const simulationStale = Boolean(simulationRequest && simulationRequest.signature !== inputSignature);
  const simulatedProducts = useMemo(() => products.filter(product => (simulationRequest?.selected ?? []).includes(product.sku)), [products, simulationRequest]);
  const simulatedInputs = simulationRequest?.inputs ?? inputs;
  const result = useMemo(() => simulatePromotion(simulatedProducts, simulatedInputs), [simulatedProducts, simulatedInputs]);
  const sensitivity = useMemo(
    () =>
      [
        { label: "Downside", lift: Math.max(-100, simulatedInputs.expected_conversion_lift_pct - 15) },
        { label: "Base", lift: simulatedInputs.expected_conversion_lift_pct },
        { label: "Upside", lift: simulatedInputs.expected_conversion_lift_pct + 15 },
      ].map((item) => ({
        ...item,
        result: simulatePromotion(simulatedProducts, { ...simulatedInputs, expected_conversion_lift_pct: item.lift }),
      })),
    [simulatedProducts, simulatedInputs],
  );
  const waterfall = useMemo(() => {
    const eligible = result.products.filter((product) => product.eligible);
    return [
      {
        label: "List price",
        value: eligible.reduce((sum, p) => sum + p.selling_price, 0),
        tone: "neutral",
      },
      {
        label: "Merchant discount",
        value: -eligible.reduce((sum, p) => sum + p.merchant_discount, 0),
        tone: "negative",
      },
      {
        label: "Platform funding",
        value: eligible.reduce((sum, p) => sum + p.platform_funding, 0),
        tone: "positive",
      },
      {
        label: "Commission + VAT",
        value: -eligible.reduce((sum, p) => sum + p.commission + p.vat_on_fees, 0),
        tone: "negative",
      },
      {
        label: "Payment fees",
        value: -eligible.reduce((sum, p) => sum + p.payment_fee, 0),
        tone: "negative",
      },
      {
        label: "Product cost",
        value: -eligible.reduce((sum, p) => sum + (p.inferred_product_cost ?? 0), 0),
        tone: "negative",
      },
      {
        label: "Net contribution",
        value: eligible.reduce((sum, p) => sum + (p.expected_contribution ?? 0), 0),
        tone: "result",
      },
    ];
  }, [result.products]);
  const waterfallScale = Math.max(1, ...waterfall.map((item) => Math.abs(item.value)));
  const commercialInputsReady = [commission, platformFunding, vatOnFees, paymentFee, fixedOrderFee].every(value => value !== "") && commissionBase !== "unknown" && validationErrors.length === 0;
  const contractReady = Boolean(contract && contract.status === "approved" && commercialInputsReady
    && n(commission) === Number(contract.commission_rate_pct)
    && n(platformFunding) === Number(contract.promotion_funding_platform_pct)
    && n(vatOnFees) === Number(contract.vat_on_fees_pct)
    && n(paymentFee) === Number(contract.payment_fee_pct)
    && n(fixedOrderFee) === Number(contract.fixed_order_fee)
    && commissionBase === contract.commission_base);

  const saveDraft = async () => {
    if (!simulationRequest || simulationStale || validationErrors.length || !contractReady || !result.approval_ready || !result.meets_margin_floor || !result.beats_baseline) { setError("Run a current simulation backed by an approved contract and verified costs that meets the margin floor and beats the baseline before saving."); return; }
    setBusy(true);
    setError(null);
    try {
      await call({
        action: "create",
        name,
        source_platform: contract?.platform ?? products[0]?.source_platform ?? "unknown",
        inputs: { ...simulationRequest.inputs, target_channels: targetChannels, simulation_signature: simulationRequest.signature, simulated_at: new Date().toISOString(), contract_id: contract?.id ?? null, contract_status: contract?.status ?? null },
        results: result,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save campaign.");
    } finally {
      setBusy(false);
    }
  };
  const update = async (item: SavedPromotionScenario, status?: string) => {
    setBusy(true);
    setError(null);
    const draft = fundingDrafts[item.id] ?? {
      promised: String(item.promised_platform_funding ?? ""),
      actual: String(item.actual_platform_funding ?? ""),
    };
    try {
      await call({
        action: "update",
        id: item.id,
        ...(status ? { scenario_status: status } : {}),
        promised_platform_funding: draft.promised === "" ? null : n(draft.promised),
        actual_platform_funding: draft.actual === "" ? null : n(draft.actual),
        approved_by: "Merchant finance approver",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update campaign.");
    } finally {
      setBusy(false);
    }
  };
  const approve = async (item: SavedPromotionScenario, role: "finance" | "operations") => {
    const reviewer = role === "finance" ? financeReviewer : operationsReviewer;
    if (!reviewer.trim()) {
      setError(`Enter the ${role} reviewer.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await call({ action: "approve", id: item.id, approval_role: role, reviewer });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not approve campaign.");
    } finally {
      setBusy(false);
    }
  };
  const prepareLaunch = async (item: SavedPromotionScenario) => {
    setBusy(true);
    setError(null);
    try {
      await call({
        action: "prepare_launch",
        id: item.id,
        target_channels: (item.inputs.target_channels as string[] | undefined) ?? targetChannels,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not prepare launch.");
    } finally {
      setBusy(false);
    }
  };
  const confirmLaunch = async (item: SavedPromotionScenario, channel: string) => {
    const key = `${item.id}:${channel}`;
    const reference = launchReferences[key]?.trim();
    if (!reference) {
      setError(`Enter the ${channel.toUpperCase()} campaign id.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await call({
        action: "confirm_channel_launch",
        id: item.id,
        target_channel: channel,
        partner_campaign_id: reference,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not confirm channel launch.");
    } finally {
      setBusy(false);
    }
  };

  const runSimulation = () => {
    setSimulationRequest({ inputs: { ...inputs }, selected: [...selected], signature: inputSignature, calculatedAt: new Date().toISOString() });
    setError(null);
  };

  const resetSimulation = () => {
    setDiscount("20");
    setPlatformFunding(contract?.promotion_funding_platform_pct == null ? "" : String(contract.promotion_funding_platform_pct));
    setCommission(contract?.commission_rate_pct == null ? "" : String(contract.commission_rate_pct));
    setVatOnFees(contract?.vat_on_fees_pct == null ? "" : String(contract.vat_on_fees_pct));
    setPaymentFee(contract?.payment_fee_pct == null ? "" : String(contract.payment_fee_pct));
    setFixedOrderFee(contract?.fixed_order_fee == null ? "" : String(contract.fixed_order_fee));
    setCommissionBase(contract?.commission_base ?? "unknown");
    setLift("25"); setOrders("100"); setDays("7"); setFloor("15");
    setSimulationRequest(null); setError(null);
  };

  const promotionCost = simulationRequest
    ? result.products.reduce((sum, product) => sum + product.merchant_discount, 0) * result.expected_orders
    : 0;
  const resultMargin = simulationRequest && result.campaign_contribution > 0
    ? Math.max(0, (result.campaign_contribution / Math.max(1, result.products.filter(product => product.eligible).reduce((sum, product) => sum + product.campaign_price, 0) * result.expected_orders) * 100))
    : null;

  return (
    <section
      style={{
        border: "1px solid var(--border)",
        borderRadius: 14,
        overflow: "hidden",
        background: "var(--surface)",
      }}
    >
      <div
        className="ps-promotion-intro"
        style={{
          padding: "20px 20px 16px",
          background: "var(--surface)",
          display: "none",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ color: "#EF681A", fontSize: 10.5, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase" }}>Promotion simulation</div>
          <div style={{ fontSize: 25, fontWeight: 900, marginTop: 5, letterSpacing: "-.03em" }}>Simulate impact before you spend</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>
            Compare campaign economics, protect contribution margin, and prepare an approval-ready scenario.
          </div>
        </div>
        <span
          style={{
            display: "inline-flex",
            gap: 6,
            alignItems: "center",
            fontSize: 11.5,
            fontWeight: 800,
            color: contractReady ? "#087F5B" : "#A16207",
          }}
        >
          {contractReady ? <ShieldCheck size={15} /> : <AlertTriangle size={15} />}{" "}
          {contractReady ? "Reviewed contract applied" : "Commercial assumptions require review"}
        </span>
      </div>
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
          {[
            ["Projected contribution", simulationRequest ? money(result.campaign_contribution, currency) : "Not calculated", "After verified campaign costs"],
            ["Promotion cost", simulationRequest ? money(promotionCost, currency) : "Not calculated", "Merchant-funded discount"],
            ["Expected lift", `${n(lift) >= 0 ? "+" : ""}${lift}%`, "Merchant estimate, not a guarantee"],
            ["Net profit impact", simulationRequest ? money(result.incremental_contribution, currency) : "Not calculated", simulationRequest ? (result.beats_baseline ? "Above baseline" : "Below baseline") : "Requires current inputs"],
          ].map(([label, value, note]) => <div key={label} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "14px 15px", background: "var(--surface)", boxShadow: "0 8px 22px rgba(15,35,70,.04)" }}><div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 850, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div><div style={{ fontSize: 20, fontWeight: 900, marginTop: 7 }}>{value}</div><div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 4 }}>{note}</div></div>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 12 }}>
          <section style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 16, background: "var(--surface)" }}>
            <div style={{ fontSize: 14, fontWeight: 900 }}>Scenario builder</div>
            <div style={{ marginTop: 3, color: "var(--muted)", fontSize: 10.5 }}>Configure the commercial outcome you want to test.</div>
            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              <label style={{ fontSize: 10.5, fontWeight: 800 }}>Campaign name<input style={{ ...input, marginTop: 4 }} value={name} onChange={event => setName(event.target.value)} /></label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <label style={{ fontSize: 10.5, fontWeight: 800 }}>Discount %<input type="number" min={0} max={100} style={{ ...input, marginTop: 4 }} value={discount} onChange={event => setDiscount(event.target.value)} /></label>
                <label style={{ fontSize: 10.5, fontWeight: 800 }}>Expected lift %<input type="number" min={-100} max={1000} style={{ ...input, marginTop: 4 }} value={lift} onChange={event => setLift(event.target.value)} /></label>
                <label style={{ fontSize: 10.5, fontWeight: 800 }}>Baseline orders<input type="number" min={1} style={{ ...input, marginTop: 4 }} value={orders} onChange={event => setOrders(event.target.value)} /></label>
                <label style={{ fontSize: 10.5, fontWeight: 800 }}>Duration days<input type="number" min={1} style={{ ...input, marginTop: 4 }} value={days} onChange={event => setDays(event.target.value)} /></label>
              </div>
              <label style={{ fontSize: 10.5, fontWeight: 800 }}>Protected margin floor %<input type="number" min={0} max={100} style={{ ...input, marginTop: 4 }} value={floor} onChange={event => setFloor(event.target.value)} /></label>
              <div style={{ padding: "9px 10px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface2)", fontSize: 10.5, color: "var(--muted)" }}><strong style={{ color: "var(--text)" }}>{selected.length} products</strong> · {targetChannels.map(channel => channel.replaceAll("_"," ").toUpperCase()).join(", ") || "No channel selected"}</div>
              <button type="button" disabled={busy || !selected.length || !commercialInputsReady} onClick={runSimulation} style={{ border: 0, borderRadius: 8, padding: "10px 14px", background: "#061B49", color: "#fff", fontFamily: "inherit", fontWeight: 850, cursor: !commercialInputsReady || !selected.length ? "not-allowed" : "pointer", opacity: !commercialInputsReady || !selected.length ? .5 : 1 }}><FlaskConical size={14} style={{ verticalAlign: "middle", marginInlineEnd: 6 }} />{simulationRequest ? "Recalculate simulation" : "Run simulation"}</button>
              <button type="button" onClick={resetSimulation} style={{ border: 0, background: "transparent", color: "var(--accent-text)", fontFamily: "inherit", fontWeight: 750, fontSize: 11.5, cursor: "pointer" }}>Reset to contract baseline</button>
            </div>
          </section>
          <div style={{ display: "grid", gridTemplateRows: "1fr auto", gap: 12, minWidth: 0 }}>
            <section style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 16, background: "var(--surface)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><div><div style={{ fontSize: 14, fontWeight: 900 }}>Scenario comparison</div><div style={{ marginTop: 3, color: "var(--muted)", fontSize: 10.5 }}>Downside, expected, and upside demand outcomes</div></div>{simulationRequest && <span style={{ color: simulationStale ? "#A16207" : "#087F5B", fontSize: 10.5, fontWeight: 800 }}>{simulationStale ? "Results need recalculation" : "Current simulation"}</span>}</div>
              {simulationRequest ? <div style={{ display: "grid", gap: 14, marginTop: 20 }}>{sensitivity.map((scenario,index) => { const max=Math.max(1,...sensitivity.map(item=>Math.abs(item.result.campaign_contribution))); const width=Math.max(5,Math.abs(scenario.result.campaign_contribution)/max*100); return <div key={scenario.label} style={{ display: "grid", gridTemplateColumns: "70px minmax(0,1fr) 110px", gap: 10, alignItems: "center" }}><strong style={{ fontSize: 11 }}>{scenario.label}</strong><div style={{ height: 22, borderRadius: 6, background: "var(--surface2)", overflow: "hidden" }}><div style={{ width: `${width}%`, height: "100%", background: index===1?"#2563EB":index===2?"#EF681A":"#94A3B8", borderRadius: 6 }} /></div><span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 800 }}>{money(scenario.result.campaign_contribution,currency)}</span></div>})}</div> : <div style={{ minHeight: 150, display: "grid", placeItems: "center", color: "var(--muted)", fontSize: 12 }}>Run the scenario to compare outcomes.</div>}
            </section>
            <section style={{ border: `1px solid ${simulationRequest ? result.beats_baseline && result.meets_margin_floor ? "#BBF7D0" : "#FED7AA" : "var(--border)"}`, borderRadius: 12, padding: 15, background: simulationRequest ? result.beats_baseline && result.meets_margin_floor ? "#F0FDF4" : "#FFF7ED" : "var(--surface)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}><div><div style={{ fontSize: 12, fontWeight: 900 }}>Recommendation summary</div><strong style={{ display: "block", marginTop: 6, fontSize: 15 }}>{!simulationRequest ? "No scenario calculated" : result.beats_baseline && result.meets_margin_floor ? "This scenario is ready for merchant review" : "Revise this scenario before approval"}</strong><span style={{ display: "block", marginTop: 4, color: "var(--muted)", fontSize: 11 }}>{!simulationRequest ? "Complete the builder and run a simulation." : `${result.eligible_products} eligible products · ${result.expected_orders} expected orders · ${resultMargin == null ? "margin unavailable" : `${resultMargin.toFixed(1)}% projected contribution margin`}`}</span></div>{simulationRequest && <span style={{ padding: "5px 8px", borderRadius: 999, background: result.approval_ready ? "#DCFCE7" : "#FFEDD5", color: result.approval_ready ? "#166534" : "#9A3412", fontSize: 10.5, fontWeight: 850 }}>{result.approval_ready ? "Evidence ready" : "Planning estimate"}</span>}</div>
            </section>
          </div>
        </div>
        <details style={{ border: "1px solid var(--border)", borderRadius: 11, background: "var(--surface2)" }}>
          <summary style={{ padding: "12px 14px", cursor: "pointer", color: "var(--text)", fontSize: 12.5, fontWeight: 850 }}>Products, channels, and contract assumptions</summary>
          <div style={{ padding: "4px 14px 14px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
            gap: 10,
          }}
        >
          <MerchantField label="Campaign name" help="A private name for identifying this promotion. Customers will not see it." source="merchant">
            <input style={input} value={name} onChange={(e) => setName(e.target.value)} />
          </MerchantField>
          <MerchantField label="Discount %" help="The percentage customers receive off the normal selling price." source="merchant" consequence="A larger discount can increase orders but reduce what you keep per order.">
            <input
              type="number"
              min={0} max={100}
              style={input}
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </MerchantField>
          <MerchantField label="Platform funding %" help="How much of the customer discount the sales platform pays." source="contract" whereToFind="your campaign agreement">
            <input
              type="number"
              min={0} max={100}
              style={input}
              value={platformFunding}
              onChange={(e) => setPlatformFunding(e.target.value)}
              placeholder="From contract"
            />
          </MerchantField>
          <MerchantField label="Commission %" help="The percentage the platform charges on each campaign order." source="contract" whereToFind="your commercial agreement or latest payout statement">
            <input
              type="number"
              min={0} max={100}
              style={input}
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              placeholder="From contract"
            />
          </MerchantField>
          <MerchantField label="VAT on fees %" help="VAT charged on the platform's commission and fees, not the customer's order total." source="contract">
            <input
              type="number"
              min={0} max={100}
              style={input}
              value={vatOnFees}
              onChange={(e) => setVatOnFees(e.target.value)}
              placeholder="From contract"
            />
          </MerchantField>
          <MerchantField label="Payment fee %" help="The percentage deducted for processing the customer's payment." source="contract" whereToFind="your payment or platform agreement">
            <input
              type="number"
              min={0} max={100}
              style={input}
              value={paymentFee}
              onChange={(e) => setPaymentFee(e.target.value)}
              placeholder="From contract"
            />
          </MerchantField>
          <MerchantField label="Fixed order fee" help={`Any fixed ${currency} amount charged on every campaign order.`} source="contract">
            <input
              type="number"
              min={0}
              style={input}
              value={fixedOrderFee}
              onChange={(e) => setFixedOrderFee(e.target.value)}
              placeholder="From contract"
            />
          </MerchantField>
          <MerchantField label="Commission base" help="The order amount the platform uses when calculating its commission." source="contract" whereToFind="the commission section of your agreement">
            <select
              style={input}
              value={commissionBase}
              onChange={(e) => setCommissionBase(e.target.value as typeof commissionBase)}
            >
              <option value="unknown">Select basis</option>
              <option value="gross_before_discount">Gross before discount</option>
              <option value="net_after_discount">Net after discount</option>
              <option value="eligible_sales">Eligible sales</option>
            </select>
          </MerchantField>
          <MerchantField label="Expected order lift %" help="Your estimated increase in orders while the promotion is running." source="estimate" consequence="PrizeSkout uses this estimate to project whether extra orders make up for the discount.">
            <input
              type="number"
              min={-100} max={1000}
              style={input}
              value={lift}
              onChange={(e) => setLift(e.target.value)}
            />
          </MerchantField>
          <MerchantField label="Baseline orders" help="How many orders you would normally expect during the same number of days without this promotion." source="estimate">
            <input
              type="number"
              min={1}
              style={input}
              value={orders}
              onChange={(e) => setOrders(e.target.value)}
            />
          </MerchantField>
          <MerchantField label="Duration (days)" help="How many calendar days the promotion will run." source="merchant">
            <input
              type="number"
              min={1} step={1}
              style={input}
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
          </MerchantField>
          <MerchantField label="Minimum margin %" help="The lowest profit margin you are willing to accept after all campaign costs." source="merchant" consequence="PrizeSkout warns you when a campaign would go below this protected margin.">
            <input
              type="number"
              min={0} max={100}
              style={input}
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
            />
          </MerchantField>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 900, marginBottom: 7 }}>
            Products in campaign · {selected.length} of {products.length}
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {products.map((product) => (
              <label
                key={product.sku}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 999,
                  padding: "6px 9px",
                  fontSize: 11.5,
                  cursor: "pointer",
                  background: selected.includes(product.sku) ? "var(--surface2)" : "transparent",
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(product.sku)}
                  onChange={() =>
                    setSelected((current) =>
                      current.includes(product.sku)
                        ? current.filter((s) => s !== product.sku)
                        : [...current, product.sku],
                    )
                  }
                />{" "}
                {product.name}
              </label>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 900, marginBottom: 7 }}>Target channels</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {["zid", "salla", "talabat", "jahez", "keeta", "in_store"].map((channel) => (
              <label
                key={channel}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 999,
                  padding: "6px 9px",
                  fontSize: 11.5,
                  cursor: "pointer",
                  background: targetChannels.includes(channel) ? "var(--surface2)" : "transparent",
                }}
              >
                <input
                  type="checkbox"
                  checked={targetChannels.includes(channel)}
                  onChange={() =>
                    setTargetChannels((current) =>
                      current.includes(channel)
                        ? current.filter((value) => value !== channel)
                        : [...current, channel],
                    )
                  }
                />{" "}
                {channel.replaceAll("_", " ").toUpperCase()}
              </label>
            ))}
          </div>
        </div>
        <div style={{ border: "1px solid var(--border)", borderRadius: 11, padding: 14, background: "var(--surface2)" }}>
          {!!validationErrors.length && <div style={{ color: "#B42318", fontSize: 12, marginBottom: 10 }}><strong>Fix these inputs before simulating:</strong><ul style={{ margin: "6px 0 0", paddingInlineStart: 20 }}>{validationErrors.map(message => <li key={message}>{message}</li>)}</ul></div>}
          {simulationStale && <div style={{ color: "#A16207", fontSize: 12, marginBottom: 10 }}><strong>Results out of date.</strong> An assumption, product, or channel changed. Recalculate before saving or approval.</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" disabled={busy || !selected.length || !commercialInputsReady} onClick={runSimulation} style={{ border: 0, borderRadius: 8, padding: "10px 14px", background: "#EF681A", color: "#fff", fontFamily: "inherit", fontWeight: 850, cursor: !commercialInputsReady || !selected.length ? "not-allowed" : "pointer", opacity: !commercialInputsReady || !selected.length ? .5 : 1 }}><FlaskConical size={14} style={{ verticalAlign: "middle", marginInlineEnd: 6 }} />{simulationRequest ? "Recalculate simulation" : "Run simulation"}</button>
            <button type="button" onClick={resetSimulation} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "9px 13px", background: "var(--surface)", color: "var(--text)", fontFamily: "inherit", fontWeight: 800, cursor: "pointer" }}>Reset</button>
            <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{simulationRequest && !simulationStale ? `Calculated ${new Date(simulationRequest.calculatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "No current result"}</span>
          </div>
        </div>
          </div>
        </details>
        {simulationRequest ? <>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))",
            gap: 12,
          }}
        >
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 11,
              padding: 14,
              overflow: "hidden",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 900 }}>Where the campaign price goes</div>
            <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 3 }}>
              Per campaign basket across the selected products
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${waterfall.length},minmax(72px,1fr))`,
                gap: 7,
                alignItems: "end",
                height: 190,
                marginTop: 13,
                overflowX: "auto",
              }}
            >
              {waterfall.map((item) => {
                const color =
                  item.tone === "positive"
                    ? "#087F5B"
                    : item.tone === "negative"
                      ? "#B42318"
                      : item.tone === "result"
                        ? item.value >= 0
                          ? "#087F5B"
                          : "#B42318"
                        : "#667085";
                return (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      height: "100%",
                      minWidth: 72,
                      flexDirection: "column",
                      justifyContent: "flex-end",
                      alignItems: "stretch",
                      gap: 5,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 900, textAlign: "center", color }}>
                      {item.value < 0 ? "−" : ""}
                      {money(Math.abs(item.value), currency)}
                    </div>
                    <div
                      style={{
                        height: `${Math.max(8, (Math.abs(item.value) / waterfallScale) * 112)}px`,
                        background: color,
                        borderRadius: "6px 6px 2px 2px",
                        opacity: item.tone === "result" ? 1 : 0.82,
                      }}
                    />
                    <div
                      style={{
                        fontSize: 9.5,
                        color: "var(--muted)",
                        textAlign: "center",
                        lineHeight: 1.25,
                        minHeight: 25,
                      }}
                    >
                      {item.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ border: "1px solid var(--border)", borderRadius: 11, padding: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 900 }}>Demand sensitivity</div>
            <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 3 }}>
              The lift is an assumption, so review a range—not one confident-looking number.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 13 }}>
              {sensitivity.map((item) => (
                <div
                  key={item.label}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "9px 10px",
                    background: item.label === "Base" ? "var(--surface2)" : "transparent",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      fontSize: 11,
                      fontWeight: 900,
                    }}
                  >
                    <span>
                      {item.label} · {item.lift >= 0 ? "+" : ""}
                      {item.lift}% orders
                    </span>
                    <span
                      style={{
                        color: item.result.incremental_contribution >= 0 ? "#087F5B" : "#B42318",
                      }}
                    >
                      {money(item.result.incremental_contribution, currency)}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 3 }}>
                    {item.result.expected_orders} expected orders ·{" "}
                    {item.result.beats_baseline ? "beats baseline" : "below baseline"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
            gap: 10,
          }}
        >
          {[
            ["Products eligible", `${result.eligible_products}`],
            ["Expected orders", `${result.expected_orders}`],
            [
              "Break-even orders",
              result.break_even_orders == null
                ? "Not achievable"
                : String(result.break_even_orders),
            ],
            ["Campaign contribution", money(result.campaign_contribution, currency)],
            ["Incremental contribution", money(result.incremental_contribution, currency)],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "11px 12px" }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: "var(--muted)",
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 900,
                  marginTop: 4,
                  color:
                    label === "Incremental contribution"
                      ? result.beats_baseline
                        ? "#087F5B"
                        : "#B42318"
                      : "var(--text)",
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>
        {result.excluded_products > 0 && (
          <div style={{ fontSize: 12, color: "#A16207", display: "flex", gap: 7 }}>
            <AlertTriangle size={15} />
            {result.excluded_products} product(s) excluded because cost or margin evidence is
            incomplete.
          </div>
        )}
        <div className="table-scroll">
          <table
            style={{ width: "100%", borderCollapse: "collapse", minWidth: 1050, fontSize: 11.5 }}
          >
            <thead>
              <tr>
                {[
                  "Product",
                  "Price",
                  "Campaign price",
                  "Merchant discount",
                  "Platform funding",
                  "Commission + VAT",
                  "Product cost*",
                  "Contribution",
                  "Net margin",
                  "Max affordable discount",
                ].map((label) => (
                  <th
                    key={label}
                    style={{
                      textAlign: "start",
                      padding: "9px",
                      borderBottom: "1px solid var(--border)",
                      color: "var(--muted)",
                      fontSize: 10,
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.products.map((product) => (
                <tr key={product.sku}>
                  {[
                    `${product.name} · ${product.sku}`,
                    money(product.selling_price, currency),
                    money(product.campaign_price, currency),
                    money(product.merchant_discount, currency),
                    money(product.platform_funding, currency),
                    money(product.commission + product.vat_on_fees, currency),
                    product.inferred_product_cost == null
                      ? "Missing"
                      : `${money(product.inferred_product_cost, currency)} · ${product.cost_basis}`,
                    product.expected_contribution == null
                      ? "Excluded"
                      : money(product.expected_contribution, currency),
                    product.expected_margin_pct == null ? "—" : `${product.expected_margin_pct}%`,
                    product.maximum_affordable_discount_pct == null
                      ? "—"
                      : `${product.maximum_affordable_discount_pct}%`,
                  ].map((value, index) => (
                    <td
                      key={index}
                      style={{
                        padding: "10px 9px",
                        borderBottom: "1px solid var(--border)",
                        fontWeight: index === 0 ? 800 : 500,
                        color: product.eligible ? "var(--text)" : "#A16207",
                      }}
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 10.5, color: "var(--muted)" }}>
          * Product cost shows its evidence basis. Verified values come from the connected catalogue
          economics snapshot; inferred values remain clearly labelled. No campaign is launched from
          this workspace.
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11.5 }}><strong style={{ color: result.beats_baseline ? "#087F5B" : "#B42318" }}>{result.beats_baseline ? "Beats baseline" : "Below baseline"}</strong><strong style={{ color: result.meets_margin_floor ? "#087F5B" : "#B42318" }}>{result.meets_margin_floor ? "Every product meets the floor" : "At least one product is below the floor"}</strong><strong style={{ color: result.approval_ready ? "#087F5B" : "#A16207" }}>{result.approval_ready ? "Evidence ready for review" : "Planning estimate only"}</strong></div>
        </> : <div style={{ border: "1px dashed var(--border)", borderRadius: 11, padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Complete the assumptions and click <strong>Run simulation</strong>. PrizeSkout will not present calculated campaign results before validation.</div>}
        <div style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}>
          {!commercialInputsReady && (
            <div style={{ fontSize: 11.5, color: "#A16207", alignSelf: "center" }}>
              Enter the commission, commission basis, funding split, VAT, payment fee and fixed fee before saving. Enter a reviewed zero when the agreement confirms no charge; PrizeSkout will not treat a blank as zero.
            </div>
          )}
          <button
            disabled={busy || !name.trim() || !selected.length || !commercialInputsReady || !contractReady || !simulationRequest || simulationStale || !result.approval_ready || !result.meets_margin_floor || !result.beats_baseline}
            onClick={saveDraft}
            style={{
              border: 0,
              borderRadius: 8,
              padding: "9px 13px",
              background: "#14213D",
              color: "#fff",
              fontFamily: "inherit",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              gap: 6,
              opacity: commercialInputsReady && contractReady && simulationRequest && !simulationStale && result.approval_ready && result.meets_margin_floor && result.beats_baseline ? 1 : 0.5,
            }}
          >
            <Save size={14} />
            Save simulation as draft
          </button>
          <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
            Approval records the decision only. It does not enroll the merchant in a platform
            campaign.
          </span>
        </div>
        {!!saved.length && (
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 15 }}>
            <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 10 }}>
              Campaign history and who funded each discount
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <input
                style={{ ...input, maxWidth: 230 }}
                value={financeReviewer}
                onChange={(e) => setFinanceReviewer(e.target.value)}
                placeholder="Finance reviewer name"
              />
              <input
                style={{ ...input, maxWidth: 230 }}
                value={operationsReviewer}
                onChange={(e) => setOperationsReviewer(e.target.value)}
                placeholder="Operations reviewer name"
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {saved.map((item) => {
                const draft = fundingDrafts[item.id] ?? {
                  promised: String(item.promised_platform_funding ?? ""),
                  actual: String(item.actual_platform_funding ?? ""),
                };
                const funding =
                  draft.promised !== "" && draft.actual !== ""
                    ? reconcilePromotionFunding(n(draft.promised), n(draft.actual))
                    : null;
                return (
                  <div
                    key={item.id}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "11px 12px",
                      display: "grid",
                      gridTemplateColumns:
                        "minmax(190px,1.4fr) repeat(2,minmax(120px,.7fr)) minmax(150px,.8fr)",
                      gap: 9,
                      alignItems: "end",
                    }}
                  >
                    <div>
                      <strong>{item.name}</strong>
                      <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 3 }}>
                        {item.platform.toUpperCase()} · {item.status.toUpperCase()} ·{" "}
                        {new Date(item.created_at).toLocaleDateString("en-GB")}
                      </div>
                    </div>
                    <label style={{ fontSize: 10.5, fontWeight: 800 }}>
                      Promised funding
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        style={input}
                        value={draft.promised}
                        onChange={(e) =>
                          setFundingDrafts({
                            ...fundingDrafts,
                            [item.id]: { ...draft, promised: e.target.value },
                          })
                        }
                      />
                    </label>
                    <label style={{ fontSize: 10.5, fontWeight: 800 }}>
                      Actual funding
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        style={input}
                        value={draft.actual}
                        onChange={(e) =>
                          setFundingDrafts({
                            ...fundingDrafts,
                            [item.id]: { ...draft, actual: e.target.value },
                          })
                        }
                      />
                    </label>
                    <div
                      style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}
                    >
                      {!item.finance_approved_at &&
                        ["draft", "pending_approval"].includes(item.status) && (
                          <button
                            disabled={busy}
                            onClick={() => approve(item, "finance")}
                            style={{
                              border: "1px solid var(--border)",
                              borderRadius: 7,
                              padding: "8px",
                              background: "var(--surface)",
                              color: "var(--text)",
                              fontFamily: "inherit",
                              fontWeight: 800,
                              cursor: "pointer",
                            }}
                          >
                            Finance approve
                          </button>
                        )}
                      {!item.operations_approved_at &&
                        ["draft", "pending_approval"].includes(item.status) && (
                          <button
                            disabled={busy}
                            onClick={() => approve(item, "operations")}
                            style={{
                              border: "1px solid var(--border)",
                              borderRadius: 7,
                              padding: "8px",
                              background: "var(--surface)",
                              color: "var(--text)",
                              fontFamily: "inherit",
                              fontWeight: 800,
                              cursor: "pointer",
                            }}
                          >
                            Ops approve
                          </button>
                        )}
                      {item.status === "approved" && (
                        <button
                          disabled={busy}
                          onClick={() => prepareLaunch(item)}
                          style={{
                            border: "1px solid #087F5B",
                            borderRadius: 7,
                            padding: "8px",
                            background: "transparent",
                            color: "#087F5B",
                            fontFamily: "inherit",
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          Prepare channel launch
                        </button>
                      )}
                      {!["draft", "pending_approval"].includes(item.status) && (
                        <button
                          disabled={busy}
                          onClick={() => update(item)}
                          style={{
                            border: "1px solid var(--border)",
                            borderRadius: 7,
                            padding: "8px",
                            background: "var(--surface)",
                            color: "var(--text)",
                            fontFamily: "inherit",
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          Save funding
                        </button>
                      )}
                      {funding && (
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 900,
                            color: funding.status === "matched" ? "#087F5B" : "#B42318",
                          }}
                        >
                          {funding.status} · {money(funding.variance, currency)}
                        </span>
                      )}
                    </div>
                    {!!item.launch_manifest?.length && (
                      <div
                        style={{ gridColumn: "1 / -1", display: "flex", gap: 7, flexWrap: "wrap" }}
                      >
                        {item.launch_manifest.map((entry) => {
                          const key = `${item.id}:${entry.channel}`;
                          return (
                            <div
                              key={entry.channel}
                              title={entry.instruction}
                              style={{
                                display: "flex",
                                gap: 5,
                                alignItems: "center",
                                border: "1px solid var(--border)",
                                borderRadius: 8,
                                padding: "5px 7px",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 10.5,
                                  color: entry.status === "launched" ? "#087F5B" : "#A16207",
                                  fontWeight: 800,
                                }}
                              >
                                {entry.channel.toUpperCase()} · {entry.status}
                              </span>
                              {entry.status !== "launched" && (
                                <>
                                  <input
                                    value={launchReferences[key] ?? ""}
                                    onChange={(e) =>
                                      setLaunchReferences({
                                        ...launchReferences,
                                        [key]: e.target.value,
                                      })
                                    }
                                    placeholder="Partner campaign ID"
                                    style={{
                                      ...input,
                                      width: 145,
                                      padding: "5px 6px",
                                      fontSize: 10,
                                    }}
                                  />
                                  <button
                                    disabled={busy}
                                    onClick={() => confirmLaunch(item, entry.channel)}
                                    style={{
                                      border: 0,
                                      borderRadius: 6,
                                      padding: "6px 7px",
                                      background: "#087F5B",
                                      color: "#fff",
                                      fontFamily: "inherit",
                                      fontSize: 10,
                                      fontWeight: 800,
                                    }}
                                  >
                                    Confirm
                                  </button>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {error && <div style={{ fontSize: 12, color: "#B42318" }}>{error}</div>}
        <div
          style={{
            display: "flex",
            gap: 7,
            fontSize: 10.5,
            color: "var(--muted)",
            alignItems: "center",
          }}
        >
          {result.profitable ? (
            <CheckCircle2 size={14} color="#087F5B" />
          ) : (
            <FlaskConical size={14} color="#A16207" />
          )}
          {result.assumptions.join(" ")}
        </div>
      </div>
    </section>
  );
}
