// First-run checklist that walks new users through the three actions that
// turn an empty dashboard into a useful one:
//   1. Save the URL of one competitor product to track.
//   2. Run a live scrape on that product so the system has real data.
//   3. Generate an AI read of the overview page.
//
// Completion is detected from real signals (rows in Cloud), so the checklist
// stays accurate even if the user does these from the Competitors tab or the
// AI Insights card. A localStorage flag lets the user dismiss the card once
// they're past it; it never reappears unless they reset onboarding.

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Check, Circle, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const DISMISS_KEY = "ps:onboarding:dismissed";

type Status = "todo" | "doing" | "done";

type StepKey = "url" | "scrape" | "insight";

type StepDef = {
  key: StepKey;
  title: string;
  body: string;
  cta: string;
  href: string;
};

const STEPS: StepDef[] = [
  {
    key: "url",
    title: "Add your first competitor product",
    body: "Save a product URL from one competitor. Carrefour, Lulu, Talabat, anything you sell against.",
    cta: "Open Competitors",
    href: "/dashboard/competitors",
  },
  {
    key: "scrape",
    title: "Run your first live scrape",
    body: "Pull a real price from the URL you saved. Takes about ten seconds.",
    cta: "Trigger a scrape",
    href: "/dashboard/competitors",
  },
  {
    key: "insight",
    title: "Generate your first AI read",
    body: "Let the model summarise what just landed and recommend a move.",
    cta: "Go to insights",
    href: "/dashboard",
  },
];

function useOnboardingStatus() {
  return useQuery({
    queryKey: ["onboarding-status"],
    staleTime: 30_000,
    queryFn: async () => {
      const [urlRes, scrapeRes, insightRes] = await Promise.all([
        supabase
          .from("competitor_product_urls")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("competitor_scrapes")
          .select("id", { count: "exact", head: true })
          .eq("status", "success"),
        supabase
          .from("ai_insights")
          .select("id", { count: "exact", head: true }),
      ]);

      return {
        url: (urlRes.count ?? 0) > 0,
        scrape: (scrapeRes.count ?? 0) > 0,
        insight: (insightRes.count ?? 0) > 0,
      };
    },
  });
}

export function OnboardingChecklist() {
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const { data, isLoading } = useOnboardingStatus();

  // Read the dismiss flag on mount (SSR-safe).
  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  // Refresh signals whenever the tab regains focus, so completing a step in
  // another tab updates the checklist as soon as the user comes back.
  useEffect(() => {
    const onFocus = () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [queryClient]);

  if (dismissed === null) return null; // wait for hydration
  if (dismissed) return null;
  if (isLoading || !data) return null;

  const allDone = data.url && data.scrape && data.insight;
  if (allDone) return null;

  const statuses: Record<StepKey, Status> = {
    url: data.url ? "done" : "doing",
    scrape: data.scrape ? "done" : data.url ? "doing" : "todo",
    insight: data.insight ? "done" : data.scrape ? "doing" : "todo",
  };

  const completed = [data.url, data.scrape, data.insight].filter(Boolean).length;
  const pct = Math.round((completed / STEPS.length) * 100);

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  return (
    <div
      style={{
        position: "relative",
        background: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 14,
        padding: "20px 22px",
        boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
      }}
    >
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss onboarding checklist"
        title="Hide this card"
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          width: 26,
          height: 26,
          borderRadius: 6,
          border: "none",
          background: "transparent",
          color: "#9A9A9A",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#F5F4F1";
          e.currentTarget.style.color = "#1A1A18";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "#9A9A9A";
        }}
      >
        <X size={14} aria-hidden="true" />
      </button>

      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h3
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "#1A1A18",
            margin: 0,
          }}
        >
          Get your first signal in three steps
        </h3>
        <span style={{ fontSize: 12, color: "#6B6B6B", fontVariantNumeric: "tabular-nums" }}>
          {completed} of {STEPS.length} done
        </span>
      </div>
      <p
        style={{
          margin: "6px 0 16px",
          fontSize: 13,
          color: "#6B6B6B",
          lineHeight: 1.5,
          maxWidth: 560,
        }}
      >
        The dashboard fills in once we have something to track. Take five minutes now and you'll
        have live competitor data, a price recommendation, and an AI brief by the time you're done.
      </p>

      {/* Progress bar */}
      <div
        aria-hidden
        style={{
          height: 4,
          background: "#F5F4F1",
          borderRadius: 999,
          overflow: "hidden",
          marginBottom: 18,
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: "linear-gradient(90deg, #EA580C, #FB923C)",
            transition: "width 0.4s ease-out",
          }}
        />
      </div>

      <ol
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {STEPS.map((step, idx) => {
          const status = statuses[step.key];
          const isDone = status === "done";
          const isDoing = status === "doing";
          return (
            <li
              key={step.key}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 10,
                background: isDoing ? "#FFF7ED" : "#FAFAF9",
                border: `1px solid ${isDoing ? "#FED7AA" : "#EDEAE3"}`,
              }}
            >
              <span
                aria-hidden
                style={{
                  flexShrink: 0,
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isDone ? "#22C55E" : isDoing ? "#EA580C" : "#FFFFFF",
                  border: isDone || isDoing ? "none" : "1px solid #D4D0C8",
                  color: isDone || isDoing ? "#FFFFFF" : "#9A9A9A",
                }}
              >
                {isDone ? (
                  <Check size={14} strokeWidth={3} />
                ) : isDoing ? (
                  <span style={{ fontSize: 11, fontWeight: 700 }}>{idx + 1}</span>
                ) : (
                  <Circle size={10} strokeWidth={2} />
                )}
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: isDone ? "#6B6B6B" : "#1A1A18",
                    textDecoration: isDone ? "line-through" : "none",
                    marginBottom: 2,
                  }}
                >
                  {step.title}
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: "#6B6B6B",
                    lineHeight: 1.45,
                  }}
                >
                  {step.body}
                </div>
              </div>

              {!isDone && (
                <Link
                  to={step.href}
                  style={{
                    flexShrink: 0,
                    alignSelf: "center",
                    fontSize: 12,
                    fontWeight: 600,
                    color: isDoing ? "#FFFFFF" : "#1A1A18",
                    background: isDoing ? "#EA580C" : "#FFFFFF",
                    border: `1px solid ${isDoing ? "#EA580C" : "#E5E2DB"}`,
                    padding: "7px 12px",
                    borderRadius: 8,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (isDoing) {
                      e.currentTarget.style.background = "#C2410C";
                    } else {
                      e.currentTarget.style.background = "#F5F4F1";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isDoing ? "#EA580C" : "#FFFFFF";
                  }}
                >
                  {step.cta}
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      <p
        style={{
          margin: "14px 0 0",
          fontSize: 11.5,
          color: "#9A9A9A",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Loader2 size={11} aria-hidden="true" />
        This card updates on its own as you complete each step.
      </p>
    </div>
  );
}
