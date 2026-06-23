// Trilingual recommendation reason dictionary.
//
// Engine emits a stable reason_code + reason_params (numbers/names).
// The frontend calls localizeReason() — pure dictionary lookup, zero API cost.
// Audit log stores the English fallback; translations are display-only.
//
// Proper nouns (competitor names, product titles) are interpolated as-is per
// requirement 8 — they appear in reason_params and are never translated.

import type { Locale } from "@/lib/i18n";

export type ReasonCode =
  | "undercut_competitor"
  | "hold_margin_floor"
  | "no_competitor_data"
  | "no_margin_inputs"
  | "competitor_gap"
  | "already_at_median"
  | "cost_floor_applied"
  | "all_outliers"
  | "no_scrapes"
  | "rule_adjusted";

export type ReasonParams = {
  competitor_min?: number | string;
  undercut_by?: number | string;
  margin_pct?: number | string;
  margin_floor?: number | string;
  competitor_count?: number | string;
  competitor_list?: string;   // proper noun — not translated
  median?: number | string;
  min?: number | string;
  gap_pct?: number | string;
  unit_delta_pct?: number | string;
  floor_pct?: number | string;
  price?: number | string;
  rules?: string;             // rule text — not translated
  fallback?: string;          // English sentence for audit/fallback
  [k: string]: string | number | undefined;
};

type ReasonFn = (p: ReasonParams) => string;

