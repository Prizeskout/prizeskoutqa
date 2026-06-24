// Trilingual recommendation reason dictionary.
//
// Engine emits a reason_code + reason_params stored as a JSON v2 blob in the
// pricing_recommendations.reason column. The frontend calls localizeReason()
// to render the headline and Why? detail in the user's language.
//
// Rules:
//  - Headline = decision first, absolute QAR numbers, margin floor reassurance.
//  - Detail   = supporting evidence (competitor list, prices, floor figure).
//  - NO fabricated outcome numbers (no unit lift %, no category elasticity).
//  - NO internal names (no table/column/field names, no "median", "SKU").
//  - Proper nouns (competitor names) appear as-is in params — never translated.

import type { Locale } from "@/lib/i18n";

export type ReasonCode =
  | "competitor_gap"
  | "hold_margin_floor"
  | "already_at_median"
  | "undercut_competitor"
  | "cost_floor_applied"
  | "no_competitor_data"
  | "no_margin_inputs"
  | "all_outliers"
  | "no_scrapes"
  | "rule_adjusted";

export type ReasonParams = {
  // Primary display fields
  recommended_price?: number | string;  // e.g. "2,150"
  market_price?: number | string;       // typical competitor price
  gap_qar?: number | string;            // current_price − market_price (absolute)
  above_floor_qar?: number | string;    // recommended_price − cost_floor (safety margin)
  margin_floor?: number | string;       // absolute cost floor in QAR
  competitor_count?: number | string;
  competitor_list?: string;             // proper nouns — not translated
  min?: number | string;                // cheapest competitor price
  rules?: string;                       // rule text — not translated
  // Legacy / backward-compat fields (kept; do NOT use in new headlines)
  competitor_min?: number | string;
  undercut_by?: number | string;
  margin_pct?: number | string;
  median?: number | string;
  gap_pct?: number | string;
  unit_delta_pct?: number | string;     // DELETED from templates — fabricated number
  floor_pct?: number | string;
  price?: number | string;
  fallback?: string;                    // pre-rendered EN headline for audit / old code
  [k: string]: string | number | undefined;
};

// Structured blob stored in pricing_recommendations.reason for new rows.
export type ReasonV2 = {
  v: 2;
  code: ReasonCode;
  params: ReasonParams;
  fallback: string;  // EN headline; used by PDF export, audit log, old frontends
};

export type LocalizedReason = {
  headline: string;
  detail: string;
};

type TemplatePair = {
  headline: (p: ReasonParams) => string;
  detail: (p: ReasonParams) => string;
};

// ─── English ────────────────────────────────────────────────────────────────

