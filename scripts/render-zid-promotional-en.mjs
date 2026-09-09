import { readFile, writeFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const sourcePath = resolve("scripts/render-zid-promotional.mjs");
const generatedPath = resolve("scripts/.render-zid-promotional-en.generated.mjs");
const defensibleGeneratedPath = resolve("scripts/.render-zid-promotional-defensible-en.generated.mjs");
let source = await readFile(sourcePath, "utf8");

const replacements = [
  ["<html lang=\"ar\" dir=\"rtl\">", "<html lang=\"en\" dir=\"ltr\">"],
  ['const outputDir = resolve("output/zid-promotional");', 'const outputDir = resolve("output/PrizeSkout-Zid-Promotional-Images-v2");'],
  ["prizeskout-zid-promo-v2-${index + 1}.png", "prizeskout-zid-promo-v2-${index + 1}-en.png"],

  ["حماية الأرباح لمتاجر زد", "PROFIT PROTECTION FOR ZID MERCHANTS"],
  ["كل ريال.<br><em>تحت السيطرة.</em>", "Every riyal.<br><em>Under control.</em>"],
  ["يراقب PrizeSkout ربحك الحقيقي، يكشف التسربات، ويحوّل المخاطر إلى إجراءات واضحة — من لوحة واحدة.", "PrizeSkout monitors true profit, detects leakage, and turns risk into clear action — from one dashboard."],
  ["متصل بمتجرك على زد", "Connected to your Zid store"],
  ["قرارات موثّقة وقابلة للمراجعة", "Documented, auditable decisions"],
  ["مركز حماية الإيرادات", "Revenue Protection Center"],
  ["آخر 30 يوماً", "Last 30 days"],
  ["أرباح تمّت حمايتها", "Profit protected"],
  ["هامش محفوظ", "Margin protected"],
  ["مخاطر مكتشفة", "Risks detected"],
  ["إجراءات موثّقة", "Documented actions"],

  ["تدقيق العمولات والمدفوعات", "COMMISSION AND PAYOUT AUDITS"],
  ["هل وصلك<br><em>المبلغ الصحيح؟</em>", "Did you receive<br><em>the right amount?</em>"],
  ["نقارن المبيعات بالعقد وكشف التسوية والإيداع البنكي — ونريك الفرق بالأدلة.", "We reconcile sales, contract terms, settlements, and bank deposits — then show the difference with evidence."],
  ["كشف الرسوم غير المفسّرة", "Detect unexplained fees"],
  ["مقارنة النسبة المتفق عليها بالفعلية", "Compare contracted and actual rates"],
  ["تقرير مطالبة جاهز للتنزيل", "Download a claim-ready report"],
  ["فحص دفعة منصة", "Platform payout check"],
  ["مطابقة التسوية", "Settlement reconciliation"],
  ["تمّ الفحص", "Check complete"],
  ["فرق يحتاج مراجعة", "Difference needs review"],
  ["أقل مما كان يجب أن تستلمه", "Less than you should have received"],
  ["إجمالي المبيعات", "Gross sales"],
  ["العمولة حسب العقد", "Contract commission"],
  ["رسوم إضافية غير مفسّرة", "Unexplained additional fees"],
  ["المبلغ المستحق", "Amount due"],
  ["تنزيل حزمة الأدلة ←", "Download evidence pack →"],

  ["ذكاء مالي يفهم متجرك", "FINANCIAL INTELLIGENCE FOR YOUR STORE"],
  ["اسأل. افهم.<br><em>اتخذ القرار.</em>", "Ask. Understand.<br><em>Make the call.</em>"],
  ["مساعد المدير المالي يقرأ طلباتك وتكاليفك وعقودك، ثم يشرح أين يذهب الربح وما الذي يستحق انتباهك.", "CFO Copilot reads your orders, costs, and contracts, then explains where profit goes and what needs attention."],
  ["متصل ببيانات متجرك", "Connected to your store data"],
  ["لماذا خسر طلب زد رقم <span class=\"num\">#10482</span> المال؟", "Why did Zid order <span class=\"num\">#10482</span> lose money?"],
  ["السبب الرئيسي", "MAIN CAUSE"],
  ["الخصم والضريبة وتكلفة المنتج خفّضت مساهمة الطلب إلى ما دون حدّك الآمن.", "Discount, tax, and product cost pushed order contribution below your safe threshold."],
  ["إيراد الطلب", "Order revenue"],
  ["ضريبة وتكلفة", "Tax and cost"],
  ["المساهمة", "Contribution"],
  ["التوصية", "RECOMMENDATION"],
  ["ارفع السعر <span class=\"num\">6%</span> أو استبعد المنتج من القسيمة الحالية.", "Raise the price <span class=\"num\">6%</span> or exclude the product from the current coupon."],
  ["راجع القسائم غير الآمنة", "Review unsafe coupons"],
  ["اعرض الطلبات الخاسرة", "Show loss-making orders"],
  ["أنشئ سياسة هامش", "Create a margin policy"],

  ["مساعد المتجر بالذكاء الاصطناعي", "AI STORE MANAGER"],
  ["قل ما تريد.<br><em>راجع. وافق.</em>", "Say what you need.<br><em>Review. Approve.</em>"],
  ["نفّذ مهام متجرك على زد بلغة طبيعية — مع معاينة واضحة، موافقة صريحة، وتحقق بعد التنفيذ.", "Run Zid store tasks in natural language — with a clear preview, explicit approval, and post-action verification."],
  ["أنت صاحب القرار", "You stay in control"],
  ["لا تغيير مباشر قبل موافقتك", "Nothing changes before you approve"],
  ["طلب جديد", "New request"],
  ["“ارفع سعر القهوة المختصة إلى <span class=\"num\">28</span> ر.س”", "“Raise Specialty Coffee to SAR <span class=\"num\">28</span>”"],
  ["معاينة آمنة", "Safe preview"],
  ["المنتج المطابق في زد", "Matched Zid product"],
  ["قهوة مختصة", "Specialty Coffee"],
  ["مطابقة مؤكدة ✓", "Verified match ✓"],
  ["السعر الحالي", "Current price"],
  ["السعر المقترح", "Proposed price"],
  ["هامش الربح بعد التغيير", "Margin after change"],
  ["فوق الحدّ الآمن بـ", "Above safe floor by"],
  ["إلغاء", "Cancel"],
  ["موافقة وتنفيذ", "Approve and apply"],
  ["تمّ التحقق من زد", "Verified on Zid"],
  ["السعر الجديد ظاهر في المتجر وتمّ حفظ سجل العملية.", "The new price is live and the action record is saved."],

  ["من الرؤية إلى الاسترداد", "FROM VISIBILITY TO RECOVERY"],
  ["دورة حماية<br><em>لا تترك تسرباً.</em>", "A protection loop<br><em>that stops leakage.</em>"],
  ["PrizeSkout يربط كل إشارة مالية بالإجراء والدليل — حتى تعرف ما حدث، لماذا، وما الذي تمّ استرداده.", "PrizeSkout links every financial signal to action and evidence — so you know what happened, why, and what was recovered."],
  ["راقب", "Monitor"],
  ["طلبات · تكاليف · عمولات", "Orders · costs · commissions"],
  ["اكتشف", "Detect"],
  ["اكشف", "Detect"],
  ["فروقات · تسربات · مخاطر", "Gaps · leakage · risks"],
  ["صحّح", "Correct"],
  ["سياسة · موافقة · تنفيذ", "Policy · approval · action"],
  ["أثبت", "Prove"],
  ["تقرير · مطالبة · استرداد", "Report · claim · recovery"],
  ["حالة استرداد موثّقة", "Documented recovery case"],
  ["رسوم منصة زائدة", "Excess platform fees"],
  ["تمّ الاسترداد", "Recovered"],
  ["الأدلة", "Evidence"],
  ["الحالة", "Status"],
  ["مغلقة", "Closed"],
  ["الثقة", "Confidence"],
  ["مرتفعة", "High"],
  ["جاهز لحماية أرباح متجرك؟", "Ready to protect your store profit?"],
  ["ابدأ مع PrizeSkout على زد", "Get started with PrizeSkout on Zid"],
  ["فعّل التطبيق ←", "Activate the app →"],
  ["ر.س", "SAR"],
];

for (const [arabic, english] of replacements) {
  source = source.replaceAll(arabic, english);
}

source = source.replace(
  "${extra}\n</style>",
  "${extra}\n.safe{transform:none!important}.recovered{left:auto!important;right:55px!important}\n</style>",
);

await writeFile(generatedPath, source, "utf8");
try {
  await import(`${new URL(`file:///${generatedPath.replaceAll("\\", "/")}`).href}?v=${Date.now()}`);
} finally {
  await unlink(generatedPath).catch(() => {});
}

let defensibleSource = source
  .replace("FROM VISIBILITY TO RECOVERY", "FROM SIGNAL TO ACTION")
  .replace("A protection loop<br><em>that stops leakage.</em>", "Every financial gap<br><em>gets a next step.</em>")
  .replace(
    "PrizeSkout links every financial signal to action and evidence — so you know what happened, why, and what was recovered.",
    "PrizeSkout links each financial gap to evidence and an appropriate action, then records the result after verification.",
  )
  .replace("Correct", "Review")
  .replace("Policy · approval · action", "Approval · action")
  .replace("Prove", "Document")
  .replace("Report · claim · recovery", "Evidence · result")
  .replace("Documented recovery case", "Documented review status")
  .replace("Excess platform fees", "Platform fee difference")
  .replace("Recovered", "Pending approval")
  .replace('<span>Evidence <b class="num">6</b></span>', '<span>Evidence <b>Complete</b></span>')
  .replace("Status <b>Closed</b>", "Status <b>Ready for review</b>")
  .replace("Confidence <b>High</b>", "Confidence <b>Data-based</b>")
  .replace(
    "for (let index = 0; index < slides.length; index += 1) {",
    "for (let index = 4; index < slides.length; index += 1) {",
  )
  .replace(
    "prizeskout-zid-promo-v2-${index + 1}-en.png",
    "prizeskout-zid-promo-v2-${index + 1}-defensible-en-large.png",
  );

await writeFile(defensibleGeneratedPath, defensibleSource, "utf8");
const largeDefensiblePath = resolve("output/PrizeSkout-Zid-Promotional-Images-v2/prizeskout-zid-promo-v2-5-defensible-en-large.png");
const defensiblePath = resolve("output/PrizeSkout-Zid-Promotional-Images-v2/prizeskout-zid-promo-v2-5-defensible-en.png");
try {
  await import(`${new URL(`file:///${defensibleGeneratedPath.replaceAll("\\", "/")}`).href}?v=${Date.now()}`);
  await sharp(largeDefensiblePath).resize(1672, 941, { fit: "fill" }).png().toFile(defensiblePath);
} finally {
  await unlink(defensibleGeneratedPath).catch(() => {});
  await unlink(largeDefensiblePath).catch(() => {});
}
