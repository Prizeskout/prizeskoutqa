import { useEffect, useRef, useState } from "react";
import logo from "@/assets/logo-light.svg";
import "./ProductStorySections.css";

type Lang = "en" | "ar";
type Pair = [string, string];
const tx = (lang: Lang, p: Pair) => p[lang === "ar" ? 1 : 0];

export function ProductStorySections({ lang }: { lang: Lang }) {
  return (
    <div className="pss" dir={lang === "ar" ? "rtl" : "ltr"}>
      <CommerceNetwork lang={lang} />
      <ProfitStory lang={lang} />
      <ProtectionStory lang={lang} />
      <DecisionStory lang={lang} />
      <RecoveryStory lang={lang} />
      <ManagerStory lang={lang} />
      <PlatformMatrix lang={lang} />
      <OperatingDay lang={lang} />
      <TrustStrip lang={lang} />
      <Pricing lang={lang} />
      <Faq lang={lang} />
      <FinalCta lang={lang} />
    </div>
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
            <strong>QAR 58.00</strong>
            <small>{tx(lang, ["Aggregator · #10482", "منصة التجميع · #10482"])}</small>
            <div className="order-meta"><span>{tx(lang, ["Paid", "مدفوع"])}</span><span>18:42</span></div>
          </div>
          <div className="profit-transfer" aria-hidden="true"><i /></div>
          <div className="profit-ledger">
            <header><span>{tx(lang, ["COST RECONCILIATION", "مطابقة التكاليف"])}</span><small>{tx(lang, ["4 of 4 matched", "تمت مطابقة 4 من 4"])}</small></header>
          {[
            ["Order value", "قيمة الطلب", "QAR 58.00", ""],
            ["Commission & fees", "العمولة والرسوم", "− QAR 12.36", "minus"],
            ["Product cost", "تكلفة المنتج", "− QAR 21.00", "minus"],
            ["True profit", "الربح الحقيقي", "QAR 24.64", "total"],
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
            <p>{tx(lang, ["Fees consumed 21.3% of this order. After every known cost, QAR 24.64 remains as true profit.", "استهلكت الرسوم 21.3% من هذا الطلب. وبعد كل التكاليف المعروفة، تبقى 24.64 ر.ق كربح حقيقي."])}</p>
            <div className="copilot-proof"><span>{tx(lang, ["Known costs", "التكاليف المعروفة"])} <b>100%</b></span><i><em /></i></div>
          </div>
        </div>
        <DemoCursor label={tx(lang, ["Explain this order", "اشرح هذا الطلب"])} />
      </Reveal>
    </section>
  );
}

function DecisionStory({ lang }: { lang: Lang }) {
  return (
    <section className="pss-section tint">
      <Intro
        lang={lang}
        kicker={["COMPETITOR RADAR + PROMOTION SIMULATOR", "رادار المنافسين + محاكي العروض"]}
        title={["Competitive without becoming unprofitable.", "نافس دون أن تصبح غير مربح."]}
        body={[
          "Competitor context and promotion economics meet in one safe recommendation—not a race to the lowest price.",
          "تجتمع بيانات المنافسين واقتصاديات العرض في توصية آمنة، لا في سباق نحو السعر الأقل.",
        ]}
      />
      <Reveal className="decision-grid">
        <div className="radar-card">
          <small>COMPETITOR RADAR</small>
          <h3>{tx(lang, ["Market check complete", "اكتمل فحص السوق"])}</h3>
          <div className="price-compare">
            <span>
              <small>{tx(lang, ["Your price", "سعرك"])}</small>
              <b>QAR 34</b>
            </span>
            <i>→</i>
            <span>
              <small>{tx(lang, ["Aggregator market", "سوق منصة التجميع"])}</small>
              <b>QAR 31</b>
            </span>
          </div>
          <footer>
            ✓ {tx(lang, ["Safe range: QAR 32.50–35.20", "النطاق الآمن: 32.50–35.20 ر.ق"])}
          </footer>
        </div>
        <div className="sim-card">
          <small>PROMOTION SIMULATOR</small>
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
          <DemoCursor label={tx(lang, ["Choose safer scenario", "اختر السيناريو الآمن"])} />
        </div>
      </Reveal>
    </section>
  );
}

function ProtectionStory({ lang }: { lang: Lang }) {
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
          <strong>QAR 49.20</strong>
          <i>→</i>
          <small>{tx(lang, ["PROTECTED", "المحمي"])}</small>
          <strong>QAR 50.60</strong>
          <button>{tx(lang, ["Approve protected change", "وافق على التغيير المحمي"])}</button>
        </div>
        <div className="margin-gauge">
          <span>14%</span>
          <i />
          <b>18%</b>
          <i />
          <span>24%</span>
        </div>
        <DemoCursor label={tx(lang, ["Review & approve", "راجع ووافق"])} />
      </Reveal>
    </section>
  );
}

function ManagerStory({ lang }: { lang: Lang }) {
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
        <div className="manager-prompt">
          <small>{tx(lang, ["YOU ASKED", "طلبت"])}</small>
          <p>
            {tx(lang, [
              "“Add the new Truffle Burger, improve the image, set QAR 42, add 80 units and prepare it everywhere.”",
              "«أضف برجر الترفل الجديد، وحسّن الصورة، وحدد السعر عند 42 ر.ق، وأضف 80 وحدة وجهزه في كل مكان.»",
            ])}
          </p>
        </div>
        <div className="manager-work">
          {[
            ["Product details", "تفاصيل المنتج"],
            ["Image & description", "الصورة والوصف"],
            ["Margin policy", "سياسة الهامش"],
            ["Channel requirements", "متطلبات القنوات"],
          ].map((x, i) => (
            <div key={x[0]} style={{ animationDelay: `${i * 0.35}s` }}>
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
          <button>{tx(lang, ["Approve connected updates", "وافق على التحديثات المتصلة"])}</button>
        </div>
        <DemoCursor label={tx(lang, ["Approve plan", "وافق على الخطة"])} />
      </Reveal>
    </section>
  );
}

function RecoveryStory({ lang }: { lang: Lang }) {
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
            <strong>QAR 39,625</strong>
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
              ["#10482", "QAR 11.02", "QAR 12.41"],
              ["#10491", "QAR 8.74", "QAR 9.86"],
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
            <b><span>QAR</span> 486</b>
            <em>✓ {tx(lang,["EVIDENCE READY FOR REVIEW","الأدلة جاهزة للمراجعة"])}</em>
            <button>{tx(lang, ["Review case", "راجع الحالة"])}</button>
          </footer>
        </div>
        <DemoCursor label={tx(lang, ["Review case", "راجع الحالة"])} />
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
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => setPlaying(entry.isIntersecting), { threshold: 0.25 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!playing || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % caps.length), 6200);
    return () => window.clearInterval(timer);
  }, [playing]);
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
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onClick={() => setActive(i)}
            aria-pressed={active === i}
          >
            <span className="capability-copy"><small>0{i + 1}</small><span>{tx(lang, ["LIVE WORKFLOW", "سير عمل مباشر"])}</span></span>
            <h3>{tx(lang, title)}</h3>
            <p>{tx(lang, body)}</p>
            <CapabilityDemo kind={cls} lang={lang} />
            <i className="capability-progress" aria-hidden="true" />
          </button>
        ))}
      </Reveal>
    </section>
  );
}

