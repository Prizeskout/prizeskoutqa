const truth = (key: string) => ({ key, status: "verified", record_count: 1, strongest_evidence: "strong", observed_through: null, effective_from: null, effective_to: null, currencies: ["QAR"], provenance: ["controlled_demo_fixture"], blockers: [] });

export const dashboardV2DemoSummary = {
  version: "dashboard-v2-summary-v1", generated_at: "2026-10-08T14:32:00.000Z",
  scope: { account_id: "controlled-demo", merchant_id: "controlled-demo", period_start: "2026-09-09T00:00:00.000Z", period_end: "2026-10-08T23:59:59.999Z", days: 30 },
  currency_integrity: { currencies: ["QAR"], mixed: false },
  metrics: {
    state: "available", currency: "QAR", gross_sales: 1840000, net_revenue: 1700000, orders: 22252, true_contribution: 795420, contribution_margin_pct: 43.2, settlement_variance: 8940, recoverable_margin: 27450, source: "controlled-demo-fixture", blockers: [],
    cost_coverage: { orders_total: 22252, orders_complete: 22252, pct: 100, complete: true },
    profit_bridge: [
      { key: "gross_sales", label: "Gross sales", amount: 1840000, kind: "total" },
      { key: "commission", label: "Commission", amount: 284000, kind: "deduction" },
      { key: "promotions", label: "Promotions", amount: 126000, kind: "deduction" },
      { key: "platform_fees", label: "Platform fees", amount: 42000, kind: "deduction" },
      { key: "refunds", label: "Refunds", amount: 18000, kind: "deduction" },
      { key: "product_cost", label: "COGS", amount: 517000, kind: "cost" },
      { key: "adjustments", label: "Adjustments", amount: 57580, kind: "deduction" },
      { key: "contribution", label: "True contribution", amount: 795420, kind: "result" },
    ],
    by_channel: [
      { channel: "direct-pos", gross_sales: 830000, revenue: 830000, orders: 9860, fees: 15770, discounts: 13300, product_cost: 234200, contribution: 435600, margin_pct: 52.5 },
      { channel: "talabat", gross_sales: 396000, revenue: 396000, orders: 4980, fees: 88704, discounts: 62800, product_cost: 110900, contribution: 123600, margin_pct: 31.2 },
      { channel: "snoonu", gross_sales: 284000, revenue: 284000, orders: 3412, fees: 51688, discounts: 21400, product_cost: 79500, contribution: 118100, margin_pct: 41.6 },
      { channel: "keeta", gross_sales: 187000, revenue: 187000, orders: 2310, fees: 30855, discounts: 18900, product_cost: 52400, contribution: 68800, margin_pct: 36.8 },
      { channel: "jahez", gross_sales: 143000, revenue: 143000, orders: 1690, fees: 25454, discounts: 9600, product_cost: 40000, contribution: 49300, margin_pct: 34.5 },
    ],
    by_sku: [],
    branch_performance: { state: "available", ranked: true, identified_orders: 22252, unassigned_orders: 0, blockers: [], rows: [
      ["west-bay",168200,48.6],["the-pearl",132400,45.1],["msheireb",96300,43.9],["lusail",118900,41.8],["al-wakra",74100,40.2],["al-sadd",52800,31.2],
    ].map(([branch, contribution, margin_pct]) => ({ branch, gross_sales: 0, revenue: 0, orders: 0, fees: 0, discounts: 0, product_cost: 0, contribution, margin_pct })) },
  },
  reconciliation: { state: "unallocated", finding_id: "EV-84217", conclusion: "unallocated_batch_difference", label: "Unexplained Talabat W39 variance", currency: "QAR", expected_amount: 84920, reported_amount: 82410, variance: -2510, allocation_scope: "batch", order_external_id: null, settlement_reference: "STL-TB-3921", evidence_strength: "strong", recoverability: "review_required", claims_ready_amount: null, explanation: "Commission QAR 1,320 · promo deductions QAR 640 · refund adjustment QAR 310 · unknown fees QAR 180 · other QAR 60.", blockers: [], created_at: "2026-10-08T14:20:00.000Z" },
  comparison: { state: "available", previous_period_start: "2026-08-10T00:00:00.000Z", previous_period_end: "2026-09-08T23:59:59.999Z", movements: [{ key: "contribution", label: "True contribution", current: 795420, previous: 733780, change: 61640, change_pct: 8.4, unit: "money" }], summary: "Contribution increased 8.4% versus the previous period.", blockers: [] },
  priority_decisions: { state: "available", blockers: [], items: [
    ["Review Talabat weekend promotion",7200,"EV-84302"],["Investigate Al Sadd settlement variance",4850,"EV-84217"],["Reprice 6 low-margin SKUs on Keeta",2550,"EV-84288"],
  ].map(([title, amount, reference], index) => ({ id: `demo-${index}`, rank: index + 1, title, state: "review_required", amount, currency: "QAR", evidence_strength: "strong", finding_id: String(reference), recovery_case_id: null, reference, next_safe_action: "Review the evidence and simulate the proposed action.", approval_required: true, blockers: [] })) },
  truths: { orders: truth("orders"), contract: truth("contract"), payout: truth("payout"), receipt: truth("receipt") },
  conclusion: { state: "ready_for_reconciliation", title: "Contribution is up 8.4%, but Talabat margin is slipping.", detail: "Three decisions could protect QAR 14,600 a month.", next_action: "Review the three priority decisions." }, latest_finding: null,
};

