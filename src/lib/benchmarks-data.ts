export type BenchmarksMetric = {
  id: string;
  slug: string;
  label: string;
  value: string;
  value_color: string | null;
  footer_text: string | null;
  footer_color: string | null;
  position: number;
};

export type MarketBenchmarkRow = {
  id: string;
  metric: string;
  you: number;
  you_display: string;
  market_avg: number;
  market_avg_display: string;
  top: number;
  top_display: string;
  position: number;
};

export type ModelKnowledgeRow = {
  id: string;
  body: string;
  position: number;
};

export type ModelMaturityRow = {
  id: string;
  kind: "point" | "stat";
  month_label: string | null;
  accuracy: number | null;
  stat_label: string | null;
  stat_value: string | null;
  stat_color: string | null;
  stat_sub: string | null;
  position: number;
};

export type SwitchingCostRow = {
  id: string;
  title: string;
  body: string;
};

export type NetworkValueRow = {
  id: string;
  title: string;
  body: string;
};

export type BenchmarksData = {
  metrics: BenchmarksMetric[];
  benchmarks: MarketBenchmarkRow[];
  knowledge: ModelKnowledgeRow[];
  maturity: ModelMaturityRow[];
  switchingCost: SwitchingCostRow | null;
  networkValue: NetworkValueRow | null;
};