function CapabilityDemo({ kind, lang }: { kind: string; lang: Lang }) {
  if (kind === "policy") return <div className="cap-demo cap-policy"><span><small>{tx(lang,["Commission changed","تغيرت العمولة"])}</small><b>18% → 21%</b></span><i>→</i><span><small>{tx(lang,["Safe price","السعر الآمن"])}</small><b>QAR 46.20</b></span><em>✓ {tx(lang,["18% floor protected","تمت حماية حد 18%"])}</em></div>;
  if (kind === "profit") return <div className="cap-demo cap-profit"><span><small>{tx(lang,["Order","الطلب"])}</small><b>QAR 58</b></span><i>−12.36</i><i>−21.00</i><strong><small>{tx(lang,["True profit","الربح الحقيقي"])}</small>QAR 24.64</strong></div>;
  if (kind === "cfo") return <div className="cap-demo cap-cfo"><span>{tx(lang,["Why did margin fall?","لماذا انخفض الهامش؟"])}</span><p><i>✦</i>{tx(lang,["Fees rose on 11 products.","ارتفعت الرسوم على 11 منتجاً."])}<b>{tx(lang,["View drivers →","عرض الأسباب ←"])}</b></p></div>;
  if (kind === "radar") return <div className="cap-demo cap-radar"><span><small>{tx(lang,["Market","السوق"])}</small><b>QAR 31</b></span><i>≠</i><span><small>{tx(lang,["Safe match","مطابقة آمنة"])}</small><b>QAR 32.50</b></span><em>{tx(lang,["19.4% margin","هامش 19.4%"])}</em></div>;
  if (kind === "promo") return <div className="cap-demo cap-promo"><div><span>20%</span><i><em /></i></div><p><span>{tx(lang,["Orders","الطلبات"])} <b>+31%</b></span><span>{tx(lang,["Profit","الربح"])} <b>−7.4%</b></span></p><strong>{tx(lang,["Try 12% · profit +9.2%","جرّب 12% · الربح +9.2%"])}</strong></div>;
  if (kind === "audit") return <div className="cap-demo cap-audit">{[["184", "Orders","طلبات"],["21.4%", "Charged","محتسب"],["19%", "Agreed","متفق عليه"]].map(x=><span key={x[1]}><b>{x[0]}</b><small>{tx(lang,[x[1],x[2]] as Pair)}</small></span>)}<strong>✓ {tx(lang,["Evidence ready for review","الأدلة جاهزة للمراجعة"])}</strong></div>;
  if (kind === "manager") return <div className="cap-demo cap-manager"><p>“{tx(lang,["Update price to QAR 42","حدّث السعر إلى 42 ر.ق"])}”</p><span>✓ {tx(lang,["Storefront prepared","تم تجهيز واجهة المتجر"])}</span><span>✓ {tx(lang,["Channel update prepared","تم تجهيز تحديث القناة"])}</span><b>{tx(lang,["Review & approve","راجع ووافق"])}</b></div>;
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
          "A simulated day showing how the capabilities reinforce one another. Example data—not a customer performance claim.",
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

function Pricing({ lang }: { lang: Lang }) {
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
          price="QAR 349"
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
          price="QAR 1,099"
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
      {price.startsWith("QAR") && <span>/ {tx(lang, ["month", "شهر"])}</span>}
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
function DemoCursor({ label }: { label: string }) {
  return (
    <div className="pss-cursor" aria-hidden="true">
      <svg viewBox="0 0 30 38">
        <path d="M3 2.5 26 24l-10.3 1.5L10.5 35 3 2.5Z" />
      </svg>
      <span>{label}</span>
      <i />
    </div>
  );
}
