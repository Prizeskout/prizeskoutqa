import { useEffect, useMemo, useState } from "react";
import { landingMoney, localizeLandingMoney, type LandingMarket } from "./currency";
import "./ProductHeroDemo.css";

type DemoLanguage = "en" | "ar";
type DemoStage = {
  id: string;
  nav: [string, string];
  eyebrow: [string, string];
  title: [string, string];
  body: [string, string];
  outcome: [string, string];
  action: [string, string];
  duration?: number;
};

const stages: DemoStage[] = [
  {id:"connect",nav:["Connect","الربط"],eyebrow:["BAYT BURGER · GETTING STARTED","بيت برجر · بدء الاستخدام"],title:["Connect once. PrizeSkout starts organizing.","اربط مرة واحدة، وسيبدأ PrizeSkout بالتنظيم"],body:["Catalogue, orders, fees and payouts begin flowing into one trusted record.","تبدأ المنتجات والطلبات والرسوم والدفعات بالتدفق إلى سجل موحد وموثوق."],outcome:["Bayt Burger is ready to monitor","بيت برجر جاهز للمتابعة"],action:["4,286 records synced","تمت مزامنة 4,286 سجلاً"],duration:2600},
  {id:"profit",nav:["True Profit","الربح الحقيقي"],eyebrow:["ORDER ECONOMICS","ربحية الطلبات"],title:["See what each order actually earned","اعرف ما حققه كل طلب فعلياً"],body:["Sales, commission, tax, promotion and product cost are reconciled automatically.","تتم مطابقة المبيعات والعمولات والضرائب والعروض وتكلفة المنتج تلقائياً."],outcome:["QAR 24.64 kept from this order","تم الاحتفاظ بـ 24.64 ر.ق من هذا الطلب"],action:["Margin calculated","تم حساب الهامش"]},
  {id:"copilot",nav:["CFO Copilot","المساعد المالي"],eyebrow:["ASK YOUR NUMBERS","اسأل عن أرقامك"],title:["Why did my Jahez margin fall?","لماذا انخفض هامشي على جاهز؟"],body:["CFO Copilot reads the order evidence and explains the cause in plain language.","يقرأ المساعد المالي أدلة الطلب ويشرح السبب بلغة بسيطة."],outcome:["Commission rose 2% · margin fell 3.8%","ارتفعت العمولة 2% · انخفض الهامش 3.8%"],action:["Recommendation ready","التوصية جاهزة"]},
  {id:"radar",nav:["Competitors","المنافسون"],eyebrow:["COMPETITOR RADAR","رادار المنافسين"],title:["Check the market without racing to the bottom","راقب السوق دون الدخول في حرب أسعار"],body:["A live product check is compared with your costs and protected margin.","تتم مقارنة سعر المنتج لدى المنافس بتكاليفك وهامشك المحمي."],outcome:["Safe recommendation: QAR 32.50","التوصية الآمنة: 32.50 ر.ق"],action:["19.4% margin protected","هامش 19.4% محمي"]},
  {id:"promo",nav:["Simulate","المحاكاة"],eyebrow:["PROMOTION SIMULATOR","محاكي العروض"],title:["Test the promotion before customers see it","اختبر العرض قبل أن يراه العملاء"],body:["PrizeSkout models the discount, platform funding, fees and expected order lift.","يحسب PrizeSkout الخصم وتمويل المنصة والرسوم والزيادة المتوقعة في الطلبات."],outcome:["12% discount produces the safer return","خصم 12% يحقق العائد الأكثر أماناً"],action:["Scenario improved","تم تحسين السيناريو"]},
  {id:"reprice",nav:["Protect","الحماية"],eyebrow:["PROTECTED REPRICING","إعادة التسعير المحمية"],title:["Respond to fee changes without losing margin","استجب لتغير الرسوم دون خسارة الهامش"],body:["A new price is prepared inside your policy limits. You approve before it is published.","يتم إعداد سعر جديد ضمن حدود سياستك، وتوافق عليه قبل نشره."],outcome:["QAR 49.20 → QAR 50.60","49.20 ر.ق ← 50.60 ر.ق"],action:["18% floor respected","تم احترام حد الهامش 18%"]},
  {id:"manage",nav:["Manage","الإدارة"],eyebrow:["AI STORE MANAGER","مدير المتجر بالذكاء الاصطناعي"],title:["Turn a request into a controlled workflow","حوّل طلبك إلى سير عمل منظم"],body:["Update products, stock, images and prices across channels with a clear plan and approval.","حدّث المنتجات والمخزون والصور والأسعار عبر القنوات، مع خطة واضحة وموافقة."],outcome:["6 updates prepared across 3 channels","تم إعداد 6 تحديثات عبر 3 قنوات"],action:["Waiting for your approval","بانتظار موافقتك"]},
  {id:"publish",nav:["Publish","النشر"],eyebrow:["ONE APPROVED DECISION","قرار واحد معتمد"],title:["The protected change reaches every connected channel","يصل التغيير المحمي إلى كل قناة متصلة"],body:["PrizeSkout records what changed, where it changed and whether every channel accepted it.","يسجل PrizeSkout ما تغير وأين تغير وما إذا كانت كل قناة قد قبلته."],outcome:["One decision applied across connected channels","تم تطبيق قرار واحد عبر القنوات المتصلة"],action:["Workflow complete","اكتمل سير العمل"],duration:4600},
  {id:"recover",nav:["Recover","الاسترداد"],eyebrow:["THE LOOP STAYS ON","تستمر دورة الحماية"],title:["After publishing, PrizeSkout keeps checking the money","بعد النشر، يواصل PrizeSkout تدقيق الأموال"],body:["Contract terms are checked against the next payout and supporting evidence is organized.","تتم مقارنة شروط العقد بالدفعة التالية وتنظيم الأدلة الداعمة."],outcome:["Potential overcharge identified: QAR 486","رسوم زائدة محتملة: 486 ر.ق"],action:["Evidence pack ready","ملف الأدلة جاهز"],duration:4300},
];

