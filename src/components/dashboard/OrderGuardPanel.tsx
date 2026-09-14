import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BellRing, Check, ChefHat, CircleAlert, Clock3, Copy, Radio, Store } from "lucide-react";

type Order = {
  id: string;
  external_order_id: string;
  external_branch_id: string | null;
  channel: string | null;
  status: string;
  risk_level: string;
  placed_at: string;
};
type Guard = {
  source: { external_business_id: string; status: string; last_event_at: string | null } | null;
  settings: {
    acknowledgement_seconds: number;
    manager_escalation_seconds: number;
    critical_escalation_seconds: number;
  };
  orders: Order[];
  summary: { live: number; attention: number; critical: number; protected_today: number };
};

const riskColor: Record<string, string> = {
  critical: "#DC2626",
  manager: "#EA580C",
  attention: "#D97706",
  watching: "#2563EB",
  cleared: "#059669",
};

export function OrderGuardPanel({
  request,
}: {
  request: (body: Record<string, string>) => Promise<Record<string, unknown>>;
}) {
  const [guard, setGuard] = useState<Guard | null>(null);
  const [businessId, setBusinessId] = useState("");
  const [setup, setSetup] = useState<{ webhook_url: string; webhook_token: string } | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const knownRisks = useRef(new Set<string>());
  const requestRef = useRef(request);
  requestRef.current = request;

  const load = useCallback(
    async (quiet = false) => {
      try {
        const result = await requestRef.current({ platform: "order_guard", action: "get" });
        const next = result.guard as Guard;
        const newlyUrgent = next.orders.filter(
          (order) =>
            ["attention", "manager", "critical"].includes(order.risk_level) &&
            !knownRisks.current.has(`${order.id}:${order.risk_level}`),
        );
        if (alertsEnabled && newlyUrgent.length && knownRisks.current.size)
          alertDevice(newlyUrgent[0]);
        knownRisks.current = new Set(next.orders.map((order) => `${order.id}:${order.risk_level}`));
        setGuard(next);
        setError("");
      } catch (caught) {
        if (!quiet)
          setError(caught instanceof Error ? caught.message : "Order Guard could not be loaded.");
      }
    },
    [alertsEnabled],
  );

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 15_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const liveOrders = useMemo(
    () =>
      guard?.orders.filter(
        (order) => !["ready", "completed", "cancelled", "unable_to_fulfil"].includes(order.status),
      ) ?? [],
    [guard],
  );

  const provision = async () => {
    if (!businessId.trim()) return setError("Enter the UrbanPiper business ID.");
    setBusy("setup");
    try {
      const result = await requestRef.current({
        platform: "order_guard",
        action: "provision",
        external_business_id: businessId.trim(),
      });
      setSetup({
        webhook_url: String(result.webhook_url),
        webhook_token: String(result.webhook_token),
      });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Setup failed.");
    } finally {
      setBusy("");
    }
  };

  const act = async (order: Order, action: string) => {
    setBusy(order.id + action);
    try {
      await requestRef.current({
        platform: "order_guard",
        action: "order_action",
        id: order.id,
        order_action: action,
        actor: "Branch team",
      });
      await load(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The order could not be updated.");
    } finally {
      setBusy("");
    }
  };

  const enableAlerts = async () => {
    if ("Notification" in window && Notification.permission === "default")
      await Notification.requestPermission();
    setAlertsEnabled(true);
    playTone();
  };

  return (
    <section className="ps-order-guard" aria-labelledby="order-guard-title">
      <div className="ps-order-guard__head">
        <div>
          <div className="ps-order-guard__eyebrow">
            <Radio size={14} /> LIVE ORDER PROTECTION
          </div>
          <h3 id="order-guard-title">Order Guard</h3>
          <p>
            Catch accepted orders that the branch has not acted on—before the customer is left
            waiting.
          </p>
        </div>
        {guard?.source && (
          <button type="button" className="ps-order-guard__alert" onClick={enableAlerts}>
            <BellRing size={16} /> {alertsEnabled ? "Device alerts on" : "Enable device alerts"}
          </button>
        )}
      </div>

      {error && (
        <div className="ps-order-guard__error" role="alert">
          <CircleAlert size={17} /> {error}
        </div>
      )}

      {!guard?.source ? (
        <div className="ps-order-guard__setup">
          <div>
            <strong>Connect UrbanPiper Order Relay</strong>
            <span>
              One business ID activates sensible defaults: branch alert at 60s, manager escalation
              at 2m, critical at 3m.
            </span>
          </div>
          <input
            aria-label="UrbanPiper business ID"
            value={businessId}
            onChange={(event) => setBusinessId(event.target.value)}
            placeholder="UrbanPiper business ID"
          />
          <button type="button" onClick={provision} disabled={busy === "setup"}>
            {busy === "setup" ? "Activating…" : "Activate Order Guard"}
          </button>
        </div>
      ) : (
        <>
          <div className="ps-order-guard__metrics">
            <Metric label="Live orders" value={guard.summary.live} tone="#2563EB" />
            <Metric label="Need attention" value={guard.summary.attention} tone="#D97706" />
            <Metric label="Critical" value={guard.summary.critical} tone="#DC2626" />
            <Metric label="Protected today" value={guard.summary.protected_today} tone="#059669" />
          </div>
          <div className="ps-order-guard__status">
            <span>
              <i />{" "}
              {guard.source.last_event_at
                ? "UrbanPiper relay active"
                : "UrbanPiper relay configured"}
            </span>
            <span>Business {guard.source.external_business_id}</span>
            <span>
              {guard.source.last_event_at
                ? `Last event ${relativeTime(guard.source.last_event_at)}`
                : "Waiting for the first order"}
            </span>
            <span>
              PrizeSkout monitoring · outbound UrbanPiper status sync requires partner API access
            </span>
          </div>
          {liveOrders.length ? (
            <div className="ps-order-guard__orders" aria-live="polite">
              {liveOrders.map((order) => (
                <OrderRow key={order.id} order={order} busy={busy} onAct={act} />
              ))}
            </div>
          ) : (
            <div className="ps-order-guard__empty">
              <Check size={22} />
              <div>
                <strong>All live orders are accounted for</strong>
                <span>New UrbanPiper orders will appear here automatically.</span>
              </div>
            </div>
          )}
        </>
      )}

      {setup && <SetupCredential setup={setup} />}
    </section>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong style={{ color: tone }}>{value}</strong>
    </div>
  );
}

function OrderRow({
  order,
  busy,
  onAct,
}: {
  order: Order;
  busy: string;
  onAct: (order: Order, action: string) => void;
}) {
  const waiting = Math.max(0, Math.floor((Date.now() - Date.parse(order.placed_at)) / 60_000));
  return (
    <article className={`ps-order-guard__order is-${order.risk_level}`}>
      <div className="ps-order-guard__identity">
        <span className="ps-order-guard__risk" style={{ color: riskColor[order.risk_level] }}>
          {order.risk_level === "watching"
            ? "Watching"
            : order.risk_level.replace("manager", "Manager alerted")}
        </span>
        <strong>Order {order.external_order_id}</strong>
        <span>
          <Store size={14} /> {order.external_branch_id || "Unassigned branch"} ·{" "}
          {order.channel || "Online"}
        </span>
      </div>
      <div className="ps-order-guard__timer">
        <Clock3 size={17} />
        <strong>{waiting}m</strong>
        <span>since received</span>
      </div>
      <div className="ps-order-guard__actions">
        {order.status === "watching" && (
          <button disabled={busy.startsWith(order.id)} onClick={() => onAct(order, "acknowledge")}>
            <Check size={16} /> Kitchen has it
          </button>
        )}
        {["watching", "acknowledged"].includes(order.status) && (
          <button disabled={busy.startsWith(order.id)} onClick={() => onAct(order, "preparing")}>
            <ChefHat size={16} /> Preparing
          </button>
        )}
        <button
          disabled={busy.startsWith(order.id)}
          onClick={() => onAct(order, "ready")}
          className="secondary"
        >
          Track ready here
        </button>
        <button
          disabled={busy.startsWith(order.id)}
          onClick={() => onAct(order, "unable")}
          className="quiet"
        >
          Unable to fulfil
        </button>
      </div>
    </article>
  );
}

function SetupCredential({ setup }: { setup: { webhook_url: string; webhook_token: string } }) {
  const webhookSetup = JSON.stringify(
    { url: setup.webhook_url, headers: { x_api_token: setup.webhook_token } },
    null,
    2,
  );
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(webhookSetup);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="ps-order-guard__credential" role="status">
      <div>
        <strong>UrbanPiper webhook setup ready</strong>
        <span>
          Use this for both order_placed and order_status_update. The token is shown once.
        </span>
      </div>
      <code>{webhookSetup}</code>
      <button type="button" onClick={copy}>
        <Copy size={15} /> {copied ? "Copied" : "Copy setup"}
      </button>
    </div>
  );
}

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 1000));
  return seconds < 60
    ? `${seconds}s ago`
    : seconds < 3600
      ? `${Math.floor(seconds / 60)}m ago`
      : `${Math.floor(seconds / 3600)}h ago`;
}

function playTone() {
  try {
    const audio = new AudioContext();
    const oscillator = audio.createOscillator();
    oscillator.connect(audio.destination);
    oscillator.frequency.value = 880;
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.16);
  } catch {
    /* device audio is optional */
  }
}
function alertDevice(order: Order) {
  playTone();
  if ("Notification" in window && Notification.permission === "granted")
    new Notification("Order needs attention", {
      body: `${order.external_branch_id || "Branch"} has not progressed order ${order.external_order_id}.`,
    });
}
