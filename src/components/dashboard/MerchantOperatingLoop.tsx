import { useEffect, useMemo, useState } from "react";
import { confidenceLabel, merchantStatus } from "../../lib/merchant-language";
import { fetchWithTimeout } from "../../lib/fetch-with-timeout";

type Item = {
  id: string;
  item_type: string;
  title: string;
  detail: string;
  priority: "critical" | "high" | "medium" | "low";
  status: "open" | "assigned" | "waiting_approval" | "snoozed" | "resolved" | "dismissed";
  amount: number | null;
  currency: string | null;
  evidence_strength: string;
  copilot_prompt: string | null;
  assigned_to: string | null;
  snoozed_until: string | null;
  resolution_note: string | null;
  detected_at: string;
  resolved_at: string | null;
};
type Ledger = {
  id: string;
  category: string;
  label: string;
  amount: number;
  currency: string;
  evidence_strength: string;
  occurred_at: string;
};
type ManagerTask = {
  id: string;
  title: string;
  detail: string;
  task_type: string;
  status: string;
  priority: string;
  approval_required: boolean;
  assigned_to: string | null;
  due_at: string | null;
  created_at: string;
};
type ManagerPolicy = {
  id: string;
  policy_key: string;
  enabled: boolean;
  behavior: string;
  description: string;
  config: Record<string, unknown>;
};
type ManagerProfile = {
  operating_mode: string;
  daily_brief_enabled: boolean;
  daily_brief_hour: number;
  timezone: string;
  language: string;
};
type Experience = {
  items: Item[];
  ledger: Ledger[];
  totals: Record<string, number>;
  recent_resolved: number;
  profit_brief: {
    order_count?: number;
    verified_cost_coverage_pct?: number;
    retrieved_at?: string;
  } | null;
  settings: { automation_level: string; weekly_review_enabled: boolean; progressive_mode: boolean };
  manager: {
    available: boolean;
    setup_required: boolean;
    profile: ManagerProfile;
    policies: ManagerPolicy[];
    tasks: ManagerTask[];
  };
};
const OG = "#EF681A",
  GN = "#10B981",
  RED = "#DC2626";