const ui: Record<string, [string, string]> = {
  demo:["GUIDED PRODUCT DEMO · EXAMPLE DATA","عرض توضيحي للمنتج · بيانات تجريبية"],
  pause:["Pause demo","إيقاف العرض"], play:["Play demo","تشغيل العرض"],
  journey:["One connected workflow","سير عمل واحد مترابط"],
  connected:["Connected","متصل"], soon:["Coming soon","قريباً"], protected:["Protected","محمي"],
  orders:["Orders","الطلبات"], catalogue:["Products","المنتجات"], payouts:["Payouts","الدفعات"],
  gross:["Order value","قيمة الطلب"], commission:["Commission & fees","العمولة والرسوم"], costs:["Product cost","تكلفة المنتج"],
  merchant:["Merchant request","طلب التاجر"], assistant:["PrizeSkout analysis","تحليل PrizeSkout"],
  before:["Current","الحالي"], after:["Recommended","الموصى به"],
};

const cursorPaths: Record<string, Array<[number,number,[string,string]]>> = {
  connect:[[13,46,["Select channel","اختر القناة"]],[38,55,["Connect securely","اتصل بأمان"]],[71,72,["Syncing now","تجري المزامنة"]]],
  profit:[[22,55,["Open order","افتح الطلب"]],[55,61,["Match costs","طابق التكاليف"]],[77,77,["True profit","الربح الحقيقي"]]],
  copilot:[[69,50,["Ask CFO","اسأل المساعد المالي"]],[45,67,["Reading evidence","قراءة الأدلة"]],[76,79,["View action","اعرض الإجراء"]]],
  radar:[[28,63,["Check price","تحقق من السعر"]],[53,64,["Compare","قارن"]],[79,65,["Safe price","السعر الآمن"]]],
  promo:[[28,65,["Try 20%","جرّب 20%"]],[51,60,["Compare scenarios","قارن السيناريوهات"]],[73,65,["Choose safer","اختر الأكثر أماناً"]]],
  reprice:[[28,64,["Current price","السعر الحالي"]],[52,65,["Apply policy","طبّق السياسة"]],[75,65,["Review change","راجع التغيير"]]],
  recover:[[29,60,["Open payout","افتح الدفعة"]],[55,62,["Check contract","تحقق من العقد"]],[74,78,["Build evidence","جهّز الأدلة"]]],
  manage:[[28,57,["Delegate task","فوّض المهمة"]],[62,58,["Prepare changes","جهّز التغييرات"]],[75,76,["Review plan","راجع الخطة"]]],
  publish:[[31,57,["Approve plan","وافق على الخطة"]],[54,64,["Publish changes","انشر التغييرات"]],[77,71,["Verify channels","تحقق من القنوات"]]],
};

