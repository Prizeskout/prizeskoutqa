export default async ({ project }) => {
  const W = 1920, H = 1080;
  const p = await project({ dir: ".", size: `${W}x${H}`, fps: 30, background: "#071329" });

  const urls = {
    overview: "https://d2ol7oe51mr4n9.cloudfront.net/user_3JU1uXtScliXyT2iN9Ywi6VDZZy/26f5ba5f-7698-4313-8941-0b6e84cd1afb.png",
    integrations: "https://d2ol7oe51mr4n9.cloudfront.net/user_3JU1uXtScliXyT2iN9Ywi6VDZZy/1d211b70-56a6-4b43-8cbf-3a5e1380203e.png",
    recovery: "https://d2ol7oe51mr4n9.cloudfront.net/user_3JU1uXtScliXyT2iN9Ywi6VDZZy/0c5e68d0-4b8e-4849-9c69-8daae8784c8f.png",
    margin: "https://d2ol7oe51mr4n9.cloudfront.net/user_3JU1uXtScliXyT2iN9Ywi6VDZZy/256937d3-3592-4351-93d1-7b05f8009e03.png",
    promotions: "https://d2ol7oe51mr4n9.cloudfront.net/user_3JU1uXtScliXyT2iN9Ywi6VDZZy/01bd0d60-57fb-4252-9db9-9aca647a17e7.png",
    defend: "https://d2ol7oe51mr4n9.cloudfront.net/user_3JU1uXtScliXyT2iN9Ywi6VDZZy/de40cc07-a4ea-4ccb-8beb-580b2f4b9812.png",
    manager: "https://d2ol7oe51mr4n9.cloudfront.net/user_3JU1uXtScliXyT2iN9Ywi6VDZZy/a8cae118-d2e3-475d-a37e-d300856573c9.png",
    copilot: "https://d2ol7oe51mr4n9.cloudfront.net/user_3JU1uXtScliXyT2iN9Ywi6VDZZy/de1c7f5c-dda7-4f9c-b8d0-2e2c4b4bb674.png",
    catalog: "https://d2ol7oe51mr4n9.cloudfront.net/user_3JU1uXtScliXyT2iN9Ywi6VDZZy/210ad17f-d78a-49a7-b0a3-240c45f3e8be.png",
  };
  const m = {};
  for (const [k, url] of Object.entries(urls)) m[k] = await p.add(url);

  const enter = (dx=0, dy=60, rot=0) => ({
    enter: { from: { x: dx, y: dy, opacity: 0, scale: 0.94, rotation: rot }, duration: 0.55, easing: "ease-out" },
    exit: { to: { y: -30, opacity: 0, scale: 1.025 }, duration: 0.28, anchor: "end", easing: "ease-in" }
  });
  const full = (img, zoom=1.02, panX=0, panY=0) => (
    <frame x={0} y={0} width={W} height={H} clip background="#071329">
      <media file={img} x={panX} y={panY} width={W*zoom} height={H*zoom} fit="cover"
        animate={[{property:"scale", from:1, to:1.045, duration:2.2, easing:"linear"}]} />
      <rect x={0} y={0} width={W} height={H} fill="#07132966" />
    </frame>
  );
  const panel = (img, x, y, w, h, rot=0, delay=0) => (
    <frame x={x} y={y} width={w} height={h} clip radius={28} background="#ffffff"
      shadow={{ color:"#00000088", blur:44, x:0, y:24 }} motion={{enter:{from:{x:rot<0?-180:180,y:80,opacity:0,scale:.82,rotation:rot+(rot<0?-5:5)},duration:.65,at:delay,easing:"bounce"},exit:{to:{y:-70,opacity:0,scale:1.04},duration:.3,anchor:"end"}}}>
      <media file={img} x={0} y={0} width={w} height={h} fit="cover" />
    </frame>
  );
  const eyebrow = (txt, y=110) => <text x={150} y={y} width={1620} height={42} fontSize={6} fontWeight={700} letterSpacing={1} color="#ff6b22">{txt.toUpperCase()}</text>;
  const title = (txt, y=160, size=92) => <text x={145} y={y} width={980} height={96} fontSize={size*.12} fontWeight={800} lineHeight={.95} letterSpacing={-1} color="#ffffff">{txt}</text>;
  const chip = (txt,x,y,color="#ff641d",delay=0) => <frame x={x} y={y} width={250} height={72} radius={36} background={color} padding={20} motion={{enter:{from:{y:30,scale:.7,opacity:0},duration:.45,at:delay,easing:"bounce"}}}><text width={210} height={36} fontSize={6} fontWeight={750} color="#ffffff">{txt}</text></frame>;
  const scene = (nodes, at, dur, name) => p.compose(<frame width={W} height={H} layout="none" background="#071329">{nodes}</frame>, {at,dur,name});

  scene(<>{full(m.overview,1.12,-80,-40)}<rect x={0} y={0} width={W} height={H} fill="#071329cc" />
    <frame x={145} y={250} width={1630} height={500} layout="none" motion={enter(0,90)}>
      <text x={0} y={0} width={720} height={52} fontSize={14} fontWeight={850} letterSpacing={-1} color="#ffffff">PrizeSkout</text>
      <text x={4} y={170} width={820} height={72} fontSize={8} fontWeight={600} lineHeight={1.05} color="#dbe7ff">{"The financial command center\nfor modern commerce."}</text>
      <rect x={4} y={365} width={260} height={8} radius={4} fill="#ff641d" animate={[{property:"scaleX",from:0,to:1,duration:.8,at:.4,easing:"ease-out"}]}/>
    </frame></>,0,3.4,"01-hook");

  scene(<>{full(m.integrations,1.06,-35,-20)}{eyebrow("Connect every signal")}{title("One operating picture.",165,86)}
    {chip("ORDERS",150,760,"#2765ff",.1)}{chip("PAYOUTS",430,760,"#7b61ff",.2)}{chip("COSTS",710,760,"#16b887",.3)}{chip("PROMOTIONS",990,760,"#ff641d",.4)}{chip("EVIDENCE",1270,760,"#e7a52d",.5)}</>,3.4,3.2,"02-connect");

  scene(<>{full(m.catalog,1.08,-50,-30)}{panel(m.catalog,240,195,1440,810,-2)}
    <frame x={1010} y={650} width={620} height={220} radius={26} background="#071329ee" padding={32} motion={enter(120,20,3)}>
      <text width={560} height={50} fontSize={11} fontWeight={700} letterSpacing={2} color="#ff7a32">NORMALIZE</text><text width={560} height={120} fontSize={20} fontWeight={780} lineHeight={1} color="#ffffff">{"Every SKU.\nEvery channel."}</text>
    </frame></>,6.6,3.2,"03-normalize");

  scene(<>{full(m.recovery,1.14,-100,-60)}{eyebrow("Payout reconciliation",100)}{title("Expected. Actual. Explained.",150,82)}
    <frame x={150} y={575} width={1620} height={250} layout="none">
      {chip("EXPECTED",0,35,"#6e62ff",.1)}<text x={285} y={42} width={120} height={60} fontSize={50} color="#ffffff">→</text>{chip("ACTUAL",405,35,"#2468ff",.25)}<text x={690} y={42} width={120} height={60} fontSize={50} color="#ffffff">→</text>{chip("VARIANCE",810,35,"#ff641d",.4)}<text x={1095} y={42} width={120} height={60} fontSize={50} color="#ffffff">→</text>{chip("CLAIM",1215,35,"#16b887",.55)}
    </frame></>,9.8,3.3,"04-payout-map");

  scene(<>{full(m.recovery,1.28,-230,-110)}{panel(m.recovery,90,150,1120,700,-4)}
    <frame x={1160} y={250} width={610} height={510} radius={34} background="#0b1b38f2" padding={44} motion={enter(180,0,3)}>
      <text width={520} height={44} fontSize={22} fontWeight={750} letterSpacing={3} color="#ff7a32">PAYOUT GAP</text>
      <text width={520} height={58} fontSize={10} fontWeight={850} letterSpacing={-1} color="#ffffff">QAR 18,420</text>
      <rect width={520} height={2} fill="#294063"/><text width={520} height={120} fontSize={30} fontWeight={650} lineHeight={1.15} color="#c8d6ef">{"Commission mismatch\n+ missing settlement fee"}</text>
      <frame width={290} height={70} radius={35} background="#ff641d" padding={20}><text width={250} height={35} fontSize={22} fontWeight={800} color="#ffffff">BUILD CLAIM →</text></frame>
    </frame></>,13.1,3.3,"05-payout-gap");

  scene(<>{full(m.recovery,1.38,-340,-150)}
    <frame x={210} y={170} width={1500} height={740} layout="none">
      <rect x={0} y={350} width={1500} height={4} fill="#28405e"/>
      <rect x={0} y={350} width={1500} height={4} fill="#ff641d" animate={[{property:"scaleX",from:0,to:1,duration:1.5,easing:"ease-out"}]}/>
      {chip("ORDER",0,315,"#2765ff",.0)}{chip("FEE",410,315,"#7b61ff",.18)}{chip("SETTLEMENT",820,315,"#ff641d",.36)}{chip("RECOVERED",1230,315,"#16b887",.54)}
      <text x={0} y={0} width={1500} height={68} fontSize={12} fontWeight={820} letterSpacing={-1} color="#ffffff">Trace every riyal.</text>
      <text x={0} y={560} width={1500} height={90} fontSize={7} fontWeight={600} color="#d5e1f5">From checkout to settlement—with evidence attached.</text>
    </frame></>,16.4,3.2,"06-trace");

  scene(<>{full(m.recovery,1.16,-130,-70)}{eyebrow("Recovery workspace",105)}{title("Discrepancy → proof → claim",160,78)}
    {panel(m.recovery,210,470,680,390,-5,.05)}{panel(m.recovery,620,415,680,390,0,.2)}{panel(m.recovery,1030,360,680,390,5,.35)}</>,19.6,3.2,"07-recovery-stack");

  scene(<>{full(m.margin,1.12,-100,-55)}{eyebrow("Margin intelligence",105)}{title("Know the true profit.",165,92)}
    <frame x={150} y={600} width={1620} height={210} layout="none">
      {chip("REVENUE",0,40,"#2765ff",.05)}<text x={280} y={45} width={80} height={60} fontSize={48} color="#fff">−</text>{chip("COGS",360,40,"#7b61ff",.18)}<text x={640} y={45} width={80} height={60} fontSize={48} color="#fff">−</text>{chip("FEES",720,40,"#ff641d",.31)}<text x={1000} y={45} width={80} height={60} fontSize={48} color="#fff">=</text>{chip("TRUE MARGIN",1080,40,"#16b887",.44)}
    </frame></>,22.8,3.2,"08-margin-equation");

  scene(<>{full(m.margin,1.25,-220,-110)}{panel(m.margin,180,150,1560,780,2)}
    <frame x={1180} y={620} width={480} height={210} radius={28} background="#0a1730ef" padding={30} motion={enter(100,40,2)}><text width={420} height={40} fontSize={10} fontWeight={750} letterSpacing={2} color="#16d69a">TRUE MARGIN</text><text width={420} height={100} fontSize={32} fontWeight={850} color="#ffffff">18.6%</text></frame>
  </>,26,3.1,"09-margin-dashboard");

  scene(<><rect x={0} y={0} width={W} height={H} fill="#ff641d"/>
    <frame x={145} y={245} width={1100} height={560} motion={enter(0,90)}><text width={800} height={45} fontSize={6} fontWeight={800} letterSpacing={1} color="#071329">BEFORE YOU DISCOUNT</text><text width={900} height={125} fontSize={14} fontWeight={880} lineHeight={.92} letterSpacing={-1} color="#ffffff">{"Simulate the\nprofit impact."}</text></frame>
  </>,29.1,2.4,"10-promo-title");

  scene(<>{full(m.promotions,1.18,-145,-85)}{panel(m.promotions,175,145,1570,790,-2)}
    {chip("−15% PRICE",260,765,"#ff641d",.12)}{chip("+28% UNITS",560,765,"#2765ff",.24)}{chip("+QAR 9.2K",860,765,"#16b887",.36)}{chip("SAFE TO RUN",1160,765,"#7b61ff",.48)}</>,31.5,3.3,"11-promo-sim");

  scene(<>{full(m.promotions,1.34,-310,-145)}{eyebrow("Scenario engine",100)}{title("Change one variable.\nSee every consequence.",150,72)}
    <frame x={1160} y={580} width={500} height={190} radius={28} background="#ffffff" padding={30} motion={enter(160,20,4)}><text width={440} height={35} fontSize={10} fontWeight={750} color="#53617a">PROJECTED PROFIT</text><text width={440} height={90} fontSize={28} fontWeight={850} color="#0a1730">QAR 42,840</text></frame></>,34.8,3.2,"12-scenario");

  scene(<>{full(m.defend,1.16,-130,-70)}{eyebrow("Defend Loop",105)}{title("Set the floor.\nGuard the margin.",165,80)}
    <frame x={1130} y={540} width={480} height={240} radius={120} background="#102344" padding={34} motion={enter(140,20,5)}><text width={410} height={44} fontSize={10} fontWeight={800} letterSpacing={2} color="#76e2bd">PROTECTION ACTIVE</text><text width={410} height={100} fontSize={26} fontWeight={850} color="#ffffff">18% FLOOR</text></frame></>,38,3.2,"13-defend");

  scene(<>{full(m.defend,1.28,-240,-115)}{panel(m.defend,130,160,1660,760,2)}
    <rect x={260} y={708} width={1400} height={10} radius={5} fill="#263f61"/><rect x={260} y={708} width={1020} height={10} radius={5} fill="#16b887" animate={[{property:"scaleX",from:0,to:1,duration:1.2,easing:"ease-out"}]}/>
    {chip("MONITOR",290,780,"#2765ff",.05)}{chip("WARN",650,780,"#e7a52d",.2)}{chip("DEFEND",1010,780,"#ff641d",.35)}{chip("VERIFY",1370,780,"#16b887",.5)}</>,41.2,3.2,"14-defend-loop");

  scene(<><rect x={0} y={0} width={W} height={H} fill="#081631"/>
    <frame x={145} y={205} width={1630} height={650} layout="none">
      {eyebrow("AI Store Manager",0)}<text x={0} y={90} width={930} height={104} fontSize={12} fontWeight={850} letterSpacing={-1} lineHeight={.96} color="#ffffff">{"Your next best action,\nalready ranked."}</text>
      {chip("RECOVER QAR 18K",0,430,"#ff641d",.1)}{chip("FIX 12 COSTS",290,430,"#2765ff",.22)}{chip("PAUSE 3 PROMOS",580,430,"#7b61ff",.34)}{chip("DEFEND 8 SKUs",870,430,"#16b887",.46)}
    </frame></>,44.4,3.1,"15-manager-title");

  scene(<>{full(m.manager,1.22,-180,-100)}{panel(m.manager,210,150,1500,780,-2)}
    <frame x={1240} y={250} width={440} height={390} radius={30} background="#0a1833f2" padding={32} motion={enter(140,0,4)}><text width={380} height={40} fontSize={10} fontWeight={800} letterSpacing={2} color="#ff7a32">PRIORITY 01</text><text width={380} height={150} fontSize={20} fontWeight={780} lineHeight={1.02} color="#ffffff">Recover the missing payout.</text><frame width={260} height={70} radius={35} background="#ff641d" padding={20}><text width={220} height={34} fontSize={10} fontWeight={800} color="#fff">OPEN ACTION →</text></frame></frame>
  </>,47.5,3.4,"16-manager");

  scene(<>{full(m.copilot,1.15,-120,-65)}{eyebrow("CFO Copilot",105)}{title("Ask the business.\nGet the evidence.",165,82)}
    <frame x={1080} y={620} width={650} height={160} radius={34} background="#ffffff" padding={32} motion={enter(170,20,3)}><text width={590} height={90} fontSize={29} fontWeight={650} lineHeight={1.15} color="#152642">{"Why did margin fall\non Talabat last week?"}</text></frame></>,50.9,3.2,"17-copilot-question");

  scene(<>{full(m.copilot,1.3,-260,-130)}{panel(m.copilot,155,140,1610,800,2)}
    <frame x={230} y={650} width={620} height={190} radius={28} background="#0a1833ef" padding={30} motion={enter(-150,20,-3)}><text width={560} height={35} fontSize={20} fontWeight={800} letterSpacing={3} color="#76e2bd">ANSWER</text><text width={560} height={110} fontSize={31} fontWeight={650} lineHeight={1.12} color="#ffffff">{"Fee mix rose 2.8 pts.\nThree SKUs drove 71%."}</text></frame></>,54.1,3.2,"18-copilot-answer");

  scene(<>{full(m.overview,1.18,-150,-85)}{panel(m.recovery,100,210,760,430,-5,.05)}{panel(m.margin,580,120,760,430,0,.18)}{panel(m.manager,1060,210,760,430,5,.31)}
    <frame x={250} y={735} width={1420} height={80} motion={enter(0,50)}><text width={1420} height={45} fontSize={9} fontWeight={820} color="#ffffff">Recover. Protect. Grow.</text></frame></>,57.3,3.4,"19-command-center");

  scene(<><rect x={0} y={0} width={W} height={H} fill="#071329"/>
    <frame x={145} y={220} width={1630} height={620} layout="none" motion={enter(0,70)}>
      <text x={0} y={0} width={720} height={52} fontSize={14} fontWeight={860} letterSpacing={-1} color="#ffffff">PrizeSkout</text>
      <text x={0} y={175} width={850} height={68} fontSize={8} fontWeight={650} lineHeight={1.05} color="#dbe7ff">{"Turn commerce data\ninto defensible profit."}</text>
      <frame x={0} y={390} width={420} height={88} radius={44} background="#ff641d" padding={26}><text width={365} height={38} fontSize={26} fontWeight={850} color="#ffffff">BOOK A DEMO →</text></frame>
    </frame>
  </>,60.7,4.3,"20-end-card");

  await p.frame(1.7, "renders/frame.png");
};
