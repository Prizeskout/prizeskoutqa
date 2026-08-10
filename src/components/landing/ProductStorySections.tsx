import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import logo from "@/assets/logo-light.svg";
import "./ProductStorySections.css";
import { landingMoney, localizeLandingMoney, type LandingMarket } from "./currency";
import { PLAN_PRICES_QAR_ANNUAL_MONTHLY, PLAN_PRICES_QAR_MONTHLY } from "@/lib/plan-config";

type Lang = "en" | "ar";
type Pair = [string, string];
const tx = (lang: Lang, p: Pair) => p[lang === "ar" ? 1 : 0];
const MarketContext = createContext<LandingMarket | null>(null);
function useMarketMoney() {
  const market = useContext(MarketContext);
  if (!market) throw new Error("Landing market is unavailable");
  return {
    money: (value: number, digits?: number) => landingMoney(market, value, digits),
    localized: (value: string) => localizeLandingMoney(value, market),
  };
}

export function ProductStorySections({ lang, market }: { lang: Lang; market: LandingMarket }) {
  return (
    <MarketContext.Provider value={market}><div className="pss" dir={lang === "ar" ? "rtl" : "ltr"}>
      <CommerceNetwork lang={lang} />
      <ProfitStory lang={lang} />
      <ProtectionStory lang={lang} />
      <DecisionStory lang={lang} />
      <RecoveryStory lang={lang} />
      <ManagerStory lang={lang} />
      <PlatformMatrix lang={lang} />
      <TrustStrip lang={lang} />
      <DetailedPricing lang={lang} />
      <Faq lang={lang} />
      <FinalCta lang={lang} />
    </div></MarketContext.Provider>
  );
}

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setSeen(entry.isIntersecting), {
      threshold: 0.18,
      rootMargin: "60px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={`${className} pss-reveal ${seen ? "is-seen" : ""}`}>
      {children}
    </div>
  );
}
function Intro({
  lang,
  kicker,
  title,
  body,
  center = false,
}: {
  lang: Lang;
  kicker: Pair;
  title: Pair;
  body: Pair;
  center?: boolean;
}) {
  return (
    <header className={`pss-intro ${center ? "center" : ""}`}>
      <span>{tx(lang, kicker)}</span>
      <h2>{tx(lang, title)}</h2>
      <p>{tx(lang, body)}</p>
    </header>
  );
}

function CommerceNetwork({ lang }: { lang: Lang }) {
  return (
    <section className="pss-network" id="integrations">
      <Intro
        lang={lang}
        center
        kicker={["INTEGRATIONS", "التكاملات"]}
        title={[
          "Built for the commerce stack you already run.",
          "مصمم لمنظومة التجارة التي تستخدمها بالفعل.",
        ]}
        body={[
          "Orders and payouts flow in. Protected decisions and approved updates flow back out.",
          "تتدفق الطلبات والدفعات إلى الداخل، وتعود القرارات المحمية والتحديثات المعتمدة إلى الخارج.",
        ]}
      />
      <Reveal className="network-canvas">
        <div className="network-core">
          <img src={logo} alt="PrizeSkout" />
          <b>{tx(lang, ["Control centre", "مركز التحكم"])}</b>
          <small>{tx(lang, ["Monitoring continuously", "مراقبة مستمرة"])}</small>
        </div>
        <Node
          cls="store"
          label={tx(lang, ["Storefront", "واجهة المتجر"])}
          detail={tx(lang, ["Products · orders", "المنتجات · الطلبات"])}
        />
        <Node
          cls="agg"
          label={tx(lang, ["Aggregator", "منصة التجميع"])}
          detail={tx(lang, ["Orders · fees · prices", "الطلبات · الرسوم · الأسعار"])}
        />
        <Node
          cls="pay"
          label={tx(lang, ["Payouts", "الدفعات"])}
          detail={tx(lang, ["Statements · settlements", "الكشوف · التسويات"])}
        />
        <Node cls="pos" label="POS" detail={tx(lang, ["Coming soon", "قريباً"])} />
        <i className="flow f1" />
        <i className="flow f2" />
        <i className="flow f3" />
        <i className="flow f4" />
      </Reveal>
    </section>
  );
}
function Node({ cls, label, detail }: { cls: string; label: string; detail: string }) {
  return (
    <div className={`network-node ${cls}`}>
      <span>{label.slice(0, 1)}</span>
      <div>
        <b>{label}</b>
        <small>{detail}</small>
      </div>
    </div>
  );
}