export function MerchantOperatingLoop({
  mode = "hub",
  onAskCopilot,
  onRunTask,
  onContinueSetup,
  lang = "en",
}: {
  mode?: "hub" | "history";
  onAskCopilot?: (prompt: string) => void;
  onRunTask?: (prompt: string) => void;
  onContinueSetup?: () => void;
  lang?: "en" | "ar" | "fr";
}) {
  const tr = (en: string, ar: string, fr: string) => (lang === "ar" ? ar : lang === "fr" ? fr : en);
  const levels = [
    { id: "observe", label: tr("Observe", "مراقبة", "Observer"), desc: tr("Monitor only", "المراقبة فقط", "Surveiller uniquement") },
    { id: "recommend", label: tr("Recommend", "اقتراح", "Recommander"), desc: tr("Prepare safe actions", "تجهيز إجراءات آمنة", "Préparer des actions sûres") },
    { id: "approve", label: tr("Approve", "الموافقة", "Valider"), desc: tr("Wait for every approval", "انتظار موافقتك دائماً", "Attendre chaque validation") },
    { id: "auto_protect", label: tr("Auto-protect", "حماية تلقائية", "Protection automatique"), desc: tr("Act only inside active limits", "التنفيذ ضمن الحدود النشطة فقط", "Agir uniquement dans les limites actives") },
  ];
  const [data, setData] = useState<Experience | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(""),
    [filter, setFilter] = useState("active"),
    [detail, setDetail] = useState(false),
    [message, setMessage] = useState(""),
    [newTask, setNewTask] = useState("");
  const call = async (body: Record<string, string>) => {
    const response = await fetchWithTimeout("/api/channels/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: localStorage.getItem("ps_merchant_id") ?? "",
        access_code: localStorage.getItem("ps_access_code") ?? "",
        platform: "merchant_experience",
        ...body,
      }),
    }, 12_000);
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error ?? "Request failed");
    return result;
  };
  const load = async () => {
    try {
      const result = await call({ action: "get" });
      setData(result);
    } catch {
      setMessage("Your attention list could not be loaded. Refresh and try again.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
    void call({ action: "track", event_name: "today_viewed" }).catch(() => undefined);
    const refresh = window.setTimeout(() => void load(), 3000);
    const refreshAfterDelegation = () => void load();
    window.addEventListener("prizeskout:manager-task-created", refreshAfterDelegation);
    return () => {
      window.clearTimeout(refresh);
      window.removeEventListener("prizeskout:manager-task-created", refreshAfterDelegation);
    };
  }, []);
  useEffect(() => {
    if (!data || !location.hash.startsWith("#attention-")) return;
    const target = document.querySelector(location.hash);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      void call({
        action: "track",
        event_name: "attention_deep_link_opened",
        object_id: location.hash.replace("#attention-", ""),
      }).catch(() => undefined);
    }
  }, [data]);
  const update = async (item: Item, action: string, value = "") => {
    setBusy(item.id);
    setMessage("");
    try {
      await call({ action: "attention", id: item.id, attention_action: action, value });
      await load();
      setMessage(
        action === "resolve"
          ? "Marked resolved and added to Activity & Evidence."
          : action === "snooze"
            ? "Snoozed for one day."
            : action === "assign"
              ? "Assigned."
              : "Dismissed.",
      );
    } catch {
      setMessage("That change was not saved. Try again.");
    } finally {
      setBusy("");
    }
  };
  const saveLevel = async (level: string) => {
    if (!data) return;
    setBusy("settings");
    try {
      const result = await call({
        action: "settings",
        automation_level: level,
        weekly_review_enabled: String(data.settings.weekly_review_enabled),
        progressive_mode: String(data.settings.progressive_mode),
      });
      setData({ ...data, settings: result.settings });
      setMessage("Protection level saved.");
    } catch {
      setMessage("Protection level was not saved.");
    } finally {
      setBusy("");
    }
  };
  const toggleWeekly = async () => {
    if (!data) return;
    setBusy("settings");
    try {
      const result = await call({
        action: "settings",
        automation_level: data.settings.automation_level,
        weekly_review_enabled: String(!data.settings.weekly_review_enabled),
        progressive_mode: String(data.settings.progressive_mode),
      });
      setData({ ...data, settings: result.settings });
      setMessage(
        result.settings.weekly_review_enabled
          ? "Weekly in-app review enabled."
          : "Weekly in-app review paused.",
      );
    } catch {
      setMessage("Weekly review choice was not saved.");
    } finally {
      setBusy("");
    }
  };
  const saveManagerMode = async (mode: string) => {
    if (!data) return;
    setBusy("manager");
    try {
      await call({
        action: "manager_profile",
        operating_mode: mode,
        daily_brief_enabled: String(data.manager.profile.daily_brief_enabled),
        daily_brief_hour: String(data.manager.profile.daily_brief_hour),
        timezone: data.manager.profile.timezone,
        language: data.manager.profile.language,
      });
      await load();
      setMessage("Store Manager mode saved.");
    } catch {
      setMessage("Management mode was not saved. Run the Store Manager migration if needed.");
    } finally {
      setBusy("");
    }
  };
  const savePolicy = async (policy: ManagerPolicy, patch: Partial<ManagerPolicy>) => {
    setBusy(policy.id);
    try {
      await call({
        action: "manager_policy",
        policy_key: policy.policy_key,
        enabled: String(patch.enabled ?? policy.enabled),
        behavior: String(patch.behavior ?? policy.behavior),
        description: policy.description,
        approval_required: String(policy.config?.approval_required !== false),
      });
      await load();
      setMessage("Management policy saved.");
    } catch {
      setMessage("Management policy was not saved.");
    } finally {
      setBusy("");
    }
  };
  const createTask = async () => {
    const title = newTask.trim();
    if (!title) return;
    setBusy("new-task");
    try {
      await call({
        action: "manager_task_create",
        title,
        detail: "Created by the merchant for the Virtual Store Manager.",
        task_type: "store_admin",
        priority: "medium",
        approval_required: "true",
      });
      setNewTask("");
      await load();
      setMessage("Task added. It is waiting for your approval before any store change.");
    } catch {
      setMessage("The management task was not created.");
    } finally {
      setBusy("");
    }
  };
  const moveTask = async (task: ManagerTask, to: string) => {
    setBusy(task.id);
    try {
      await call({
        action: "manager_task_transition",
        id: task.id,
        to_status: to,
        actor: "Merchant",
        value:
          to === "approved"
            ? "Approved from the Store Manager dashboard."
            : "Updated from the Store Manager dashboard.",
      });
      await load();
      setMessage(
        to === "approved"
          ? "Task approved. No unsupported platform action was claimed as completed."
          : to === "completed"
            ? "Task completed and added to Activity."
          : "Task status updated.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Task status was not updated.");
    } finally {
      setBusy("");
    }
  };
  const active =
      data?.items.filter((item) =>
        ["open", "assigned", "waiting_approval", "snoozed"].includes(item.status),
      ) ?? [],
    resolved = data?.items.filter((item) => item.status === "resolved") ?? [];
  const visible =
    filter === "active" ? active : filter === "resolved" ? resolved : (data?.items ?? []);
  const urgent = active.filter((item) => ["critical", "high"].includes(item.priority)),
    moneyAtRisk = active.reduce((sum, item) => sum + (item.amount ?? 0), 0),
    currency = active.find((item) => item.currency)?.currency ?? data?.ledger[0]?.currency ?? "SAR";
  const ledgerGroups = useMemo(
    () =>
      ["recovered", "protected", "identified", "estimated", "pending"].map((category) => ({
        category,
        value: data?.totals[category] ?? 0,
      })),
    [data],
  );
  const managerTasks = data?.manager?.tasks ?? [],
    openManagerTasks = managerTasks.filter(
      (task) => !["completed", "cancelled"].includes(task.status),
    ),
    approvalTasks = openManagerTasks.filter((task) => task.status === "waiting_approval");
  if (loading)
    return (
      <div
        style={{
          padding: 20,
          border: "1px solid var(--border)",
          borderRadius: 14,
          color: "var(--muted)",
        }}
      >
        Preparing today’s merchant briefing…
      </div>
    );
  const askCopilot = (prompt: string) => {
    void call({ action: "track", event_name: "copilot_from_attention" });
    onAskCopilot?.(prompt);
  };
  const revealAttention = () => {
    const target = document.getElementById("attention-inbox");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => target?.focus({ preventScroll: true }), 350);
  };
  if (mode === "history")
    return (
      <section style={card}>
        <Header
          eyebrow="Activity & Evidence"
          title="Resolved attention items"
          sub="What was detected, who handled it, and how it was closed."
        />
        <Items items={resolved} busy={busy} history onUpdate={update} onAsk={askCopilot} />
      </section>
    );
  return (
    <section data-tour="merchant-operating-loop" style={{ ...card, gap: 20 }}>
      <Header
        eyebrow={tr("Your daily store brief", "موجز متجرك اليومي", "Votre briefing quotidien")}
        title={
          urgent.length
            ? tr(
                `${urgent.length} important item${urgent.length === 1 ? " needs" : "s need"} your attention`,
                `${urgent.length} ${urgent.length === 1 ? "عنصر مهم يحتاج" : "عناصر مهمة تحتاج"} إلى انتباهك`,
                `${urgent.length} élément${urgent.length === 1 ? " important demande" : "s importants demandent"} votre attention`,
              )
            : approvalTasks.length
              ? tr(
                  `${approvalTasks.length} management task${approvalTasks.length === 1 ? " is" : "s are"} waiting for you`,
                  `${approvalTasks.length} ${approvalTasks.length === 1 ? "مهمة إدارية تنتظر" : "مهام إدارية تنتظر"} موافقتك`,
                  `${approvalTasks.length} tâche${approvalTasks.length === 1 ? " de gestion attend" : "s de gestion attendent"} votre validation`,
                )
              : tr("Your store management queue is under control", "قائمة إدارة متجرك تحت السيطرة", "Votre file de gestion est sous contrôle")
        }
        sub={
          data?.profit_brief?.order_count != null
            ? tr(
                `PrizeSkout checked ${data.profit_brief.order_count} recent orders and organized the work that needs attention.`,
                `راجع PrizeSkout عدد ${data.profit_brief.order_count} من الطلبات الحديثة ونظّم الأعمال التي تحتاج إلى انتباهك.`,
                `PrizeSkout a vérifié ${data.profit_brief.order_count} commandes récentes et organisé les tâches à examiner.`,
              )
            : tr(
                "PrizeSkout is organizing connected products, orders, promotions, inventory and payouts.",
                "ينظّم PrizeSkout المنتجات والطلبات والعروض والمخزون والمدفوعات المتصلة.",
                "PrizeSkout organise les produits, commandes, promotions, stocks et versements connectés.",
              )
        }
      />
      {urgent.length > 0 && (
        <button
          type="button"
          onClick={revealAttention}
          style={{ ...linkButton, alignSelf: "flex-start", fontSize: 13.5 }}
        >
          {tr(
            `View the ${urgent.length} item${urgent.length === 1 ? "" : "s"} needing attention ↓`,
            `اعرض ${urgent.length} ${urgent.length === 1 ? "عنصراً يحتاج" : "عناصر تحتاج"} إلى انتباهك ↓`,
            `Voir les ${urgent.length} élément${urgent.length === 1 ? "" : "s"} à examiner ↓`,
          )}
        </button>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))",
          gap: 10,
        }}
      >
        {[
          ["Management tasks", openManagerTasks.length, "Tracked until verified", undefined],
          ["Waiting approval", approvalTasks.length, "Nothing applied yet", undefined],
          ["High priority", urgent.length, urgent.length ? `View ${urgent.length} item${urgent.length === 1 ? "" : "s"} ↓` : "Nothing urgent", urgent.length ? revealAttention : undefined],
          ["Money identified", `${currency} ${moneyAtRisk.toFixed(2)}`, "Not claimed as recovered", undefined],
        ].map(([label, value, note, onClick]) => (
          <Metric
            key={String(label)}
            label={String(label)}
            value={String(value)}
            note={String(note)}
            onClick={typeof onClick === "function" ? onClick : undefined}
          />
        ))}
      </div>

      <div id="attention-inbox" tabIndex={-1} style={{ scrollMarginTop: 18, outline: "none" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h3 style={{ margin: 0 }}>
              {tr("Items needing your attention", "عناصر تحتاج إلى انتباهك", "Éléments à examiner")}
            </h3>
            <p style={{ ...copy, margin: "4px 0 0" }}>
              {tr(
                "These are the items counted in the brief above. Review them here.",
                "هذه هي العناصر المحتسبة في الموجز أعلاه. راجعها هنا.",
                "Ce sont les éléments comptabilisés dans le briefing ci-dessus. Examinez-les ici.",
              )}
            </p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {(["active", "resolved", "all"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                style={{
                  ...smallButton,
                  background: filter === value ? OG : "var(--surface)",
                  color: filter === value ? "#fff" : "var(--muted)",
                }}
              >
                {value === "active"
                  ? tr("Active", "نشطة", "Actifs")
                  : value === "resolved"
                    ? tr("Resolved", "تم حلها", "Résolus")
                    : tr("All", "الكل", "Tous")}
              </button>
            ))}
          </div>
        </div>
        <Items items={visible} busy={busy} onUpdate={update} onAsk={askCopilot} />
      </div>

      <div style={subCard}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h3 style={{ margin: 0 }}>{tr("Management desk", "مكتب الإدارة", "Bureau de gestion")}</h3>
            <p style={{ ...copy, margin: "4px 0 0" }}>
              Tell PrizeSkout what you want handled. You will see the plan and approve any store
              changes before they happen.
            </p>
          </div>
          <Badge
            text={
              data?.manager?.available
                ? (data.manager.profile.operating_mode ?? "supervised").replaceAll("_", " ")
                : "setup required"
            }
            color={data?.manager?.available ? OG : "#B45309"}
          />
        </div>
        {data?.manager?.setup_required && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              border: "1px solid color-mix(in srgb,#F59E0B 30%,var(--border))",
              borderRadius: 9,
              color: "var(--muted)",
              fontSize: 12.5,
            }}
          >
            Store Manager setup is not finished yet. Store monitoring is still working.
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <input
            disabled={!data?.manager?.available}
            value={newTask}
            onChange={(event) => setNewTask(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void createTask();
            }}
            placeholder="Example: prepare the new supplier products as drafts"
            style={{
              flex: "1 1 300px",
              minWidth: 0,
              border: "1px solid var(--border)",
              borderRadius: 9,
              padding: "10px 12px",
              background: "var(--surface)",
              color: "var(--text)",
              fontFamily: "inherit",
            }}
          />
          <button
            disabled={!data?.manager?.available || busy === "new-task" || !newTask.trim()}
            onClick={() => void createTask()}
            style={{ ...smallButton, color: "#fff", background: OG, borderColor: OG }}
          >
            Delegate task
          </button>
        </div>
        <ManagerTasks
          tasks={openManagerTasks}
          busy={busy}
          onMove={moveTask}
          onRun={onRunTask ?? onAskCopilot}
        />
      </div>

      {(data?.profit_brief?.verified_cost_coverage_pct ?? 100) < 80 && (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: 11,
            border: "1px solid color-mix(in srgb,#F59E0B 30%,var(--border))",
            background: "color-mix(in srgb,#F59E0B 7%,var(--surface))",
          }}
        >
          <strong>{tr("Finish your first-value setup", "أكمل إعداد القيمة الأولى", "Terminer la configuration initiale")}</strong>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>
            ✓ Zid connected · ✓ Orders checked · Next: confirm product costs. Evidence is{" "}
            {Math.round(data?.profit_brief?.verified_cost_coverage_pct ?? 0)}%.
          </div>
          {onContinueSetup && (
            <button
              type="button"
              onClick={onContinueSetup}
              style={linkButton}
            >
              {tr("Review products needing cost data →", "راجع المنتجات التي تحتاج إلى بيانات التكلفة ←", "Examiner les produits sans coût vérifié →")}
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setDetail((value) => !value)}
        style={{ ...linkButton, alignSelf: "flex-start" }}
      >
        {detail ? "Hide weekly review and controls ↑" : "Weekly review, value and automation →"}
      </button>
      {detail && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))",
            gap: 14,
          }}
        >
          <div style={subCard}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <h3 style={{ margin: "0 0 10px" }}>{tr("Weekly protection review", "مراجعة الحماية الأسبوعية", "Revue hebdomadaire de protection")}</h3>
              <button
                onClick={() => {
                  void call({ action: "track", event_name: "weekly_review_opened" });
                  void toggleWeekly();
                }}
                style={smallButton}
              >
                {data?.settings.weekly_review_enabled ? "Enabled" : "Paused"}
              </button>
            </div>
            <p style={copy}>
              This week PrizeSkout resolved {data?.recent_resolved ?? 0} item
              {data?.recent_resolved === 1 ? "" : "s"}; {active.length} remain open. The value below
              remains separated by evidence state.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {ledgerGroups.map((group) => (
                <Metric
                  key={group.category}
                  label={group.category}
                  value={`${currency} ${group.value.toFixed(2)}`}
                  note={
                    group.category === "identified" ? "Detected, not recovered" : "Evidence ledger"
                  }
                />
              ))}
            </div>
          </div>
          <div style={subCard}>
            <h3 style={{ margin: "0 0 6px" }}>{tr("How much should PrizeSkout do?", "ما مقدار العمل الذي ينفذه PrizeSkout؟", "Jusqu’où PrizeSkout doit-il intervenir ?")}</h3>
            <p style={copy}>
              Increase automation only as trust grows. Active Margin Policy Engine limits still
              apply.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {levels.map((level) => (
                <button
                  key={level.id}
                  disabled={busy === "settings"}
                  onClick={() => void saveLevel(level.id)}
                  style={{
                    padding: "10px 12px",
                    textAlign: "left",
                    borderRadius: 9,
                    border: `1px solid ${data?.settings.automation_level === level.id ? OG : "var(--border)"}`,
                    background:
                      data?.settings.automation_level === level.id
                        ? `color-mix(in srgb,${OG} 7%,var(--surface))`
                        : "var(--surface)",
                    color: "var(--text)",
                    fontFamily: "inherit",
                    cursor: "pointer",
                  }}
                >
                  <strong>{level.label}</strong>
                  <span style={{ marginLeft: 8, color: "var(--muted)", fontSize: 12 }}>
                    {level.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div style={subCard}>
            <h3 style={{ margin: "0 0 6px" }}>{tr("Store Manager mode", "وضع مدير المتجر", "Mode du gestionnaire de boutique")}</h3>
            <p style={copy}>
              Choose how much the manager can do. Money-related and permanent changes still follow
              your approval rules.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {[
                ["observe", "Watch and report"],
                ["assist", "Prepare work for me"],
                ["supervised", "Make changes after I approve"],
                ["policy_controlled", "Work within my saved rules"],
                ["exception_only", "Handle routine work; ask me when unsure"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  disabled={busy === "manager"}
                  onClick={() => void saveManagerMode(id)}
                  style={{
                    ...smallButton,
                    textAlign: "left",
                    borderColor:
                      data?.manager?.profile.operating_mode === id ? OG : "var(--border)",
                    color: data?.manager?.profile.operating_mode === id ? OG : "var(--text)",
                  }}
                >
                  <strong>{label}</strong>
                </button>
              ))}
            </div>
          </div>
          <div style={subCard}>
            <h3 style={{ margin: "0 0 6px" }}>{tr("Standing management policies", "سياسات الإدارة الدائمة", "Politiques de gestion permanentes")}</h3>
            <p style={copy}>
              Choose what PrizeSkout should watch, suggest, prepare, or handle automatically.
              Automatic work only happens when your connected sales channel supports it.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {(data?.manager?.policies ?? []).map((policy) => (
                <div
                  key={policy.id}
                  style={{ padding: 10, border: "1px solid var(--border)", borderRadius: 9 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <strong>{policy.policy_key.replaceAll("_", " ")}</strong>
                    <input
                      type="checkbox"
                      checked={policy.enabled}
                      onChange={(event) =>
                        void savePolicy(policy, { enabled: event.target.checked })
                      }
                    />
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", margin: "4px 0 7px" }}>
                    {policy.description}
                  </div>
                  <select
                    value={policy.behavior}
                    disabled={!policy.enabled || busy === policy.id}
                    onChange={(event) => void savePolicy(policy, { behavior: event.target.value })}
                    style={{
                      width: "100%",
                      padding: "7px 8px",
                      border: "1px solid var(--border)",
                      borderRadius: 7,
                      background: "var(--surface)",
                      color: "var(--text)",
                    }}
                  >
                    <option value="observe">Observe only</option>
                    <option value="recommend">Recommend</option>
                    <option value="prepare">Prepare for approval</option>
                    <option value="auto_execute">Auto-execute when safely supported</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div
        aria-live="polite"
        style={{
          minHeight: 18,
          fontSize: 12,
          color: message.includes("not") || message.includes("could not") ? RED : "var(--muted)",
        }}
      >
        {message}
      </div>
    </section>
  );
}

function ManagerTasks({
  tasks,
  busy,
  onMove,
  onRun,
}: {
  tasks: ManagerTask[];
  busy: string;
  onMove: (task: ManagerTask, to: string) => void;
  onRun?: (prompt: string) => void;
}) {
  if (!tasks.length)
    return (
      <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--muted)" }}>
        No delegated management work is open.
      </div>
    );
  return (
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 7 }}>
      {tasks.slice(0, 8).map((task) => (
        <div
          key={task.id}
          style={{
            padding: "10px 11px",
            border: "1px solid var(--border)",
            borderRadius: 9,
            background: "var(--surface)",
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <strong style={{ fontSize: 13 }}>{task.title}</strong>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>
              {merchantStatus(task.status)} · {task.priority}
              {task.due_at ? ` · due ${new Date(task.due_at).toLocaleDateString()}` : ""}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {task.status === "waiting_approval" && (
              <button
                disabled={busy === task.id}
                onClick={() => onMove(task, "approved")}
                style={{ ...smallButton, color: GN }}
              >
                Approve
              </button>
            )}
            {["detected", "needs_attention"].includes(task.status) && (
              <button
                disabled={busy === task.id}
                onClick={() => {
                  if (onRun) {
                    onRun(task.title);
                    onMove(task, "prepared");
                  } else {
                    onMove(task, "investigating");
                  }
                }}
                style={smallButton}
              >
                {onRun ? "Run task" : "Start review"}
              </button>
            )}
            {["investigating", "prepared"].includes(task.status) &&
              !task.approval_required && (
                <button
                  disabled={busy === task.id}
                  onClick={() => onMove(task, "completed")}
                  style={{ ...smallButton, color: GN }}
                >
                  Mark complete
                </button>
              )}
            {!["executing", "verifying"].includes(task.status) && (
              <button
                disabled={busy === task.id}
                onClick={() => onMove(task, "cancelled")}
                style={smallButton}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Items({
  items,
  busy,
  history = false,
  onUpdate,
  onAsk,
}: {
  items: Item[];
  busy: string;
  history?: boolean;
  onUpdate: (item: Item, action: string, value?: string) => void;
  onAsk?: (prompt: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const [itemDecision, setItemDecision] = useState<{
    id: string;
    action: "resolve" | "dismiss";
  } | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const beginDecision = (item: Item, action: "resolve" | "dismiss") => {
    setItemDecision({ id: item.id, action });
    setDecisionNote(
      action === "resolve" ? "Issue corrected" : "Not relevant to my business",
    );
  };
  if (!items.length)
    return (
      <div
        style={{
          marginTop: 12,
          padding: 18,
          border: "1px solid var(--border)",
          borderRadius: 11,
          color: "var(--muted)",
        }}
      >
        Nothing here right now.
      </div>
    );
  return (
    <div
      style={{
        marginTop: 12,
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {items.slice(0, showAll ? items.length : 3).map((item) => (
        <article
          id={`attention-${item.id}`}
          key={item.id}
          style={{
            padding: "14px 16px",
            borderTop: "1px solid var(--border)",
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr)",
            gap: 12,
          }}
        >
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <strong>{item.title}</strong>
              <Badge
                text={item.priority}
                color={
                  item.priority === "critical" || item.priority === "high"
                    ? RED
                    : item.priority === "medium"
                      ? "#B45309"
                      : GN
                }
              />
              <Badge text={confidenceLabel(item.evidence_strength)} color="var(--muted)" />
              <Badge text={merchantStatus(item.status)} color="var(--muted)" />
            </div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4, lineHeight: 1.5 }}>
              {item.detail}
            </div>
            {history && (
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 5 }}>
                {item.resolution_note ?? "Resolved"} ·{" "}
                {item.resolved_at ? new Date(item.resolved_at).toLocaleString() : ""}
              </div>
            )}
          </div>
          {!history && (
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              {onAsk && item.copilot_prompt && (
                <button onClick={() => onAsk(item.copilot_prompt!)} style={smallButton}>
                  Ask Copilot
                </button>
              )}
              <button
                disabled={busy === item.id}
                onClick={() => beginDecision(item, "resolve")}
                style={{ ...smallButton, color: GN }}
              >
                Resolve
              </button>
              <details style={{ position: "relative" }}>
                <summary style={{ ...smallButton, listStyle: "none", cursor: "pointer" }}>More</summary>
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                    marginTop: 7,
                    padding: 8,
                    border: "1px solid var(--border)",
                    borderRadius: 9,
                    background: "var(--surface2)",
                  }}
                >
                  <button
                    onClick={() => void navigator.clipboard.writeText(`${location.origin}${location.pathname}#attention-${item.id}`)}
                    style={smallButton}
                  >
                    Copy link
                  </button>
                  <button disabled={busy === item.id} onClick={() => onUpdate(item, "assign", "Merchant owner")} style={smallButton}>
                    Assign
                  </button>
                  <button disabled={busy === item.id} onClick={() => onUpdate(item, "request_approval", "Finance approver")} style={smallButton}>
                    Request approval
                  </button>
                  <button disabled={busy === item.id} onClick={() => onUpdate(item, "snooze", "1")} style={smallButton}>
                    Snooze
                  </button>
                  <button
                    disabled={busy === item.id}
                    onClick={() => beginDecision(item, "dismiss")}
                    style={smallButton}
                  >
                    Dismiss
                  </button>
                </div>
              </details>
            </div>
          )}
          {!history && itemDecision?.id === item.id && (
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 12,
                background: "var(--surface2)",
                display: "grid",
                gap: 9,
              }}
            >
              <div>
                <strong style={{ fontSize: 13.5 }}>
                  {itemDecision.action === "resolve"
                    ? "How was this resolved?"
                    : "Why should this be dismissed?"}
                </strong>
                <div style={{ marginTop: 3, fontSize: 11.5, color: "var(--muted)" }}>
                  This note will be saved in Activity as part of the decision record.
                </div>
              </div>
              <select
                value={decisionNote}
                onChange={(event) => setDecisionNote(event.target.value)}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "9px 10px",
                  background: "var(--surface)",
                  color: "var(--text)",
                  fontFamily: "inherit",
                }}
              >
                {(itemDecision.action === "resolve"
                  ? ["Issue corrected", "Reviewed, no further action needed", "Handled outside PrizeSkout"]
                  : ["Not relevant to my business", "Duplicate finding", "Incorrect finding"]
                ).map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <div style={{ display: "flex", gap: 7, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setItemDecision(null)}
                  style={smallButton}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy === item.id || !decisionNote.trim()}
                  onClick={() => {
                    onUpdate(item, itemDecision.action, decisionNote.trim());
                    setItemDecision(null);
                  }}
                  style={{ ...smallButton, background: GN, borderColor: GN, color: "white" }}
                >
                  {itemDecision.action === "resolve" ? "Mark resolved" : "Dismiss item"}
                </button>
              </div>
            </div>
          )}
        </article>
      ))}
      {items.length > 3 && (
        <button
          type="button"
          onClick={() => setShowAll((current) => !current)}
          style={{ ...smallButton, margin: 12 }}
        >
          {showAll ? "Show fewer" : `View all ${items.length}`}
        </button>
      )}
    </div>
  );
}
function Header({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 900,
          color: OG,
          textTransform: "uppercase",
          letterSpacing: ".08em",
        }}
      >
        {eyebrow}
      </div>
      <h2 style={{ margin: "5px 0", fontSize: 25 }}>{title}</h2>
      <p style={{ ...copy, margin: 0 }}>{sub}</p>
    </div>
  );
}
function Metric({ label, value, note, onClick }: { label: string; value: string; note: string; onClick?: () => void }) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onClick(); } } : undefined}
      style={{
        padding: "12px 13px",
        border: "1px solid var(--border)",
        borderRadius: 10,
        background: "var(--surface2)",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          textTransform: "uppercase",
          fontWeight: 800,
          color: "var(--muted)",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 21, fontWeight: 850, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{note}</div>
    </div>
  );
}
function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span
      style={{
        fontSize: 9.5,
        fontWeight: 850,
        textTransform: "uppercase",
        color,
        border: "1px solid var(--border)",
        borderRadius: 999,
        padding: "3px 7px",
      }}
    >
      {text}
    </span>
  );
}
const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 18,
  boxShadow: "var(--shadow)",
  padding: "24px 26px",
  display: "flex",
  flexDirection: "column",
};
const subCard: React.CSSProperties = {
  padding: 16,
  border: "1px solid var(--border)",
  borderRadius: 12,
  background: "var(--surface2)",
};
const copy: React.CSSProperties = { fontSize: 13, color: "var(--muted)", lineHeight: 1.55 };
const smallButton: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "7px 9px",
  background: "var(--surface)",
  color: "var(--text)",
  fontFamily: "inherit",
  fontSize: 11.5,
  fontWeight: 750,
  cursor: "pointer",
};
const linkButton: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: OG,
  padding: "8px 0 0",
  fontFamily: "inherit",
  fontWeight: 850,
  cursor: "pointer",
};