export function ProductHeroDemo({lang,market}:{lang:DemoLanguage;market:LandingMarket}) {
  const [active,setActive]=useState(0);
  const [playing,setPlaying]=useState(true);
  const [reduceMotion,setReduceMotion]=useState(false);
  const [phase,setPhase]=useState(0);
  const t=(pair:[string,string])=>localizeLandingMoney(pair[lang==="ar"?1:0],market);
  useEffect(()=>{const media=window.matchMedia("(prefers-reduced-motion: reduce)");const sync=()=>{setReduceMotion(media.matches);if(media.matches)setPlaying(false)};sync();media.addEventListener("change",sync);return()=>media.removeEventListener("change",sync)},[]);
  useEffect(()=>{if(!playing||reduceMotion)return;const timer=window.setTimeout(()=>setActive(value=>(value+1)%stages.length),stages[active].duration??3600);return()=>window.clearTimeout(timer)},[active,playing,reduceMotion]);
  useEffect(()=>{setPhase(0);if(!playing||reduceMotion)return;const first=window.setTimeout(()=>setPhase(1),760);const second=window.setTimeout(()=>setPhase(2),1650);return()=>{window.clearTimeout(first);window.clearTimeout(second)}},[active,playing,reduceMotion]);
  const stage=stages[active];
  const cursor=cursorPaths[stage.id][phase];
  const panel=useMemo(()=>renderPanel(stage.id,lang,t,phase,market),[stage.id,lang,phase,market]);
  const select=(index:number)=>{setActive(index);setPlaying(false)};
  return <section className="phd" dir={lang==="ar"?"rtl":"ltr"} aria-label={t(ui.demo)}>
    <div className="phd-topbar">
      <div className="phd-demo-label"><i/> {t(ui.demo)}</div>
      <div className="phd-story"><span>BB</span><div><b>Bayt Burger</b><small>{lang==="ar"?"قصة واحدة · من الاتصال إلى النشر":"One story · connection to action"}</small></div></div>
      <div className="phd-top-actions"><span>{String(active+1).padStart(2,"0")} / {String(stages.length).padStart(2,"0")}</span><button type="button" onClick={()=>setPlaying(v=>!v)} aria-label={playing?t(ui.pause):t(ui.play)}>{playing?"Ⅱ":"▶"} <b>{playing?t(ui.pause):t(ui.play)}</b></button></div>
    </div>
    <div className="phd-steps" role="tablist" aria-label={t(ui.journey)}>{stages.map((item,index)=><button key={item.id} type="button" role="tab" aria-selected={index===active} className={index===active?"active":""} onClick={()=>select(index)}><span>{String(index+1).padStart(2,"0")}</span>{t(item.nav)}</button>)}</div>
    <div className="phd-stage" key={stage.id} data-scene={String(active+1).padStart(2,"0")}>
      <aside className="phd-channels">
        <header><span className="phd-pulse"/><div><b>{t(ui.journey)}</b><small>{lang==="ar"?"مزامنة آمنة ومستمرة":"Secure, continuous sync"}</small></div></header>
        <Channel name="Zid" status={t(ui.connected)} active={["connect","publish"].includes(stage.id)}/>
        <Channel name="Jahez" status={t(ui.connected)} active={["profit","copilot","reprice","recover"].includes(stage.id)}/>
        <Channel name="Talabat" status={t(ui.connected)} active={["manage","publish"].includes(stage.id)}/>
        <Channel name="Foodics" status={t(ui.soon)} soon/>
        <footer><div><strong>2,840</strong><small>{t(ui.orders)}</small></div><div><strong>1,432</strong><small>{t(ui.catalogue)}</small></div><div><strong>14</strong><small>{t(ui.payouts)}</small></div></footer>
      </aside>
      <article className={`phd-workspace phd-${stage.id} phd-action-${phase}`}>
        <div className="phd-appbar"><div><i/><i/><i/></div><span>PrizeSkout · Bayt Burger</span><em>{lang==="ar"?"مباشر":"LIVE"}</em></div>
        {!reduceMotion&&<div className={`phd-cursor phase-${phase}`} style={{left:`${cursor[0]}%`,top:`${cursor[1]}%`}} aria-hidden="true"><svg viewBox="0 0 30 38"><path d="M3 2.5 26 24l-10.3 1.5L10.5 35 3 2.5Z"/></svg><span>{t(cursor[2])}</span><i/></div>}
        <div className="phd-copy"><div><small>{t(stage.eyebrow)}</small><h3>{t(stage.title)}</h3><p>{t(stage.body)}</p></div><span className="phd-live"><i/>{lang==="ar"?"يعمل الآن":"Working now"}</span></div>
        {panel}
        <div className="phd-activity"><span>{phase===0?"01":phase===1?"02":"03"}</span><b>{t(cursor[2])}</b><i>{phase<2?(lang==="ar"?"جارٍ التنفيذ":"in progress"):(lang==="ar"?"تم":"complete")}</i></div>
        <div className="phd-result"><span>✓</span><div><small>{lang==="ar"?"النتيجة":"OUTCOME"}</small><strong>{t(stage.outcome)}</strong></div><em>{t(stage.action)}</em></div>
      </article>
    </div>
    <div className="phd-progress" aria-hidden="true"><span key={`${active}-${playing}`} style={{animationDuration:playing?`${stage.duration??3600}ms`:"0ms"}}/></div>
  </section>
}