export const dashboardV2DemoModules = {
  order_automation: {
    state: "available", source_status: "controlled_demo", observed_through: "2026-10-08T14:32:00.000Z", received: 1389, live: 23, attention: 4, critical: 0, automation_rate_pct: 92.4,
    demo: { auto: 1284, manual: 68, rejected: 14, sla: 9, protected: 6840, prevented: 37,
      stages: [["Incoming order","1,389","4 platforms"],["Validation","1,386","3 failed · address"],["Availability check","1,368","18 held · SKU unavailable"],["Automation rule","1,352","68 routed to manual review"],["Accepted","1,352","1,284 auto · 68 manual"],["POS sync","1,349","3 retrying · Foodics"]],
      branches: [["West Bay","Auto","98.1%","3.8s","2","—"],["The Pearl","Auto","97.4%","4.0s","0","—"],["Lusail","Auto","95.2%","4.4s","0","Sync Keeta menu · 18 held today"],["Al Wakra","Hybrid","88.6%","21s","0","Keep hybrid · 11% orders modified"],["Msheireb","Hybrid","78.3%","38s","0","Enable auto-accept after menu sync"],["Al Sadd","Manual","41.0%","2m 51s","7","Enable auto-accept · +QAR 1,920/mo"]],
      rules: [["Auto-accept standard orders","11 of 12","38,940","99.2%","12 sec ago"],["Pause on kitchen overload","All 12","46","100%","41 min ago"],["Inventory guard","All 12","612","97.8%","3 min ago"],["High-value review","All 12","418","100%","22 min ago"],["Restricted items","3 branches","58","100%","Yesterday"],["Late-night Al Sadd cut-off","Al Sadd","—","—","Never"]] },
    orders: [
      ["S-30100","West Bay","Snoonu","synced","normal",58],["T-88137","Al Sadd","Talabat","synced","normal",99],["K-49396","Al Wakra","Keeta","accepted","normal",196],["J-11433","Msheireb","Jahez","checking stock","normal",237],["T-88359","Al Sadd","Talabat","accepted","normal",155],["T-88470","Lusail","Talabat","validating","normal",88],["S-30507","The Pearl","Snoonu","received","normal",129],
    ].map((r, i) => ({ id: `demo-order-${i}`, external_order_id: r[0], branch: r[1], channel: r[2], status: r[3], risk_level: r[4], currency: "QAR", order_total: r[5], placed_at: `2026-10-08T14:${35-i}:00.000Z` })),
    branches: [], blockers: [],
  },
  promotions: {
    state: "available", observed_through: "2026-10-08T14:32:00.000Z", counts: { total: 14, active: 14, pending_approval: 3, completed: 0 }, blockers: [],
    demo: { incremental: 28600, revenue: 231400, avg_margin: 17.2, merchant_spend: 42840, platform_spend: 31260, at_risk: 3, margin_at_risk: 9420 },
    scenarios: [
      ["Weekend 25% Off","Talabat","4 branches","25%",60,842,56400,7280,18.7,12.9,62,"Margin risk","Thu–Sat · since 12 Sep"],
      ["Free delivery over QAR 80","Snoonu","All 12","Delivery",30,1120,61200,14180,22.1,23.2,86,"Healthy","Always on · since 1 Aug"],
      ["Lunch Combo 20%","Keeta","6 branches","20%",50,634,28900,4920,19.4,17.0,74,"Watch","Sun–Thu 11–15 · since 3 Sep"],
      ["BOGO Shawarma","Talabat","Al Sadd, Lusail","BOGO",100,418,14600,-1260,12.1,-8.6,31,"Loss-making","Daily · since 20 Sep"],
      ["New customer 30%","Jahez","All 12","30%",40,296,16800,2950,20.2,17.6,71,"Watch","Ongoing · since 15 Aug"],
      ["Family Bundle 15%","Snoonu","5 branches","15%",50,388,31400,6840,22.9,21.8,88,"Healthy","Weekends · since 6 Sep"],
      ["Late night 20%","Keeta","3 branches","20%",70,212,8700,640,16.8,7.4,44,"Margin risk","Daily 22–02 · since 28 Sep"],
    ].map((r, i) => ({ id: `demo-promo-${i}`, name: r[0], platform: r[1], status: String(r[11]).toLowerCase().replaceAll(" ", "_"), inputs: { branch:r[2], discount:r[3], merchant_funding:r[4] }, results: { orders:r[5], revenue:r[6], contribution:r[7], margin_before:r[8], margin_after:r[9], health:r[10], display_status:r[11], dates:r[12] }, created_at: "2026-10-08T12:00:00.000Z", evidence_ready: true })),
  },
};

export const isDashboardV2DemoWorkspace = (workspace: unknown) => {
  const row = workspace && typeof workspace === "object" ? workspace as Record<string, unknown> : {};
  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : {};
  return metadata.demo_mode === true;
};