const EN: Partial<Record<ReasonCode, TemplatePair>> = {
  competitor_gap: {
    headline: (p) => {
      const n = Number(p.competitor_count ?? 1);
      const base = `Lower to QAR ${p.recommended_price} to match the market`;
      if (p.above_floor_qar) {
        return `${base} — still QAR ${p.above_floor_qar} above your cost floor.`;
      }
      const verb = n === 1 ? "is" : "are";
      return `${base}. ${p.competitor_list} ${verb} cheaper by QAR ${p.gap_qar}.`;
    },
    detail: (p) => {
      const n = Number(p.competitor_count ?? 1);
      const parts = [
        `${n} competitor${n === 1 ? "" : "s"} checked: ${p.competitor_list}.`,
        `Typical competitor price: QAR ${p.market_price ?? p.median}.`,
        `Your current price is QAR ${p.gap_qar} above the market.`,
      ];
      if (p.margin_floor) parts.push(`Your cost floor: QAR ${p.margin_floor}.`);
      return parts.join(" ");
    },
  },

  hold_margin_floor: {
    headline: (_p) =>
      `Hold your price — lowering further would cut into your margin.`,
    detail: (p) => {
      const parts: string[] = [];
      if (p.market_price ?? p.median)
        parts.push(`Competitors are pricing around QAR ${p.market_price ?? p.median}.`);
      if (p.margin_floor)
        parts.push(
          `Your cost floor is QAR ${p.margin_floor}. Matching the market would push your margin below target.`,
        );
      return parts.join(" ");
    },
  },

  already_at_median: {
    headline: (_p) =>
      `Hold your price — you're already competitive with the market.`,
    detail: (p) => {
      const parts: string[] = [];
      if (p.market_price ?? p.median)
        parts.push(`Typical competitor price: QAR ${p.market_price ?? p.median}.`);
      if (p.gap_qar)
        parts.push(`Your price is within QAR ${p.gap_qar} of the market.`);
      return parts.join(" ");
    },
  },

  undercut_competitor: {
    headline: (p) => {
      const base = `Lower to QAR ${p.recommended_price} — beat the cheapest competitor by one step`;
      return p.above_floor_qar
        ? `${base}, still QAR ${p.above_floor_qar} above your cost floor.`
        : `${base}.`;
    },
    detail: (p) => {
      const parts: string[] = [];
      if (p.competitor_min) parts.push(`Cheapest competitor: QAR ${p.competitor_min}.`);
      if (p.margin_floor) parts.push(`Your cost floor: QAR ${p.margin_floor}.`);
      return parts.join(" ");
    },
  },

  cost_floor_applied: {
    headline: (p) =>
      `Price held at QAR ${p.recommended_price} — your cost floor is protecting your margin.`,
    detail: (p) =>
      p.margin_floor
        ? `The market price would have pushed you below your cost floor. Floor: QAR ${p.margin_floor}.`
        : `The market price would have pushed you below your minimum viable margin.`,
  },

  no_competitor_data: {
    headline: (_p) =>
      `No competitor prices found — holding your current price.`,
    detail: (_p) =>
      `Add competitor product URLs on the Competitors page to get market-based recommendations.`,
  },

  no_margin_inputs: {
    headline: (p) =>
      `Lower to QAR ${p.recommended_price} — no product costs configured yet.`,
    detail: (_p) =>
      `No cost data is set up. Add your product costs in Settings for safer recommendations with margin protection.`,
  },

  all_outliers: {
    headline: (_p) =>
      `Competitor prices look mismatched — no recommendation made.`,
    detail: (_p) =>
      `All detected competitor prices appear to be for different products. Check that competitor URLs point to the exact same item.`,
  },

  no_scrapes: {
    headline: (_p) =>
      `No recent competitor data — holding your current price.`,
    detail: (_p) =>
      `Competitor prices haven't been fetched recently. Trigger a scrape on the Competitors page.`,
  },

  rule_adjusted: {
    headline: (p) =>
      `Price adjusted to QAR ${p.recommended_price} by your pricing rules.`,
    detail: (p) => {
      const plural = (p.rules ?? "").includes(";");
      return `Rule${plural ? "s" : ""} applied: ${p.rules}.`;
    },
  },
};

// ─── Arabic ─────────────────────────────────────────────────────────────────

