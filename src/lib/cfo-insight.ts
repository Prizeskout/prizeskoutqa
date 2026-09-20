export type CfoConfidence = "high" | "medium" | "low" | "insufficient";

export type CfoInsight = {
  conclusion: string;
  impact: {
    label: string;
    amount: number | null;
    currency: string | null;
  };
  drivers: Array<{
    label: string;
    amount: number | null;
    direction: "positive" | "negative" | "neutral" | "unknown";
    evidence_refs: string[];
  }>;
  confidence: CfoConfidence;
  evidence_used: Array<{
    label: string;
    source: string;
    period: string | null;
    freshness: string | null;
  }>;
  limitations: string[];
  actions: Array<{
    label: string;
    prompt: string;
    kind: "ask" | "review" | "upload";
  }>;
};
