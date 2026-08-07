import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FlaskConical, Save, ShieldCheck } from "lucide-react";
import {
  reconcilePromotionFunding,
  simulatePromotion,
  type PromotionProduct,
} from "@/lib/promotion-profitability";
import type { ContractTerm } from "@/components/dashboard/payout/ContractIntelligenceVault";
import type { SavedPromotionScenario } from "@/server/core/promotion-scenarios";

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

  const scoped = useMemo(
    () => products.filter((p) => selected.includes(p.sku)),
    [products, selected],
  );
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
  const result = useMemo(() => simulatePromotion(scoped, inputs), [scoped, inputs]);
  const sensitivity = useMemo(
    () =>
      [
        { label: "Downside", lift: Math.min(0, inputs.expected_conversion_lift_pct - 15) },
        { label: "Base", lift: inputs.expected_conversion_lift_pct },
        { label: "Upside", lift: inputs.expected_conversion_lift_pct + 15 },
      ].map((item) => ({
        ...item,
        result: simulatePromotion(scoped, { ...inputs, expected_conversion_lift_pct: item.lift }),
      })),
    [scoped, inputs],
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
  const commercialInputsReady =
    commission !== "" && platformFunding !== "" && commissionBase !== "unknown";
  const contractReady = Boolean(
    contract && contract.status === "approved" && commercialInputsReady,
  );

  const saveDraft = async () => {
    setBusy(true);
    setError(null);
    try {
      await call({
        action: "create",
        name,
        source_platform: contract?.platform ?? products[0]?.source_platform ?? "unknown",
        inputs: { ...inputs, target_channels: targetChannels },
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
        style={{
          padding: "17px 20px",
          background: "var(--surface2)",
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>Promotion Profitability Control</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>
            Simulate campaign economics before approval, then reconcile promised funding against
            actual funding.
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
            gap: 10,
          }}
        >
          <label style={{ fontSize: 11, fontWeight: 800 }}>
            Campaign name
            <input style={input} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label style={{ fontSize: 11, fontWeight: 800 }}>
            Discount %
            <input
              type="number"
              style={input}
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </label>
          <label style={{ fontSize: 11, fontWeight: 800 }}>
            Platform funding %
            <input
              type="number"
              style={input}
              value={platformFunding}
              onChange={(e) => setPlatformFunding(e.target.value)}
              placeholder="From contract"
            />
          </label>
          <label style={{ fontSize: 11, fontWeight: 800 }}>
            Commission %
            <input
              type="number"
              style={input}
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              placeholder="From contract"
            />
          </label>
          <label style={{ fontSize: 11, fontWeight: 800 }}>
            VAT on fees %
            <input
              type="number"
              style={input}
              value={vatOnFees}
              onChange={(e) => setVatOnFees(e.target.value)}
              placeholder="From contract"
            />
          </label>
          <label style={{ fontSize: 11, fontWeight: 800 }}>
            Payment fee %
            <input
              type="number"
              style={input}
              value={paymentFee}
              onChange={(e) => setPaymentFee(e.target.value)}
              placeholder="From contract"
            />
          </label>
          <label style={{ fontSize: 11, fontWeight: 800 }}>
            Fixed order fee
            <input
              type="number"
              style={input}
              value={fixedOrderFee}
              onChange={(e) => setFixedOrderFee(e.target.value)}
              placeholder="From contract"
            />
          </label>
          <label style={{ fontSize: 11, fontWeight: 800 }}>
            Commission base
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
          </label>
          <label style={{ fontSize: 11, fontWeight: 800 }}>
            Expected order lift %
            <input
              type="number"
              style={input}
              value={lift}
              onChange={(e) => setLift(e.target.value)}
            />
          </label>
          <label style={{ fontSize: 11, fontWeight: 800 }}>
            Baseline orders
            <input
              type="number"
              style={input}
              value={orders}
              onChange={(e) => setOrders(e.target.value)}
            />
          </label>
          <label style={{ fontSize: 11, fontWeight: 800 }}>
            Duration (days)
            <input
              type="number"
              style={input}
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
          </label>
          <label style={{ fontSize: 11, fontWeight: 800 }}>
            Minimum margin %
            <input
              type="number"
              style={input}
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
            />
          </label>
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1.35fr) minmax(280px,.65fr)",
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
                    {item.result.profitable ? "profitable" : "below baseline"}
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
                      ? result.profitable
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
        <div style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}>
          {!commercialInputsReady && (
            <div style={{ fontSize: 11.5, color: "#A16207", alignSelf: "center" }}>
              Enter the commission, commission basis and funding split before saving. PrizeSkout
              will not invent missing contract terms.
            </div>
          )}
          <button
            disabled={busy || !name.trim() || !selected.length || !commercialInputsReady}
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
              opacity: commercialInputsReady ? 1 : 0.5,
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