const AR: Partial<Record<ReasonCode, TemplatePair>> = {
  competitor_gap: {
    headline: (p) => {
      const base = `اخفض إلى ⁦${p.recommended_price}⁩ ريالاً لتنافس السوق`;
      if (p.above_floor_qar) {
        return `${base} — هامشك آمن، أعلى من حدّ التكلفة بـ ⁦${p.above_floor_qar}⁩ ريالاً.`;
      }
      return `${base}. المنافسون يبيعون بأقل بفارق ⁦${p.gap_qar}⁩ ريالاً.`;
    },
    detail: (p) => {
      const n = Number(p.competitor_count ?? 1);
      const suffix = n === 1 ? "منافس واحد" : `⁦${n}⁩ منافسين`;
      const parts = [
        `تم فحص ${suffix}: ⁦${p.competitor_list}⁩.`,
        `السعر السائد في السوق: ⁦${p.market_price ?? p.median}⁩ ريالاً.`,
        `سعرك الحالي أعلى من السوق بـ ⁦${p.gap_qar}⁩ ريالاً.`,
      ];
      if (p.margin_floor) parts.push(`حدّ التكلفة: ⁦${p.margin_floor}⁩ ريالاً.`);
      return parts.join(" ");
    },
  },

  hold_margin_floor: {
    headline: (_p) =>
      `حافظ على سعرك — الخفض الإضافي سيُقلّص هامش ربحك.`,
    detail: (p) => {
      const parts: string[] = [];
      if (p.market_price ?? p.median)
        parts.push(`يتراوح سعر المنافسين حول ⁦${p.market_price ?? p.median}⁩ ريالاً.`);
      if (p.margin_floor)
        parts.push(`حدّ التكلفة لديك: ⁦${p.margin_floor}⁩ ريالاً. مجاراة السوق ستُخفض هامشك دون الهدف.`);
      return parts.join(" ");
    },
  },

  already_at_median: {
    headline: (_p) =>
      `حافظ على سعرك — أنت تنافسي في السوق.`,
    detail: (p) => {
      const parts: string[] = [];
      if (p.market_price ?? p.median)
        parts.push(`السعر السائد للمنافسين: ⁦${p.market_price ?? p.median}⁩ ريالاً.`);
      if (p.gap_qar)
        parts.push(`سعرك في نطاق ⁦${p.gap_qar}⁩ ريالاً من متوسط السوق.`);
      return parts.join(" ");
    },
  },

  undercut_competitor: {
    headline: (p) => {
      const base = `اخفض إلى ⁦${p.recommended_price}⁩ ريالاً لتجاوز أرخص منافس`;
      return p.above_floor_qar
        ? `${base} — هامشك لا يزال آمناً بفارق ⁦${p.above_floor_qar}⁩ ريالاً عن حدّ التكلفة.`
        : `${base}.`;
    },
    detail: (p) => {
      const parts: string[] = [];
      if (p.competitor_min) parts.push(`أرخص منافس: ⁦${p.competitor_min}⁩ ريالاً.`);
      if (p.margin_floor) parts.push(`حدّ التكلفة: ⁦${p.margin_floor}⁩ ريالاً.`);
      return parts.join(" ");
    },
  },

  cost_floor_applied: {
    headline: (p) =>
      `يُحتفظ بالسعر عند ⁦${p.recommended_price}⁩ ريالاً — حدّ التكلفة يحمي هامشك.`,
    detail: (p) =>
      p.margin_floor
        ? `السعر السوقي المقترح كان سيتجاوز حدّ التكلفة. الحدّ: ⁦${p.margin_floor}⁩ ريالاً.`
        : `السعر السوقي المقترح كان سيتجاوز الحدّ الأدنى للهامش.`,
  },

  no_competitor_data: {
    headline: (_p) =>
      `لا توجد أسعار منافسين — سيُحتفظ بسعرك الحالي.`,
    detail: (_p) =>
      `أضف روابط منتجات المنافسين في صفحة المنافسين للحصول على توصيات مبنية على السوق.`,
  },

  no_margin_inputs: {
    headline: (p) =>
      `اخفض إلى ⁦${p.recommended_price}⁩ ريالاً — لم تُضبط بيانات تكلفة بعد.`,
    detail: (_p) =>
      `لا توجد بيانات تكلفة للمنتج. أضف بيانات التكلفة في الإعدادات للحصول على توصيات مع حماية الهامش.`,
  },

  all_outliers: {
    headline: (_p) =>
      `أسعار المنافسين تبدو غير مطابقة — لم تُصدر توصية.`,
    detail: (_p) =>
      `تبدو جميع أسعار المنافسين المرصودة كأنها لمنتجات مختلفة. تأكد من أن روابط المنافسين تشير إلى نفس المنتج تحديداً.`,
  },

  no_scrapes: {
    headline: (_p) =>
      `لا توجد بيانات منافسين حديثة — سيُحتفظ بسعرك الحالي.`,
    detail: (_p) =>
      `لم تُجلب أسعار المنافسين مؤخراً. شغّل عملية الفحص من صفحة المنافسين.`,
  },

  rule_adjusted: {
    headline: (p) =>
      `تم تعديل السعر إلى ⁦${p.recommended_price}⁩ ريالاً وفق قواعد التسعير.`,
    detail: (p) => `القواعد المطبّقة: ⁦${p.rules}⁩.`,
  },
};

// ─── French ──────────────────────────────────────────────────────────────────

