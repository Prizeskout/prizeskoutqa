export default async ({project})=>{
  const W=1920,H=1080;
  const p=await project({dir:".",size:`${W}x${H}`,fps:30,background:"#120d0b"});
  const account=await p.add("media/account.png"), channels=await p.add("media/channels.png"), ready=await p.add("media/ready.png"), recovery=await p.add("media/recovery.png");
  const cursor=(x,y,dx,dy,at=.2)=><frame x={x} y={y} width={42} height={48} origin="center" motion={{enter:{from:{x:dx,y:dy,opacity:0},duration:.7,at,easing:"house"},settle:{to:{scale:.76},duration:.14,easing:"ease-out"}}}><path width={36} height={44} d="M4 2 L4 34 L13 26 L20 42 L27 38 L20 23 L32 23 Z" fill="#071329" stroke={{color:"#fff",width:3}}/></frame>;
  const ripple=(x,y,at)=><frame x={x} y={y} width={82} height={82} origin="center" motion={{enter:{from:{scale:.1,opacity:0},duration:.1,at},settle:{to:{scale:1.7,opacity:0},duration:.38,easing:"ease-out"}}}><rect x={8} y={8} width={66} height={66} radius={33} fill="#ff641d18" strokeColor="#ff641d" strokeWidth={4}/></frame>;
  const stage=(file,x,y,w,h,motion)=><frame x={x} y={y} width={w} height={h} clip radius={24} background="#fff" shadow={{color:"#00000088",blur:46,x:0,y:22}} motion={motion}><media file={file} x={0} y={0} width={w} height={h} fit="fill"/></frame>;
  const bg=<><rect x={0} y={0} width={W} height={H} fill="#100d0c"/><rect x={0} y={0} width={W} height={H} fill="#ff641d10"/></>;

  p.compose(<frame width={W} height={H} layout="none">{bg}
    {stage(account,404,70,1112,902,{enter:{from:{y:55,scale:.96,opacity:0},duration:.5,easing:"house"},settle:{to:{scale:1.012},duration:2,easing:"ease-in-out"},exit:{to:{opacity:0},duration:.25,anchor:"end"}})}
    {cursor(1040,748,-430,-240,.25)}{ripple(1010,718,1.15)}
    <rect x={780} y={828} width={370} height={5} radius={3} fill="#16b887" animate={[{property:"scaleX",from:0,to:1,at:.7,duration:1.1,easing:"ease-out"}]}/>
  </frame>,{at:0,dur:3,name:"01-account"});

  p.compose(<frame width={W} height={H} layout="none">{bg}
    <frame x={430} y={70} width={1060} height={900} layout="none" clip radius={24} background="#fff" shadow={{color:"#00000088",blur:46,x:0,y:22}} motion={{enter:{from:{x:80,opacity:0},duration:.42,easing:"ease-out"},settle:{to:{x:-20,scale:1.01},duration:2.15,easing:"ease-in-out"},exit:{to:{opacity:0},duration:.25,anchor:"end"}}}><media file={channels} x={-429} y={-732} width={2521} height={1751} fit="fill"/></frame>
    {cursor(1268,846,-360,-180,.35)}{ripple(1238,816,1.2)}
    <rect x={715} y={883} width={470} height={6} radius={3} fill="#d8eee7"/><rect x={715} y={883} width={470} height={6} radius={3} fill="#16b887" animate={[{property:"scaleX",from:.03,to:1,at:.45,duration:1.7,easing:"ease-out"}]}/>
  </frame>,{at:2.8,dur:3.3,name:"02-connected"});

  p.compose(<frame width={W} height={H} layout="none">{bg}
    <frame x={430} y={70} width={1060} height={900} layout="none" clip radius={24} background="#fff" shadow={{color:"#00000088",blur:46,x:0,y:22}} motion={{enter:{from:{scale:1.045,opacity:0},duration:.42,easing:"ease-out"},settle:{to:{scale:1},duration:2,easing:"ease-in-out"},exit:{to:{opacity:0},duration:.25,anchor:"end"}}}><media file={ready} x={-429} y={-732} width={2521} height={1751} fit="fill"/></frame>
    <frame x={1260} y={786} width={80} height={80} radius={40} background="#16b887" motion={{enter:{from:{scale:.1,rotation:-90,opacity:0},duration:.5,at:.45,easing:"bounce"}}}><path x={18} y={22} width={48} height={38} d="M4 18 L17 31 L43 5" stroke={{color:"#fff",width:7,cap:"round"}} fill="none"/></frame>
    {cursor(1300,890,-330,-100,.9)}{ripple(1270,860,1.48)}
  </frame>,{at:5.85,dur:3.15,name:"03-ready"});

  p.compose(<frame width={W} height={H} layout="none">{bg}
    {stage(recovery,283,40,1354,940,{enter:{from:{y:65,scale:.97,opacity:0},duration:.48,easing:"house"},settle:{to:{scale:1.01},duration:1.6,easing:"ease-in-out"},exit:{to:{opacity:0},duration:.25,anchor:"end"}})}
    {cursor(1332,208,-750,400,.2)}{ripple(1302,178,1.0)}
  </frame>,{at:8.75,dur:2.7,name:"04-payout-login"});

  p.compose(<frame width={W} height={H} layout="none">{bg}
    {stage(recovery,283,40,1354,940,{enter:{from:{x:-55,opacity:0},duration:.4,easing:"ease-out"},settle:{to:{x:18},duration:1.9,easing:"ease-in-out"},exit:{to:{opacity:0},duration:.25,anchor:"end"}})}
    <rect x={532} y={344} width={610} height={210} radius={16} fill="#ffffff00" strokeColor="#ff641d" strokeWidth={5}/>
    {cursor(1035,470,-380,-110,.45)}{ripple(1005,440,1.2)}
  </frame>,{at:11.2,dur:2.7,name:"05-discrepancy"});

  p.compose(<frame width={W} height={H} layout="none">{bg}
    {stage(recovery,283,40,1354,940,{enter:{from:{x:55,opacity:0},duration:.4,easing:"ease-out"},settle:{to:{x:-18},duration:1.8,easing:"ease-in-out"}})}
    <rect x={1035} y={545} width={570} height={250} radius={16} fill="#ffffff00" strokeColor="#16b887" strokeWidth={5}/>
    <frame x={1472} y={704} width={74} height={74} radius={37} background="#16b887" motion={{enter:{from:{scale:.1,rotation:-90,opacity:0},duration:.5,at:.75,easing:"bounce"}}}><path x={16} y={20} width={44} height={36} d="M4 17 L16 29 L40 5" stroke={{color:"#fff",width:7,cap:"round"}} fill="none"/></frame>
  </frame>,{at:13.65,dur:2.65,name:"06-case-ready"});

  for(const [i,t] of [1.5,4.4,7.4,10,12.5,15].entries()) await p.frame(t,`renders/qc-${i+1}.png`);
};
