export default async ({project})=>{
  const W=1920,H=1080;
  const p=await project({dir:".",size:`${W}x${H}`,fps:30,background:"#100d0c"});
  const account=await p.add("media/account.png"),channels=await p.add("media/channels.png"),ready=await p.add("media/ready.png"),recovery=await p.add("media/recovery.png");
  const bg=<><rect x={0} y={0} width={W} height={H} fill="#100d0c"/><rect x={0} y={0} width={W} height={H} fill="#ff641d12"/></>;
  const cursor=(x,y,dx,dy,at=.2)=><frame x={x} y={y} width={42} height={48} origin="center" motion={{enter:{from:{x:dx,y:dy,opacity:0},duration:.68,at,easing:"house"},settle:{to:{scale:.76},duration:.14,easing:"ease-out"}}}><path width={36} height={44} d="M4 2 L4 34 L13 26 L20 42 L27 38 L20 23 L32 23 Z" fill="#071329" stroke={{color:"#fff",width:3}}/></frame>;
  const ripple=(x,y,at)=><frame x={x} y={y} width={82} height={82} origin="center" motion={{enter:{from:{scale:.1,opacity:0},duration:.1,at},settle:{to:{scale:1.7,opacity:0},duration:.38,easing:"ease-out"}}}><rect x={8} y={8} width={66} height={66} radius={33} fill="#ff641d18" strokeColor="#ff641d" strokeWidth={4}/></frame>;
  const accountCard=(motion)=><frame x={404} y={70} width={1112} height={902} clip radius={24} background="#fff" shadow={{color:"#0008",blur:44,x:0,y:22}} motion={motion}><media file={account} x={0} y={0} width={1112} height={902} fit="fill"/></frame>;
  const setupCard=(file,x,y,w,h,motion)=><frame x={x} y={y} width={w} height={h} layout="none" clip radius={24} background="#fff" shadow={{color:"#0008",blur:44,x:0,y:22}} motion={motion}><media file={file} x={-429*(w/1060)} y={-732*(h/900)} width={2521*(w/1060)} height={1751*(h/900)} fit="fill"/></frame>;
  const dashboard=(motion)=><frame x={283} y={40} width={1354} height={940} clip radius={24} background="#fff" shadow={{color:"#0008",blur:44,x:0,y:22}} motion={motion}><media file={recovery} x={0} y={0} width={1354} height={940} fit="fill"/></frame>;
  const packet=(x,y,fromX,fromY,color,at,rot=0)=><frame x={x} y={y} width={46} height={18} radius={9} background={color} origin="center" motion={{enter:{from:{x:fromX,y:fromY,scale:.35,rotation:rot,opacity:0},duration:.72,at,easing:"house"},settle:{to:{scale:.72,opacity:.88},duration:.18,easing:"ease-out"},exit:{to:{scale:.2,opacity:0},duration:.22,anchor:"end"}}}/>;

  p.compose(<frame width={W} height={H} layout="none">{bg}{accountCard({enter:{from:{y:55,scale:.96,opacity:0},duration:.5,easing:"house"},settle:{to:{scale:1.012},duration:1.55,easing:"ease-in-out"},exit:{to:{opacity:0},duration:.22,anchor:"end"}})}{cursor(1040,748,-430,-240,.2)}{ripple(1010,718,1.05)}<rect x={780} y={828} width={370} height={5} radius={3} fill="#16b887" animate={[{property:"scaleX",from:0,to:1,at:.65,duration:1,easing:"ease-out"}]}/></frame>,{at:0,dur:2.65,name:"01-auth"});

  p.compose(<frame width={W} height={H} layout="none">{bg}{setupCard(channels,430,70,1060,900,{enter:{from:{x:70,opacity:0},duration:.42,easing:"ease-out"},settle:{to:{x:-18,scale:1.01},duration:1.7,easing:"ease-in-out"},exit:{to:{scale:.92,opacity:0},duration:.25,anchor:"end"}})}{cursor(1268,846,-360,-180,.3)}{ripple(1238,816,1.12)}<rect x={715} y={883} width={470} height={6} radius={3} fill="#16b887" animate={[{property:"scaleX",from:.03,to:1,at:.42,duration:1.45,easing:"ease-out"}]}/></frame>,{at:2.45,dur:2.9,name:"02-connect"});

  p.compose(<frame width={W} height={H} layout="none">{bg}
    {setupCard(channels,95,150,850,722,{enter:{from:{x:-180,scale:.92,opacity:0},duration:.5,easing:"house"},settle:{to:{x:16},duration:2.4,easing:"ease-in-out"},exit:{to:{opacity:0},duration:.25,anchor:"end"}})}
    <frame x={1415} y={420} width={230} height={230} radius={115} background="#ffffff" shadow={{color:"#ff641d66",blur:60,x:0,y:0}} motion={{enter:{from:{scale:.2,rotation:-45,opacity:0},duration:.55,at:.2,easing:"bounce"},settle:{to:{scale:1.05},duration:1.8,easing:"ease-in-out"}}}><rect x={47} y={100} width={136} height={30} radius={15} fill="#ff641d"/><rect x={100} y={47} width={30} height={136} radius={15} fill="#071329"/></frame>
    <path x={930} y={265} width={520} height={540} d="M0 0 C280 0 220 270 500 270 C220 270 280 540 0 540" stroke={{color:"#ffffff33",width:3}} fill="none"/>
    {packet(1465,470,-880,-235,"#8b5cf6",.35,-25)}{packet(1510,505,-925,-270,"#2765ff",.55,18)}{packet(1450,550,-865,-315,"#ff641d",.75,-15)}{packet(1530,585,-945,-350,"#16b887",.95,22)}
    {packet(1480,625,-895,-390,"#e7a52d",1.15,-18)}{packet(1550,465,-965,-230,"#ff641d",1.35,28)}{packet(1425,520,-840,-285,"#2765ff",1.55,-28)}{packet(1565,555,-980,-320,"#16b887",1.75,14)}
    {packet(1495,590,-910,-355,"#8b5cf6",1.95,-12)}{packet(1435,610,-850,-375,"#e7a52d",2.15,25)}{packet(1540,535,-955,-300,"#ff641d",2.35,-20)}{packet(1470,505,-885,-270,"#16b887",2.55,18)}
    <rect x={1160} y={850} width={600} height={10} radius={5} fill="#ffffff22"/><rect x={1160} y={850} width={600} height={10} radius={5} fill="#16b887" animate={[{property:"scaleX",from:0,to:1,at:.6,duration:2.4,easing:"ease-out"}]}/>
  </frame>,{at:5.1,dur:3.8,name:"03-data-inflow"});

  p.compose(<frame width={W} height={H} layout="none">{bg}{setupCard(ready,430,70,1060,900,{enter:{from:{scale:1.06,opacity:0},duration:.4,easing:"ease-out"},settle:{to:{scale:1},duration:1.55,easing:"ease-in-out"},exit:{to:{opacity:0},duration:.22,anchor:"end"}})}<frame x={1260} y={786} width={80} height={80} radius={40} background="#16b887" motion={{enter:{from:{scale:.1,rotation:-90,opacity:0},duration:.5,at:.35,easing:"bounce"}}}><path x={18} y={22} width={48} height={38} d="M4 18 L17 31 L43 5" stroke={{color:"#fff",width:7,cap:"round"}} fill="none"/></frame></frame>,{at:8.65,dur:2.45,name:"04-ready"});

  p.compose(<frame width={W} height={H} layout="none">{bg}{dashboard({enter:{from:{y:60,scale:.97,opacity:0},duration:.48,easing:"house"},settle:{to:{scale:1.01},duration:1.55,easing:"ease-in-out"},exit:{to:{opacity:0},duration:.22,anchor:"end"}})}
    {packet(520,215,-310,600,"#8b5cf6",.15,-20)}{packet(790,215,-580,600,"#2765ff",.3,18)}{packet(1060,215,-850,600,"#ff641d",.45,-16)}{packet(1330,215,-1120,600,"#16b887",.6,22)}
    {cursor(1332,208,-750,400,.3)}{ripple(1302,178,1.05)}
  </frame>,{at:10.85,dur:2.7,name:"05-populate"});

  p.compose(<frame width={W} height={H} layout="none">{bg}{dashboard({enter:{from:{x:-45,opacity:0},duration:.4,easing:"ease-out"},settle:{to:{x:16},duration:1.75,easing:"ease-in-out"}})}<rect x={532} y={344} width={610} height={210} radius={16} fill="#ffffff00" strokeColor="#ff641d" strokeWidth={5}/>{cursor(1035,470,-380,-110,.4)}{ripple(1005,440,1.1)}<frame x={1472} y={704} width={74} height={74} radius={37} background="#16b887" motion={{enter:{from:{scale:.1,rotation:-90,opacity:0},duration:.5,at:1.0,easing:"bounce"}}}><path x={16} y={20} width={44} height={36} d="M4 17 L16 29 L40 5" stroke={{color:"#fff",width:7,cap:"round"}} fill="none"/></frame></frame>,{at:13.3,dur:2.7,name:"06-discrepancy"});

  for(const [i,t] of [1.3,3.9,6.8,9.7,12,14.7].entries()) await p.frame(t,`renders/qc-${i+1}.png`);
};