function Channel({name,status,active=false,soon=false}:{name:string,status:string,active?:boolean,soon?:boolean}){return <div className={`phd-channel ${active?"active":""} ${soon?"soon":""}`}><span className="phd-channel-logo">{name.slice(0,1)}</span><b>{name}</b><em>{status}</em></div>}

function renderPanel(id:string,lang:DemoLanguage,t:(pair:[string,string])=>string,phase:number,market:LandingMarket){
  const money=(value:number,digits?:number)=>landingMoney(market,value,digits);
  if(id==="connect")return <div className="phd-sync"><div className="phd-sync-ring"><span>✓</span></div><div><b>{lang==="ar"?"تم الاتصال بنجاح":"Connection complete"}</b><p>{lang==="ar"?"جاري تنظيم بيانات القنوات في سجل موحد":"Organizing channel data into one trusted record"}</p><div className="phd-sync-lines"><i/><i/><i/></div></div></div>;
  if(id==="profit")return <div className="phd-ledger"><div><span>{t(ui.gross)}</span><b>{money(58,2)}</b></div><div><span>{t(ui.commission)}</span><b className="negative">− {money(12.36,2)}</b></div><div><span>{t(ui.costs)}</span><b className="negative">− {money(21,2)}</b></div><div className="total"><span>{lang==="ar"?"ربحك الحقيقي":"True profit"}</span><b>{money(24.64,2)}</b></div></div>;
  if(id==="copilot")return <div className="phd-chat"><div className="merchant"><small>{t(ui.merchant)}</small>{lang==="ar"?"لماذا انخفض هامشي على جاهز هذا الأسبوع؟":"Why did my Jahez margin fall this week?"}</div><div className="assistant"><small>{t(ui.assistant)}</small><b>{lang==="ar"?"وجدت السبب":"I found the cause"}</b><p>{lang==="ar"?"ارتفعت عمولة التوصيل من 25% إلى 27% بينما بقي سعر القائمة كما هو.":"Delivery commission increased from 25% to 27% while your menu price stayed unchanged."}</p></div></div>;
  if(id==="radar")return <div className="phd-compare"><div><small>{lang==="ar"?"سعرك":"Your price"}</small><strong>{money(34,2)}</strong><em>{lang==="ar"?"هامش 22.7%":"22.7% margin"}</em></div><span>→</span><div><small>{lang==="ar"?"سعر المنافس":"Competitor"}</small><strong>{money(31,2)}</strong><em>{lang==="ar"?"تم التحقق الآن":"Checked now"}</em></div><span>→</span><div className="recommended"><small>{t(ui.after)}</small><strong>{money(32.5,2)}</strong><em>{t(ui.protected)}</em></div></div>;
  if(id==="promo")return <div className="phd-scenarios"><div><small>20% {lang==="ar"?"خصم":"discount"}</small><strong>−7.4%</strong><span>{lang==="ar"?"تأثير الربح":"profit impact"}</span></div><div className="best"><small>12% {lang==="ar"?"خصم":"discount"}</small><strong>+9.2%</strong><span>{lang==="ar"?"عائد متوقع":"projected return"}</span><em>{lang==="ar"?"الأكثر أماناً":"SAFER"}</em></div><div><small>8% {lang==="ar"?"خصم":"discount"}</small><strong>+4.1%</strong><span>{lang==="ar"?"عائد متوقع":"projected return"}</span></div></div>;
  if(id==="reprice")return <div className="phd-price"><div><small>{t(ui.before)}</small><strong>{money(49.2,2)}</strong><span>{lang==="ar"?"عمولة 25%":"25% commission"}</span></div><div className="phd-arrow">→</div><div><small>{t(ui.after)}</small><strong>{money(50.6,2)}</strong><span>{lang==="ar"?"عمولة 27%":"27% commission"}</span></div><div className="phd-floor"><i/> {lang==="ar"?"لن ينخفض الهامش عن 18%":"Margin will not fall below 18%"}</div></div>;
  if(id==="recover")return <div className="phd-audit"><div><span>{lang==="ar"?"عمولة العقد":"Contract commission"}</span><b>19.0%</b></div><div><span>{lang==="ar"?"العمولة المحتسبة":"Charged commission"}</span><b className="negative">21.4%</b></div><div><span>{lang==="ar"?"الطلبات المتأثرة":"Affected orders"}</span><b>184</b></div><div className="evidence"><span>✓</span>{lang==="ar"?"العقد والدفعات والطلبات مرتبطة بالأدلة":"Contract, payout and orders linked as evidence"}</div></div>;
  if(id==="manage")return <div className="phd-manager"><div className="request">“{lang==="ar"?"طبّق السعر المحمي وحدّث صور الوجبة في كل القنوات.":"Apply the protected price and update the meal images across every channel."}”</div><div className="phd-task"><span>{phase>0?"✓":"…"}</span><div><b>{lang==="ar"?"الصور والمحتوى":"Images & content"}</b><small>{phase>0?(lang==="ar"?"3 منتجات جاهزة للمراجعة":"3 products ready for review"):(lang==="ar"?"جارٍ تجهيز التغييرات":"Preparing changes")}</small></div></div><div className="phd-task"><span>{phase>1?"✓":"…"}</span><div><b>{lang==="ar"?"المخزون والأسعار":"Stock & prices"}</b><small>{phase>1?(lang==="ar"?"تم التحقق من السياسات والهوامش":"Policies and margins checked"):(lang==="ar"?"جارٍ فحص السياسات":"Checking policies")}</small></div></div></div>;
  return <div className="phd-publish"><div className="phd-approval"><span>{phase>0?"✓":"→"}</span><div><small>{lang==="ar"?"موافقة التاجر":"MERCHANT APPROVAL"}</small><b>{phase>0?(lang==="ar"?"تمت الموافقة على الخطة":"Plan approved"):(lang==="ar"?"الخطة جاهزة للمراجعة":"Plan ready to review")}</b></div></div><div className="phd-publish-grid"><PublishRow name="Zid" state={phase>0?"done":"waiting"} lang={lang}/><PublishRow name="Jahez" state={phase>1?"done":"waiting"} lang={lang}/><PublishRow name="Talabat" state={phase>1?"done":"waiting"} lang={lang}/><PublishRow name="Foodics" state="soon" lang={lang}/></div></div>;
}

function PublishRow({name,state,lang}:{name:string,state:"waiting"|"done"|"soon",lang:DemoLanguage}){const label=state==="soon"?(lang==="ar"?"قريباً":"Coming soon"):state==="done"?(lang==="ar"?"تم التحديث":"Updated"):(lang==="ar"?"بانتظار النشر":"Queued");return <div className={state}><span>{name.slice(0,1)}</span><b>{name}</b><em>{state==="done"?"✓ ":state==="waiting"?"● ":""}{label}</em></div>}