const FR: Partial<Record<ReasonCode, TemplatePair>> = {
  competitor_gap: {
    headline: (p) => {
      const n = Number(p.competitor_count ?? 1);
      const base = `Baissez à ${p.recommended_price} QAR pour coller au marché`;
      if (p.above_floor_qar) {
        return `${base} — marge assurée, ${p.above_floor_qar} QAR au-dessus de votre plancher.`;
      }
      const verb = n === 1 ? "est" : "sont";
      const adj = n === 1 ? "" : "s";
      return `${base}. ${p.competitor_list} ${verb} moins cher${adj} de ${p.gap_qar} QAR.`;
    },
    detail: (p) => {
      const n = Number(p.competitor_count ?? 1);
      const parts = [
        `${n} concurrent${n === 1 ? "" : "s"} analysé${n === 1 ? "" : "s"} : ${p.competitor_list}.`,
        `Prix courant du marché : ${p.market_price ?? p.median} QAR.`,
        `Votre prix est supérieur au marché de ${p.gap_qar} QAR.`,
      ];
      if (p.margin_floor) parts.push(`Plancher de coût : ${p.margin_floor} QAR.`);
      return parts.join(" ");
    },
  },

  hold_margin_floor: {
    headline: (_p) =>
      `Maintenez votre prix — baisser davantage entamerait votre marge.`,
    detail: (p) => {
      const parts: string[] = [];
      if (p.market_price ?? p.median)
        parts.push(`Les concurrents tournent autour de ${p.market_price ?? p.median} QAR.`);
      if (p.margin_floor)
        parts.push(
          `Votre plancher de coût est à ${p.margin_floor} QAR. S'aligner sur le marché ferait passer la marge sous votre objectif.`,
        );
      return parts.join(" ");
    },
  },

  already_at_median: {
    headline: (_p) =>
      `Maintenez votre prix — vous êtes déjà compétitif sur le marché.`,
    detail: (p) => {
      const parts: string[] = [];
      if (p.market_price ?? p.median)
        parts.push(`Prix courant du marché : ${p.market_price ?? p.median} QAR.`);
      if (p.gap_qar)
        parts.push(`Votre prix est à moins de ${p.gap_qar} QAR du marché.`);
      return parts.join(" ");
    },
  },

  undercut_competitor: {
    headline: (p) => {
      const base = `Baissez à ${p.recommended_price} QAR pour passer sous le concurrent le moins cher`;
      return p.above_floor_qar
        ? `${base} — ${p.above_floor_qar} QAR au-dessus de votre plancher.`
        : `${base}.`;
    },
    detail: (p) => {
      const parts: string[] = [];
      if (p.competitor_min) parts.push(`Concurrent le moins cher : ${p.competitor_min} QAR.`);
      if (p.margin_floor) parts.push(`Plancher de coût : ${p.margin_floor} QAR.`);
      return parts.join(" ");
    },
  },

  cost_floor_applied: {
    headline: (p) =>
      `Prix maintenu à ${p.recommended_price} QAR — votre plancher protège votre marge.`,
    detail: (p) =>
      p.margin_floor
        ? `Le prix marché recommandé aurait fait passer votre marge sous le plancher. Plancher : ${p.margin_floor} QAR.`
        : `Le prix marché recommandé aurait fait passer votre marge sous le minimum viable.`,
  },

  no_competitor_data: {
    headline: (_p) =>
      `Aucun prix concurrent trouvé — votre prix actuel est conservé.`,
    detail: (_p) =>
      `Ajoutez des URLs de produits concurrents sur la page Concurrents pour obtenir des recommandations basées sur le marché.`,
  },

  no_margin_inputs: {
    headline: (p) =>
      `Baissez à ${p.recommended_price} QAR — aucun coût produit configuré.`,
    detail: (_p) =>
      `Aucune donnée de coût n'est configurée. Ajoutez vos coûts dans les Paramètres pour des recommandations avec protection de la marge.`,
  },

  all_outliers: {
    headline: (_p) =>
      `Les prix concurrents semblent incohérents — aucune recommandation émise.`,
    detail: (_p) =>
      `Tous les prix concurrents détectés semblent correspondre à des produits différents. Vérifiez que les URLs pointent bien vers le même article.`,
  },

  no_scrapes: {
    headline: (_p) =>
      `Aucune donnée concurrentielle récente — votre prix actuel est conservé.`,
    detail: (_p) =>
      `Les prix concurrents n'ont pas été récupérés récemment. Lancez une collecte depuis la page Concurrents.`,
  },

  rule_adjusted: {
    headline: (p) =>
      `Prix ajusté à ${p.recommended_price} QAR par vos règles de tarification.`,
    detail: (p) => {
      const plural = (p.rules ?? "").includes(";");
      return `Règle${plural ? "s" : ""} appliquée${plural ? "s" : ""} : ${p.rules}.`;
    },
  },
};

const REASONS: Record<Locale, Partial<Record<ReasonCode, TemplatePair>>> = {
  en: EN,
  ar: AR,
  fr: FR,
};

// ─── Public API ─────────────────────────────────────────────────────────────

export function localizeReason(
  code: ReasonCode | string,
  params: ReasonParams,
  lang: Locale,
): LocalizedReason {
  const dict = REASONS[lang] ?? REASONS.en;
  const pair = dict[code as ReasonCode] ?? REASONS.en[code as ReasonCode];
  if (pair) {
    return {
      headline: pair.headline(params),
      detail: pair.detail(params),
    };
  }
  return {
    headline: params.fallback ?? code,
    detail: "",
  };
}

// Parse the reason field from pricing_recommendations.
// New rows (v:2) carry a structured JSON blob; old rows are plain strings.
export function parseReasonField(raw: string): ReasonV2 | null {
  try {
    const j = JSON.parse(raw) as unknown;
    if (
      j !== null &&
      typeof j === "object" &&
      (j as Record<string, unknown>).v === 2
    ) {
      return j as ReasonV2;
    }
  } catch {
    // Not JSON — old-format plain string
  }
  return null;
}