const REASONS: Record<Locale, Partial<Record<ReasonCode, ReasonFn>>> = {
  en: {
    undercut_competitor: (p) =>
      `Undercut cheapest competitor (${p.competitor_min}) by ${p.undercut_by} unit while respecting the ${p.margin_pct}% margin floor.`,
    hold_margin_floor: (p) =>
      `Held the ${p.margin_pct}% margin floor (${p.margin_floor}); undercutting the cheapest competitor (${p.competitor_min}) would push margin below target.`,
    no_competitor_data: (p) =>
      `No competitor price available — used margin floor (${p.margin_floor}) at ${p.margin_pct}% target.`,
    no_margin_inputs: (p) =>
      `No margin inputs configured — undercut cheapest competitor (${p.competitor_min}) by ${p.undercut_by} unit. Add margin_inputs for safer recommendations.`,
    competitor_gap: (p) => {
      const n = Number(p.competitor_count);
      return (
        `${n} competitor${n === 1 ? "" : "s"} (${p.competitor_list}) median QAR ${p.median}, ` +
        `lowest QAR ${p.min}. You're ${p.gap_pct}% above median. ` +
        `Matching the median should lift units ~${p.unit_delta_pct}% based on category elasticity.`
      );
    },
    already_at_median: (p) =>
      `Already at or below median (gap ${p.gap_pct}%) — no recommendation needed.`,
    cost_floor_applied: (p) =>
      `Price clamped to cost floor (${p.floor_pct}% viable margin).`,
    all_outliers: () =>
      `All competitor prices flagged as outliers — skipped. Check URLs for SKU mismatch.`,
    no_scrapes: () =>
      `No fresh competitor data available.`,
    rule_adjusted: (p) =>
      `Price adjusted by rule(s): ${p.rules}.`,
  },

  ar: {
    undercut_competitor: (p) =>
      `تسعير أقل من أرخص منافس ⁦(${p.competitor_min})⁩ بمقدار ⁦${p.undercut_by}⁩ وحدة مع الحفاظ على هامش ⁦${p.margin_pct}⁩٪.`,
    hold_margin_floor: (p) =>
      `تم تثبيت هامش ⁦${p.margin_pct}⁩٪ ⁦(${p.margin_floor})⁩؛ التسعير أقل من أرخص منافس ⁦(${p.competitor_min})⁩ سيُخفّض الهامش عن الهدف.`,
    no_competitor_data: (p) =>
      `لا توجد أسعار منافسين — استُخدم حدّ الهامش ⁦(${p.margin_floor})⁩ عند ⁦${p.margin_pct}⁩٪.`,
    no_margin_inputs: (p) =>
      `لم تُضبط بيانات هامش التكلفة — تسعير أقل من أرخص منافس ⁦(${p.competitor_min})⁩ بمقدار ⁦${p.undercut_by}⁩ وحدة. أضف ⁦margin_inputs⁩ للحصول على توصيات أكثر دقةً.`,
    competitor_gap: (p) => {
      const n = Number(p.competitor_count);
      const suffix = n === 1 ? "منافس واحد" : `⁦${n}⁩ منافسين`;
      return (
        `${suffix} ⁦(${p.competitor_list})⁩ — الوسيط ⁦${p.median}⁩ ريال، الأدنى ⁦${p.min}⁩ ريال. ` +
        `سعرك أعلى من الوسيط بـ ⁦${p.gap_pct}⁩٪. ` +
        `مطابقة الوسيط قد ترفع المبيعات ~⁦${p.unit_delta_pct}⁩٪ بناءً على مرونة الفئة.`
      );
    },
    already_at_median: (p) =>
      `السعر مساوٍ للوسيط أو أقل منه (الفجوة ⁦${p.gap_pct}⁩٪) — لا توصية مطلوبة.`,
    cost_floor_applied: (p) =>
      `تم تقييد السعر عند حدّ التكلفة (هامش ⁦${p.floor_pct}⁩٪ قابل للتطبيق).`,
    all_outliers: () =>
      `رُصدت جميع أسعار المنافسين كقيم شاذة — تم التخطي. تحقق من روابط ⁦SKU⁩.`,
    no_scrapes: () =>
      `لا تتوفر بيانات مسح حديثة للمنافسين.`,
    rule_adjusted: (p) =>
      `تم تعديل السعر وفق القاعدة/القواعد: ⁦${p.rules}⁩.`,
  },

  fr: {
    undercut_competitor: (p) =>
      `Prix inférieur au concurrent le moins cher (${p.competitor_min}) de ${p.undercut_by} unité tout en respectant la marge plancher de ${p.margin_pct}%.`,
    hold_margin_floor: (p) =>
      `Maintien de la marge plancher à ${p.margin_pct}% (${p.margin_floor}) ; descendre sous le concurrent le moins cher (${p.competitor_min}) ferait passer la marge sous l'objectif.`,
    no_competitor_data: (p) =>
      `Aucun prix concurrent disponible — marge plancher utilisée (${p.margin_floor}) à ${p.margin_pct}% cible.`,
    no_margin_inputs: (p) =>
      `Aucune configuration de coût — prix inférieur au concurrent le moins cher (${p.competitor_min}) de ${p.undercut_by} unité. Ajoutez margin_inputs pour des recommandations plus fiables.`,
    competitor_gap: (p) => {
      const n = Number(p.competitor_count);
      return (
        `${n} concurrent${n === 1 ? "" : "s"} (${p.competitor_list}) — médiane ${p.median} QAR, ` +
        `plus bas ${p.min} QAR. Vous êtes ${p.gap_pct}% au-dessus de la médiane. ` +
        `Aligner sur la médiane devrait augmenter les ventes de ~${p.unit_delta_pct}% selon l'élasticité de la catégorie.`
      );
    },
    already_at_median: (p) =>
      `Prix déjà au niveau ou en dessous de la médiane (écart ${p.gap_pct}%) — aucune recommandation nécessaire.`,
    cost_floor_applied: (p) =>
      `Prix plafonné au coût plancher (marge viable à ${p.floor_pct}%).`,
    all_outliers: () =>
      `Tous les prix concurrents signalés comme aberrants — ignorés. Vérifiez les URLs pour correspondance SKU.`,
    no_scrapes: () =>
      `Aucune donnée de veille concurrentielle récente disponible.`,
    rule_adjusted: (p) =>
      `Prix ajusté par la règle / les règles : ${p.rules}.`,
  },
};

export function localizeReason(
  code: ReasonCode | string,
  params: ReasonParams,
  lang: Locale,
): string {
  const dict = REASONS[lang] ?? REASONS.en;
  const fn = dict[code as ReasonCode];
  if (fn) return fn(params);
  // Unknown code: fall back to stored English sentence if available.
  return params.fallback ?? code;
}