function ProfitStory({ lang }: { lang: Lang }) {
  const { money, localized } = useMarketMoney();
  return (
    <section className="pss-section" id="platform">
      <Intro
        lang={lang}
        kicker={["SEE", "اعرف"]}
        title={["Know what you actually made.", "اعرف ما حققته فعلياً."]}
        body={[
          "Not GMV. Not the order value. Your real profit after commissions, fees, tax, promotions and product cost.",
          "ليس إجمالي المبيعات ولا قيمة الطلب، بل ربحك الحقيقي بعد العمولات والرسوم والضرائب والعروض وتكلفة المنتج.",
        ]}
      />
      <Reveal className="story-frame profit-frame">
        <div className="profit-toolbar">
          <div><i /><span>{tx(lang, ["True Profit · Live order", "الربح الحقيقي · طلب مباشر"])}</span></div>
          <small>{tx(lang, ["EXAMPLE DATA", "بيانات توضيحية"])}</small>
        </div>
        <div className="profit-stage">
          <div className="order-source">
            <span>{tx(lang, ["ORDER RECEIVED", "تم استلام الطلب"])}</span>
            <strong>{money(58,2)}</strong>
            <small>{tx(lang, ["Aggregator · #10482", "منصة التجميع · #10482"])}</small>
            <div className="order-meta"><span>{tx(lang, ["Paid", "مدفوع"])}</span><span>18:42</span></div>
          </div>
          <div className="profit-transfer" aria-hidden="true"><i /></div>
          <div className="profit-ledger">
            <header><span>{tx(lang, ["COST RECONCILIATION", "مطابقة التكاليف"])}</span><small>{tx(lang, ["4 of 4 matched", "تمت مطابقة 4 من 4"])}</small></header>
          {[
            ["Order value", "قيمة الطلب", money(58,2), ""],
            ["Commission & fees", "العمولة والرسوم", `− ${money(12.36,2)}`, "minus"],
            ["Product cost", "تكلفة المنتج", `− ${money(21,2)}`, "minus"],
            ["True profit", "الربح الحقيقي", money(24.64,2), "total"],
          ].map((x, index) => (
            <div className={x[3]} key={x[0]} style={{ "--row": index } as React.CSSProperties}>
              <i aria-hidden="true">✓</i>
              <span>{tx(lang, [x[0], x[1]])}</span>
              <b>{x[2]}</b>
            </div>
          ))}
            <footer><span>{tx(lang, ["TRUE MARGIN", "الهامش الحقيقي"])}</span><strong>42.5%</strong></footer>
          </div>
          <div className="copilot-note">
            <div className="copilot-head"><i>✦</i><small>CFO COPILOT</small></div>
            <b>{tx(lang, ["Here’s what changed", "إليك ما تغير"])}</b>
            <p>{localized(tx(lang, ["Fees consumed 21.3% of this order. After every known cost, QAR 24.64 remains as true profit.", "استهلكت الرسوم 21.3% من هذا الطلب. وبعد كل التكاليف المعروفة، تبقى 24.64 ر.ق كربح حقيقي."]))}</p>
            <div className="copilot-proof"><span>{tx(lang, ["Known costs", "التكاليف المعروفة"])} <b>100%</b></span><i><em /></i></div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function DecisionStory({ lang }: { lang: Lang }) {
  const { money, localized } = useMarketMoney();
  return (
    <section className="pss-section tint">
      <Intro
        lang={lang}
        kicker={["COMPETITOR RADAR + PROMOTION SIMULATOR", "رادار المنافسين + محاكي العروض"]}
        title={["Competitive without becoming unprofitable.", "نافس دون أن تصبح غير مربح."]}
        body={[
          "Competitor context and promotion economics produce one safe recommendation without racing to the lowest price.",
          "تجتمع بيانات المنافسين واقتصاديات العرض في توصية آمنة، لا في سباق نحو السعر الأقل.",
        ]}
      />
      <Reveal className="decision-grid">
        <div className="radar-card">
          <small>COMPETITOR RADAR</small>
          <span className="decision-live"><i /> LIVE MARKET SCAN</span>
          <h3>{tx(lang, ["Market check complete", "اكتمل فحص السوق"])}</h3>
          <div className="price-compare">
            <span>
              <small>{tx(lang, ["Your price", "سعرك"])}</small>
              <b>{money(34)}</b>
            </span>
            <i>→</i>
            <span>
              <small>{tx(lang, ["Aggregator market", "سوق منصة التجميع"])}</small>
              <b>{money(31)}</b>
            </span>
          </div>
          <footer>
            ✓ {localized(tx(lang, ["Safe range: QAR 32.50 to QAR 35.20", "النطاق الآمن: من 32.50 ر.ق إلى 35.20 ر.ق"]))}
          </footer>
        </div>
        <div className="sim-card">
          <small>PROMOTION SIMULATOR</small>
          <span className="decision-live"><i /> TESTING SCENARIO</span>
          <h3>{tx(lang, ["More orders. Less profit?", "طلبات أكثر، وربح أقل؟"])}</h3>
          <div className="discount-track">
            <i />
            <span>20%</span>
          </div>
          <div className="scenario danger">
            <span>{tx(lang, ["Expected orders", "الطلبات المتوقعة"])}</span>
            <b>+25%</b>
            <em>{tx(lang, ["Profit impact −7.4%", "تأثير الربح −7.4%"])}</em>
          </div>
          <div className="scenario safe">
            <span>{tx(lang, ["Safer discount", "الخصم الأكثر أماناً"])}</span>
            <b>12%</b>
            <em>{tx(lang, ["Projected return +9.2%", "العائد المتوقع +9.2%"])}</em>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function ProtectionStory({ lang }: { lang: Lang }) {
  const { money } = useMarketMoney();
  return (
    <section className="pss-section dark">
      <Intro
        lang={lang}
        kicker={["PROTECT", "الحماية"]}
        title={["Set the margin. PrizeSkout defends it.", "حدد الهامش. وPrizeSkout يحميه."]}
        body={[
          "Choose the minimum profit you are willing to make. PrizeSkout continuously calculates the safe selling price for every connected channel.",
          "حدد أقل ربح تقبل به، وسيحسب PrizeSkout باستمرار سعر البيع الآمن لكل قناة متصلة.",
        ]}
      />
      <Reveal className="protection-console">
        <div className="protection-status" aria-hidden="true"><i /><span>LIVE MARGIN MONITOR</span></div>
        <div className="protection-scan" aria-hidden="true" />
        <div className="policy-line">
          <span>{tx(lang, ["PROTECTED FLOOR", "الحد المحمي"])}</span>
          <strong>18%</strong>
          <i />
        </div>
        <div className="fee-event">
          <small>{tx(lang, ["AGGREGATOR COMMISSION", "عمولة منصة التجميع"])}</small>
          <b>
            25% <em>→</em> 27%
          </b>
          <span>{tx(lang, ["Margin would fall below policy", "سينخفض الهامش عن السياسة"])}</span>
        </div>
        <div className="safe-change">
          <small>{tx(lang, ["CURRENT", "الحالي"])}</small>
          <strong>{money(49.2,2)}</strong>
          <i>→</i>
          <small>{tx(lang, ["PROTECTED", "المحمي"])}</small>
          <strong>{money(50.6,2)}</strong>
          <button type="button">
            <span>{tx(lang, ["Approve protected change", "وافق على التغيير المحمي"])}</span>
            <b>{tx(lang, ["Protected and ready", "محمي وجاهز"])}</b>
          </button>
        </div>
        <div className="margin-gauge">
          <span>14%</span>
          <i />
          <b>18%</b>
          <i />
          <span>24%</span>
        </div>
      </Reveal>
    </section>
  );
}

function ManagerStory({ lang }: { lang: Lang }) {
  const { localized } = useMarketMoney();
  return (
    <section className="pss-section">
      <Intro
        lang={lang}
        kicker={["OPERATE", "شغّل"]}
        title={["Tell PrizeSkout once.", "أخبر PrizeSkout مرة واحدة."]}
        body={[
          "Update products, prices, availability, images and menus across connected channels from one place. PrizeSkout prepares the work. You approve the action.",
          "حدّث المنتجات والأسعار والتوفر والصور والقوائم عبر القنوات المتصلة من مكان واحد. يجهّز PrizeSkout العمل، وأنت توافق على الإجراء.",
        ]}
      />
      <Reveal className="manager-console">
        <div className="manager-live" aria-hidden="true"><i /> SHOP MANAGER WORKING</div>
        <div className="manager-prompt">
          <small>{tx(lang, ["YOU ASKED", "طلبت"])}</small>
          <p>
            {localized(tx(lang, [
              "“Add the new Truffle Burger, improve the image, set QAR 42, add 80 units and prepare it everywhere.”",
              "«أضف برجر الترفل الجديد، وحسّن الصورة، وحدد السعر عند 42 ر.ق، وأضف 80 وحدة وجهزه في كل مكان.»",
            ]))}
          </p>
        </div>
        <div className="manager-work">
          {[
            ["Product details", "تفاصيل المنتج"],
            ["Image & description", "الصورة والوصف"],
            ["Margin policy", "سياسة الهامش"],
            ["Channel requirements", "متطلبات القنوات"],
          ].map((x, i) => (
            <div key={x[0]} style={{ "--task-index": i } as React.CSSProperties}>
              <span>✓</span>
              <b>{tx(lang, x as Pair)}</b>
              <small>{tx(lang, ["Checked and ready", "تم الفحص وهو جاهز"])}</small>
            </div>
          ))}
        </div>
        <div className="publish-plan">
          <b>{tx(lang, ["Approval plan", "خطة الموافقة"])}</b>
          <span>
            Storefront <em>{tx(lang, ["Ready", "جاهز"])}</em>
          </span>
          <span>
            {tx(lang, ["Aggregator", "منصة التجميع"])} <em>{tx(lang, ["Ready", "جاهز"])}</em>
          </span>
          <span>
            POS <em className="soon">{tx(lang, ["Coming soon", "قريباً"])}</em>
          </span>
          <button type="button">
            <span>{tx(lang, ["Approve connected updates", "وافق على التحديثات المتصلة"])}</span>
            <b>{tx(lang, ["Plan ready for approval", "الخطة جاهزة للموافقة"])}</b>
          </button>
        </div>
      </Reveal>
    </section>
  );
}

function RecoveryStory({ lang }: { lang: Lang }) {
  const { money } = useMarketMoney();
  return (
    <section className="pss-section tint">
      <Intro
        lang={lang}
        kicker={["RECOVER", "استرد"]}
        title={[
          "If the numbers don’t match, PrizeSkout finds the money.",
          "إذا لم تتطابق الأرقام، يعثر PrizeSkout على الأموال.",
        ]}
        body={[
          "PrizeSkout audits commissions and payouts against the terms you agreed to, identifies discrepancies order by order and prepares the evidence needed to dispute them.",
          "يدقق PrizeSkout العمولات والدفعات مقابل الشروط المتفق عليها، ويحدد الفروقات طلباً بطلب ويجهز الأدلة اللازمة للاعتراض.",
        ]}
      />
      <Reveal className="recovery-frame">
        <header className="recovery-toolbar">
          <div><i /><b>{tx(lang, ["Payout investigation", "فحص الدفعة"])}</b></div>
          <span>{tx(lang, ["EXAMPLE DATA", "بيانات توضيحية"])}</span>
        </header>
        <div className="payout-sheet">
          <div className="payout-heading">
            <span>{tx(lang, ["PAYOUT RECEIVED", "تم استلام الدفعة"])}</span>
            <em>{tx(lang, ["RECONCILING", "جارٍ التدقيق"])}</em>
            <strong>{money(39625)}</strong>
            <small>{tx(lang, ["Settlement #ST-2048 · 184 orders", "التسوية #ST-2048 · 184 طلباً"])}</small>
          </div>
          <div className="commission-row contract-row">
            <small>{tx(lang, ["Contract commission", "عمولة العقد"])}</small>
            <b>19.0%</b>
          </div>
          <div className="commission-row flag">
            <small>{tx(lang, ["Commission charged", "العمولة المحتسبة"])}</small>
            <b>21.4%</b>
          </div>
          <div className="order-scan">
            {[
              ["#10482", money(11.02,2), money(12.41,2)],
              ["#10491", money(8.74,2), money(9.86,2)],
              ["+182", "", ""],
            ].map((order, i) => <span key={order[0]} style={{ "--scan-row": i } as React.CSSProperties}><b>{order[0]}</b>{order[1] && <><small>{tx(lang,["Expected","المتوقع"])} {order[1]}</small><em>{tx(lang,["Charged","المحتسب"])} {order[2]}</em></>}</span>)}
          </div>
          <div className="scan-line" aria-hidden="true" />
        </div>
        <div className="recovery-transfer" aria-hidden="true"><i>→</i><span /></div>
        <div className="evidence-flow">
          <div className="evidence-heading"><h3>{tx(lang, ["Building the evidence", "جارٍ تجهيز الأدلة"])}</h3><span>{tx(lang,["MATCHING RECORDS","مطابقة السجلات"])}</span></div>
          {[
            ["Agreement rate", "نسبة الاتفاقية"],
            ["184 affected orders", "184 طلباً متأثراً"],
            ["Settlement records", "سجلات التسوية"],
            ["Fee calculations", "حسابات الرسوم"],
          ].map((x, i) => (
            <span key={x[0]} style={{ animationDelay: `${i * 0.4}s` }}>
              ✓ {tx(lang, x as Pair)}
            </span>
          ))}
          <footer>
            <small>{tx(lang, ["POTENTIAL OVERCHARGE", "رسوم زائدة محتملة"])}</small>
            <b>{money(486)}</b>
            <em>✓ {tx(lang,["EVIDENCE READY FOR REVIEW","الأدلة جاهزة للمراجعة"])}</em>
            <button>{tx(lang, ["Review case", "راجع الحالة"])}</button>
          </footer>
        </div>
      </Reveal>
    </section>
  );
}

const caps: Array<[Pair, Pair, string]> = [
  [
    ["Protected Repricing", "إعادة التسعير المحمية"],
    ["Protect the minimum margin on every channel.", "احمِ الحد الأدنى للهامش في كل قناة."],
    "policy",
  ],
  [
    ["True Profit", "الربح الحقيقي"],
    ["Know what every order actually earned.", "اعرف ما حققه كل طلب فعلياً."],
    "profit",
  ],
  [
    ["CFO Copilot", "المساعد المالي"],
    ["Ask your business numbers anything.", "اسأل عن أرقام تجارتك بأي صيغة."],
    "cfo",
  ],
  [
    ["Competitor Radar", "رادار المنافسين"],
    ["See the market without racing to the bottom.", "راقب السوق دون التسابق نحو السعر الأقل."],
    "radar",
  ],
  [
    ["Promotion Simulator", "محاكي العروض"],
    ["Test campaign economics before launch.", "اختبر اقتصاديات الحملة قبل الإطلاق."],
    "promo",
  ],
  [
    ["Dispute Recovery", "استرداد النزاعات"],
    [
      "Find overcharges. Build evidence. Recover revenue.",
      "اكتشف الرسوم الزائدة، وجهز الأدلة، واسترد الإيرادات.",
    ],
    "audit",
  ],
  [
    ["AI Store Manager", "مدير المتجر بالذكاء الاصطناعي"],
    ["Ask once. Review. Publish everywhere.", "اطلب مرة واحدة، ثم راجع وانشر في كل مكان."],
    "manager",
  ],
  [
    ["Integrations", "التكاملات"],
    ["One command centre. Every channel.", "مركز تحكم واحد لكل قناة."],
    "integrations",
  ],
];
function PlatformMatrix({ lang }: { lang: Lang }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [interacting, setInteracting] = useState(false);
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => setPlaying(entry.isIntersecting), { threshold: 0.25 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!playing || interacting || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % caps.length), 4800);
    return () => window.clearInterval(timer);
  }, [playing, interacting]);
  return (
    <section className="pss-section capability-showroom" ref={sectionRef}>
      <Intro
        lang={lang}
        center
        kicker={["THE PRIZESKOUT PLATFORM", "منصة PRIZESKOUT"]}
        title={[
          "Eight capabilities. One revenue protection system.",
          "ثماني قدرات. نظام واحد لحماية الإيرادات.",
        ]}
        body={[
          "Every capability reinforces the same outcome: stronger margins, cleaner payouts and less operational drag.",
          "كل قدرة تعزز النتيجة نفسها: هوامش أقوى، ودفعات أوضح، وعبء تشغيلي أقل.",
        ]}
      />
      <Reveal className="platform-matrix" >
        {caps.map(([title, body, cls], i) => (
          <button
            type="button"
            className={`capability-card ${cls} ${active === i ? "is-active" : ""}`}
            key={title[0]}
            id={`feature-${cls}`}
            style={{ "--cap-index": i } as React.CSSProperties}
            onMouseEnter={() => { setActive(i); setInteracting(true); }}
            onMouseLeave={() => setInteracting(false)}
            onFocus={() => { setActive(i); setInteracting(true); }}
            onBlur={() => setInteracting(false)}
            onClick={() => setActive(i)}
            aria-pressed={active === i}
          >
            <span className="capability-copy"><small>0{i + 1}</small><span>{tx(lang, ["LIVE WORKFLOW", "سير عمل مباشر"])}</span></span>
            <h3>{tx(lang, title)}</h3>
            <p>{tx(lang, body)}</p>
            <CapabilityDemo kind={cls} lang={lang} />
            <span className="capability-state" aria-hidden="true"><i />{tx(lang,["See it work","شاهد كيف تعمل"])}</span>
          </button>
        ))}
      </Reveal>
    </section>
  );
}

function CapabilityDemo({ kind, lang }: { kind: string; lang: Lang }) {
  const { money, localized } = useMarketMoney();
  if (kind === "policy") return <div className="cap-demo cap-policy"><span><small>{tx(lang,["Commission changed","تغيرت العمولة"])}</small><b>18% → 21%</b></span><i>→</i><span><small>{tx(lang,["Safe price","السعر الآمن"])}</small><b>{money(46.2,2)}</b></span><em>✓ {tx(lang,["18% floor protected","تمت حماية حد 18%"])}</em></div>;
  if (kind === "profit") return <div className="cap-demo cap-profit"><span><small>{tx(lang,["Order","الطلب"])}</small><b>{money(58)}</b></span><i>−{money(12.36,2)}</i><i>−{money(21,2)}</i><strong><small>{tx(lang,["True profit","الربح الحقيقي"])}</small>{money(24.64,2)}</strong></div>;
  if (kind === "cfo") return <div className="cap-demo cap-cfo"><span>{tx(lang,["Why did margin fall?","لماذا انخفض الهامش؟"])}</span><p><i>✦</i>{tx(lang,["Fees rose on 11 products.","ارتفعت الرسوم على 11 منتجاً."])}<b>{tx(lang,["View drivers →","عرض الأسباب ←"])}</b></p></div>;
  if (kind === "radar") return <div className="cap-demo cap-radar"><span><small>{tx(lang,["Market","السوق"])}</small><b>{money(31)}</b></span><i>≠</i><span><small>{tx(lang,["Safe match","مطابقة آمنة"])}</small><b>{money(32.5,2)}</b></span><em>{tx(lang,["19.4% margin","هامش 19.4%"])}</em></div>;
  if (kind === "promo") return <div className="cap-demo cap-promo"><div><span>20%</span><i><em /></i></div><p><span>{tx(lang,["Orders","الطلبات"])} <b>+31%</b></span><span>{tx(lang,["Profit","الربح"])} <b>−7.4%</b></span></p><strong>{tx(lang,["Try 12% · profit +9.2%","جرّب 12% · الربح +9.2%"])}</strong></div>;
  if (kind === "audit") return <div className="cap-demo cap-audit">{[["184", "Orders","طلبات"],["21.4%", "Charged","محتسب"],["19%", "Agreed","متفق عليه"]].map(x=><span key={x[1]}><b>{x[0]}</b><small>{tx(lang,[x[1],x[2]] as Pair)}</small></span>)}<strong>✓ {tx(lang,["Evidence ready for review","الأدلة جاهزة للمراجعة"])}</strong></div>;
  if (kind === "manager") return <div className="cap-demo cap-manager"><p>“{localized(tx(lang,["Update price to QAR 42","حدّث السعر إلى 42 ر.ق"]))}”</p><span>✓ {tx(lang,["Storefront prepared","تم تجهيز واجهة المتجر"])}</span><span>✓ {tx(lang,["Channel update prepared","تم تجهيز تحديث القناة"])}</span><b>{tx(lang,["Review & approve","راجع ووافق"])}</b></div>;
  return <div className="cap-demo cap-integrations"><span>{tx(lang,["Storefront","واجهة المتجر"])}</span><i>→</i><strong>PS</strong><i>→</i><span>{tx(lang,["Channel","القناة"])}</span><em /><small>{tx(lang,["Orders in · approved updates out","الطلبات تدخل · التحديثات المعتمدة تخرج"])}</small></div>;
}

function OperatingDay({ lang }: { lang: Lang }) {
  const events: Array<[string, Pair, Pair]> = [
    [
      "08:00",
      ["Orders reconciled", "تمت مطابقة الطلبات"],
      ["True Profit updated", "تم تحديث الربح الحقيقي"],
    ],
    [
      "10:15",
      ["Margin risk found", "تم اكتشاف خطر على الهامش"],
      ["Protected recommendation prepared", "تم إعداد توصية محمية"],
    ],
    [
      "13:40",
      ["Promotion tested", "تم اختبار العرض"],
      ["Unsafe scenario avoided", "تم تجنب سيناريو غير آمن"],
    ],
    [
      "17:20",
      ["Store work prepared", "تم تجهيز أعمال المتجر"],
      ["Waiting for approval", "بانتظار الموافقة"],
    ],
    [
      "21:05",
      ["Payout checked", "تم فحص الدفعة"],
      ["Evidence case prepared", "تم تجهيز حالة الأدلة"],
    ],
  ];
  return (
    <section className="pss-section dark day">
      <Intro
        lang={lang}
        center
        kicker={["EXAMPLE OPERATING DAY", "مثال ليوم تشغيلي"]}
        title={[
          "PrizeSkout keeps working after you stop watching.",
          "يواصل PrizeSkout العمل بعد أن تتوقف عن المتابعة.",
        ]}
        body={[
          "A simulated day showing how the capabilities reinforce one another. This is example data, not a customer performance claim.",
          "يوم تجريبي يوضح كيف تدعم القدرات بعضها بعضاً. بيانات توضيحية وليست ادعاءً بأداء عميل.",
        ]}
      />
      <Reveal className="day-timeline">
        {events.map((x, i) => (
          <div key={x[0]} style={{ animationDelay: `${i * 0.3}s` }}>
            <time>{x[0]}</time>
            <i />
            <b>{tx(lang, x[1])}</b>
            <span>{tx(lang, x[2])}</span>
          </div>
        ))}
      </Reveal>
    </section>
  );
}

function TrustStrip({ lang }: { lang: Lang }) {
  const items: Array<Pair> = [
    ["Approval before sensitive changes", "موافقة قبل التغييرات الحساسة"],
    ["Every action recorded", "يتم تسجيل كل إجراء"],
    ["Margin policy checked", "يتم فحص سياسة الهامش"],
    ["Arabic and English", "العربية والإنجليزية"],
    ["Designed for GCC commerce", "مصمم لتجارة الخليج"],
  ];
  return (
    <section className="pss-trust">
      <p>
        {tx(lang, [
          "BUILT FOR CONTROL, NOT BLACK-BOX AUTOMATION",
          "مصمم للتحكم، لا للأتمتة الغامضة",
        ])}
      </p>
      <div>
        {items.map((x) => (
          <span key={x[0]}>✓ {tx(lang, x)}</span>
        ))}
      </div>
    </section>
  );
}

type DetailedPlan = "starter" | "standard" | "enterprise";

function DetailedPricing({ lang }: { lang: Lang }) {
  const { money } = useMarketMoney();
  const { t } = useTranslation();
  const [annual, setAnnual] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<DetailedPlan | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const copy = (plan: DetailedPlan) => ({
    audience: t(`plans.packages.${plan}.audience`),
    description: t(`plans.packages.${plan}.description`),
    features: t(`plans.packages.${plan}.features`, { returnObjects: true }) as string[],
  });
  const plans = [
    { id: "starter" as const, name: "Core", popular: false,
      best: ["One store ready to run and protect profit", "متجر واحد جاهز للتشغيل وحماية الربح"] as Pair,
      outcomes: [
        ["Understand true profit and payout health", "افهم الربح الحقيقي وصحة المدفوعات"],
        ["Set margin policies and approve protected actions", "حدد سياسات الهامش ووافق على الإجراءات المحمية"],
        ["Use CFO Copilot and AI Store Manager", "استخدم مساعد المدير المالي ومدير المتجر بالذكاء الاصطناعي"],
      ] as Pair[] },
    { id: "standard" as const, name: "Growth", popular: true,
      best: ["A growing team ready for more leverage", "فريق نام جاهز لمزيد من الكفاءة"] as Pair,
      outcomes: [
        ["Everything in Core", "كل ما في Core"],
        ["Automate protected workflows", "أتمت مسارات العمل المحمية"],
        ["Audit discrepancies and prepare recovery evidence", "دقق الفروقات وجهز أدلة الاسترداد"],
      ] as Pair[] },
    { id: "enterprise" as const, name: "Enterprise", popular: false,
      best: ["Groups that need scale and governance", "مجموعات تحتاج إلى التوسع والحوكمة"] as Pair,
      outcomes: [
        ["Everything in Growth", "كل ما في Growth"],
        ["Coordinate stores, teams and entities", "نسق المتاجر والفرق والكيانات"],
        ["Apply group controls, APIs and service levels", "طبق ضوابط المجموعة وواجهات API ومستويات الخدمة"],
      ] as Pair[] },
  ];
  return (
    <section className="pss-section pss-pricing" id="pricing">
      <Intro
        lang={lang}
        center
        kicker={["SIMPLE PRICING", "أسعار بسيطة"]}
        title={["Start with visibility. Scale into protection.", "ابدأ بالوضوح، وتوسع نحو الحماية."]}
        body={[
          "Clear limits, real capabilities and no hidden package assumptions. Choose the operating level that fits your business today.",
          "حدود واضحة وقدرات فعلية دون افتراضات مخفية. اختر مستوى التشغيل الذي يناسب أعمالك اليوم.",
        ]}
      />
      <p className="pss-plan-principle">{tx(lang, [
        "Core delivers the complete PrizeSkout value loop. Growth adds automation and capacity. Enterprise adds scale and governance.",
        "تقدم Core دورة قيمة PrizeSkout الكاملة. تضيف Growth الأتمتة والسعة. وتضيف Enterprise التوسع والحوكمة.",
      ])}</p>
      <div className="pss-billing-toggle" role="group" aria-label={tx(lang, ["Billing frequency", "دورية الفوترة"])}>
        <button type="button" aria-pressed={!annual} className={!annual ? "active" : ""} onClick={() => setAnnual(false)}>{tx(lang, ["Monthly", "شهري"])}</button>
        <button type="button" aria-pressed={annual} className={annual ? "active" : ""} onClick={() => setAnnual(true)}>{tx(lang, ["Annual", "سنوي"])} <span>{tx(lang, ["SAVE 20%", "وفر 20%"])} </span></button>
      </div>
      <div className="pss-price-grid">
        {plans.map(plan => {
          const details = copy(plan.id);
          const configuredPrice = annual ? PLAN_PRICES_QAR_ANNUAL_MONTHLY[plan.id] : PLAN_PRICES_QAR_MONTHLY[plan.id];
          const price = configuredPrice == null ? tx(lang, ["Custom", "مخصص"]) : money(configuredPrice);
          return <DetailedPrice key={plan.id} planId={plan.id} lang={lang} {...plan} price={price} annual={annual} expanded={expandedPlan === plan.id} onToggle={() => setExpandedPlan(current => current === plan.id ? null : plan.id)} {...details} />;
        })}
      </div>
      <button type="button" className="pss-compare-trigger" aria-expanded={compareOpen} onClick={() => setCompareOpen(value => !value)}>
        {compareOpen ? tx(lang, ["Hide plan comparison", "إخفاء مقارنة الخطط"]) : tx(lang, ["Compare all plans", "مقارنة كل الخطط"])}
      </button>
      {compareOpen && <div className="pss-plan-comparison">
        {plans.map(plan => {
          const details = copy(plan.id);
          return <section key={plan.id}><h4>{plan.name}</h4><ul>{details.features.map(feature => <li key={feature}>✓ {feature}</li>)}</ul></section>;
        })}
      </div>}
    </section>
  );
}

function DetailedPrice({
  planId, lang, name, price, best, outcomes, description, features, popular, annual, expanded, onToggle,
}: {
  planId: DetailedPlan;
  lang: Lang; name: string; price: string; best: Pair; outcomes: Pair[]; description: string;
  features: string[]; popular: boolean; annual: boolean; expanded: boolean; onToggle: () => void;
}) {
  const custom = name === "Enterprise";
  const limitIndex = planId === "starter" ? 0 : 1;
  const limits = features[limitIndex]?.split(" · ") ?? [];
  const visibleFeatures = expanded ? features.filter((_, index) => index !== limitIndex) : outcomes.map(outcome => tx(lang, outcome));
  return (
    <article className={`pss-price pss-price-detailed ${popular ? "popular" : ""}`}>
      {popular && <em>{tx(lang, ["MOST POPULAR", "الأكثر شيوعاً"])}</em>}
      <div className="pss-best-for"><b>{tx(lang, ["BEST FOR", "الأنسب لـ"])}</b><span>{tx(lang, best)}</span></div>
      <h3>{name}</h3>
      <strong>{price}</strong>
      {!custom && <span>/ {tx(lang, ["month", "شهر"])}</span>}
      {!custom && annual && <div className="pss-annual-note">{tx(lang, ["Billed annually", "تتم الفوترة سنوياً"])}</div>}
      <div className="pss-plan-limits">{limits.map(limit => <span key={limit}>{limit}</span>)}</div>
      {expanded && <p>{description}</p>}
      <ul>{visibleFeatures.map(feature => <li key={feature}>✓ {feature}</li>)}</ul>
      <button type="button" className="pss-feature-toggle" aria-expanded={expanded} onClick={onToggle}>
        {expanded ? tx(lang, ["Show less", "عرض أقل"]) : tx(lang, [`See all ${features.length} features`, `عرض كل الميزات وعددها ${features.length}`])}
      </button>
      <a href={custom ? "/contact" : "/onboarding"}>
        {custom ? tx(lang, ["Talk to sales", "تحدث مع المبيعات"]) : popular ? tx(lang, ["Choose Growth", "اختر Growth"]) : tx(lang, ["Get started", "ابدأ الآن"])}
      </a>
    </article>
  );
}

function Pricing({ lang }: { lang: Lang }) {
  const { money } = useMarketMoney();
  return (
    <section className="pss-section pss-pricing" id="pricing">
      <Intro
        lang={lang}
        center
        kicker={["SIMPLE PRICING", "أسعار بسيطة"]}
        title={[
          "Start with visibility. Scale into protection.",
          "ابدأ بالوضوح، وتوسع نحو الحماية.",
        ]}
        body={[
          "No bloated feature matrices. Pick the operating level that matches your restaurant today.",
          "لا جداول ميزات معقدة. اختر مستوى التشغيل الذي يناسب مطعمك اليوم.",
        ]}
      />
      <div className="pss-price-grid">
        <Price
          lang={lang}
          name="Core"
          price={money(349)}
          subtitle={["Understand and manage", "افهم وأدر"]}
          features={[
            ["Full CFO Copilot", "المساعد المالي الكامل"],
            ["AI Store Manager", "مدير المتجر بالذكاء الاصطناعي"],
            ["True Profit and payout visibility", "الربح الحقيقي ووضوح الدفعات"],
            ["Margin policies and protected actions", "سياسات الهامش والإجراءات المحمية"],
            ["Competitor Radar and promotion simulation", "رادار المنافسين ومحاكاة العروض"],
          ]}
        />
        <Price
          lang={lang}
          popular
          name="Growth"
          price={money(1099)}
          subtitle={["Protect and recover", "احمِ واسترد"]}
          features={[
            ["Everything in Core", "كل ما في Core"],
            ["Protected repricing automation", "أتمتة إعادة التسعير المحمية"],
            ["Commission and payout audits", "تدقيق العمولات والدفعات"],
            ["Recovery evidence workflows", "سير عمل أدلة الاسترداد"],
            ["More connected channels and automation", "قنوات وأتمتة أكثر"],
          ]}
        />
        <Price
          lang={lang}
          name="Enterprise"
          price={tx(lang, ["Custom", "مخصص"])}
          subtitle={["Operate at scale", "شغّل على نطاق واسع"]}
          features={[
            ["Everything in Growth", "كل ما في Growth"],
            ["Multiple locations and teams", "مواقع وفرق متعددة"],
            ["Custom policies and governance", "سياسات وحوكمة مخصصة"],
            ["Enterprise integrations and APIs", "تكاملات وواجهات مؤسسية"],
            ["Dedicated service levels", "مستويات خدمة مخصصة"],
          ]}
        />
      </div>
    </section>
  );
}
function Price({
  lang,
  name,
  price,
  subtitle,
  features,
  popular = false,
}: {
  lang: Lang;
  name: string;
  price: string;
  subtitle: Pair;
  features: Pair[];
  popular?: boolean;
}) {
  return (
    <article className={`pss-price ${popular ? "popular" : ""}`}>
      {popular && <em>{tx(lang, ["MOST POPULAR", "الأكثر شيوعاً"])}</em>}
      <small>{tx(lang, subtitle)}</small>
      <h3>{name}</h3>
      <strong>{price}</strong>
      {price !== "Custom" && price !== "مخصص" && <span>/ {tx(lang, ["month", "شهر"])}</span>}
      <ul>
        {features.map((x) => (
          <li key={x[0]}>✓ {tx(lang, x)}</li>
        ))}
      </ul>
      <a href="/onboarding">
        {popular
          ? tx(lang, ["Choose Growth", "اختر Growth"])
          : tx(lang, ["Get started", "ابدأ الآن"])}
      </a>
    </article>
  );
}

function Faq({ lang }: { lang: Lang }) {
  const qs: Array<[Pair, Pair]> = [
    [
      ["What does PrizeSkout connect to?", "بماذا يتصل PrizeSkout؟"],
      [
        "Connected storefronts and aggregators can provide catalogue, order, fee and payout information depending on their supported integration.",
        "يمكن لواجهات المتاجر ومنصات التجميع المتصلة توفير بيانات المنتجات والطلبات والرسوم والدفعات حسب التكامل المدعوم.",
      ],
    ],
    [
      ["Does PrizeSkout change prices without approval?", "هل يغير PrizeSkout الأسعار دون موافقة؟"],
      [
        "You control the policy and approval mode. Sensitive changes can remain supervised until you explicitly approve them.",
        "أنت تتحكم في السياسة ووضع الموافقة، ويمكن أن تبقى التغييرات الحساسة تحت الإشراف حتى توافق عليها صراحةً.",
      ],
    ],
    [
      ["Is recovered money guaranteed?", "هل استرداد الأموال مضمون؟"],
      [
        "No. PrizeSkout identifies potential discrepancies and organizes evidence. Final recovery depends on the agreement and the receiving platform’s process.",
        "لا. يحدد PrizeSkout الفروقات المحتملة وينظم الأدلة، ويعتمد الاسترداد النهائي على الاتفاقية وإجراءات المنصة المستلمة.",
      ],
    ],
    [
      ["What is coming soon?", "ما الذي سيأتي قريباً؟"],
      [
        "Additional POS and channel integrations will be labelled clearly until they are genuinely available.",
        "سيتم تمييز تكاملات نقاط البيع والقنوات الإضافية بوضوح حتى تصبح متاحة فعلياً.",
      ],
    ],
  ];
  return (
    <section className="pss-section pss-faq">
      <Intro
        lang={lang}
        kicker={["QUESTIONS, ANSWERED", "إجابات على أسئلتك"]}
        title={["Know exactly what PrizeSkout does.", "اعرف بالضبط ما يفعله PrizeSkout."]}
        body={["Clear answers, without inflated promises.", "إجابات واضحة دون وعود مبالغ فيها."]}
      />
      <div>
        {qs.map((q, i) => (
          <details key={q[0][0]} open={i === 0}>
            <summary>
              {tx(lang, q[0])}
              <span>+</span>
            </summary>
            <p>{tx(lang, q[1])}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function FinalCta({ lang }: { lang: Lang }) {
  return (
    <section className="pss-final">
      <div className="final-status">
        <span>✓ {tx(lang, ["Connected", "متصل"])}</span>
        <span>✓ {tx(lang, ["Margin protected", "الهامش محمي"])}</span>
        <span>✓ {tx(lang, ["Work prepared", "العمل جاهز"])}</span>
        <span>✓ {tx(lang, ["Payout monitored", "الدفعة تحت المراقبة"])}</span>
      </div>
      <h2>
        {tx(lang, [
          "Your margins should not depend on someone else’s dashboard.",
          "يجب ألا تعتمد هوامشك على لوحة تحكم جهة أخرى.",
        ])}
      </h2>
      <p>
        {tx(lang, [
          "Connect your commerce stack and put every order under active revenue protection.",
          "اربط منظومة تجارتك وضع كل طلب تحت حماية نشطة للإيرادات.",
        ])}
      </p>
      <div>
        <a href="/onboarding">{tx(lang, ["Connect your store", "اربط متجرك"])}</a>
        <a href="/contact">{tx(lang, ["Book a demo", "احجز عرضاً توضيحياً"])}</a>
      </div>
    </section>
  );
}
