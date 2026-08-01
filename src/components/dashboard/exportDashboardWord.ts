import { saveWordReport, type WordReportSection } from "@/lib/wordReport";
import type { AIInsight, InsightWindow } from "@/server/ai-insights.functions";
import type { FieldObservation, PriceGap } from "./field-intel/exportFieldIntelPdf";
import type { PricingRecommendation } from "./pricing/exportPricingPdf";

type Pattern = { competitor:string; channel:string; category:string; detectionPeriod:string; confidence:number; pattern:string; depth:string|null; evidence:{date:string;description:string}[]; recommendation:string; impact:string };
type InsightSection = { title:string; window:InsightWindow; insight:AIInsight|null };
const suffix = () => new Date().toISOString().slice(0, 10);

export const exportPricingWord = (rows: PricingRecommendation[]) => saveWordReport({
  title: "Pricing Recommendations", subtitle: "Merchant review required before publication", fileName: `pricing-recommendations-${suffix()}.docx`,
  summary: [{label:"Recommendations",value:String(rows.length)},{label:"Average confidence",value:`${Math.round(rows.reduce((sum,row)=>sum+row.confidence,0)/Math.max(1,rows.length))}%`}],
  sections: [{title:"Proposed price decisions",table:{headers:["Product","Category","Channel","Current","Proposed","Change","Evidence confidence","Calculation basis"],rows:rows.map(row=>[row.product,row.category,row.channel,`QAR ${row.current}`,`QAR ${row.recommended}`,`${row.recommended>=row.current?"+":""}${((row.recommended-row.current)/Math.max(row.current,.01)*100).toFixed(1)}%`,`${row.confidence}%`,row.reason])}}],
  limitations: ["Recommendations depend on the cost, channel, and competitor inputs available at generation time.","Lower-confidence recommendations require manual review.","This report does not itself publish prices."],
});

export const exportPatternsWord = (patterns: Pattern[]) => saveWordReport({
  title:"Competitor Behavior Patterns", subtitle:"Observed pricing and promotion patterns", fileName:`competitor-patterns-${suffix()}.docx`, summary:[{label:"Patterns detected",value:String(patterns.length)}],
  sections:patterns.map((pattern,index)=>({title:`${index+1}. ${pattern.competitor} - ${pattern.pattern}`,paragraphs:[`Channel: ${pattern.channel} | Category: ${pattern.category} | Detection period: ${pattern.detectionPeriod} | Confidence: ${pattern.confidence}%`,pattern.depth??""].filter(Boolean),bullets:pattern.evidence.map(item=>`${item.date}: ${item.description}`),note:`Recommended action: ${pattern.recommendation} | Expected impact: ${pattern.impact}`})),
  limitations:["Patterns are observational and do not establish competitor intent.","Impact values should be treated as scenarios unless supported by merchant sales volume."],
});

export const exportFieldIntelWord = (input:{observations:FieldObservation[];gaps:PriceGap[]}) => saveWordReport({
  title:"Field Intelligence Report", subtitle:"In-store observations and online price comparisons", fileName:`field-intelligence-${suffix()}.docx`, summary:[{label:"Observations",value:String(input.observations.length)},{label:"Flagged",value:String(input.observations.filter(row=>row.status==="Flagged").length)},{label:"Price gaps",value:String(input.gaps.length)}],
  sections:[{title:"Field observations",table:{headers:["Product","Store","Price","Condition","Status","Agent","Observed"],rows:input.observations.map(row=>[row.product,row.store,`QAR ${row.price}`,row.condition,row.status,row.agent,row.time])}},{title:"Online versus in-store gaps",table:{headers:["Product","Competitor","Online","In store","Gap","Observed"],rows:input.gaps.map(row=>[row.product,row.competitor,`QAR ${row.online}`,`QAR ${row.inStore}`,row.gap,row.observed])}}],
  limitations:["Field observations represent the time and location recorded, not a continuous market guarantee.","Promotion and stock conditions may change after observation."],
});

export const exportInsightsWord = (sections: InsightSection[]) => saveWordReport({
  title:"Pricing & Market Review", subtitle:"Controlled review of pricing and competitor records", fileName:`pricing-market-review-${suffix()}.docx`, summary:[{label:"Areas reviewed",value:String(sections.length)},{label:"Areas with findings",value:String(sections.filter(section=>section.insight).length)}],
  sections:sections.flatMap((section): WordReportSection[]=>{
    if(!section.insight) return [{title:section.title,paragraphs:["No insight was generated for this section."],note:`Window: ${section.window}`}];
    const insight=section.insight;
    return [
      {title:section.title,paragraphs:[insight.headline],bullets:insight.bullets.map(item=>`${item.text}${item.cites.length?` [${item.cites.join(", ")}]`:""}`),note:`Window: ${section.window} | Generated: ${new Date(insight.generated_at).toLocaleString()}`},
      {title:`${section.title} - Required review actions`,bullets:insight.actions.map(item=>`${item.title}: ${item.detail}${item.cites.length?` [${item.cites.join(", ")}]`:""}`),table:insight.citations.length?{headers:["Evidence reference","Source record","Record identifier"],rows:insight.citations.map((item,index)=>[String(index+1),item.label,item.ref??item.kind])}:undefined},
    ];
  }),
  limitations:["Analytical assistance was used to classify and summarize the records; conclusions remain subject to merchant review.","Review the cited source records before acting.","Absence of a finding does not establish absence of risk."],
});
