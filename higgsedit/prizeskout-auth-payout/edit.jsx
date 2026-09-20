export default async ({ project }) => {
  const W=1920,H=1080;
  const p=await project({dir:".",size:`${W}x${H}`,fps:30,background:"#071329"});
  const account=await p.add("media/account.png");
  const channels=await p.add("media/channels.png");
  const ready=await p.add("media/ready.png");
  const recovery=await p.add("media/recovery.png");

  const image=(file,x,y,w,h,fit="fill")=><media file={file} x={x} y={y} width={w} height={h} fit={fit}/>;
  const cursor=(x,y,dx,dy,at=0)=><frame x={x} y={y} width={42} height={48} origin="center" motion={{enter:{from:{x:dx,y:dy,opacity:0},duration:.72,at,easing:"house"},settle:{to:{scale:.76},duration:.14,easing:"ease-out"}}}><path width={36} height={44} d="M4 2 L4 34 L13 26 L20 42 L27 38 L20 23 L32 23 Z" fill="#071329" stroke={{color:"#ffffff",width:3}}/></frame>;
  const ripple=(x,y,at)=><frame x={x} y={y} width={86} height={86} origin="center" motion={{enter:{from:{scale:.12,opacity:0},duration:.12,at},settle:{to:{scale:1.75,opacity:0},duration:.42,easing:"ease-out"}}}><rect x={8} y={8} width={70} height={70} radius={35} fill="#ff641d22" strokeColor="#ff641d" strokeWidth={5}/></frame>;
  const screen=(file,motion)=><frame x={110} y={70} width={1700} height={940} clip radius={28} background="#fff" shadow={{color:"#00000077",blur:48,x:0,y:24}} motion={motion}>{image(file,0,0,1700,940)}</frame>;
  const darkBg=()=> <><rect x={0} y={0} width={W} height={H} fill="#0b0b0d"/><rect x={0} y={0} width={W} height={H} fill="#ff641d18"/></>;

  p.compose(<frame width={W} height={H} layout="none">{darkBg()}
    <frame x={400} y={70} width={1120} height={910} clip radius={28} background="#fff" shadow={{color:"#00000077",blur:48,x:0,y:24}} motion={{enter:{from:{y:100,scale:.9,opacity:0},duration:.55,easing:"house"},settle:{to:{scale:1.025},duration:1.7,easing:"ease-in-out"},exit:{to:{x:-260,opacity:0},duration:.3,anchor:"end"}}}>{image(account,0,0,1120,910)}</frame>
    {cursor(1160,810,-680,-360,.35)}{ripple(1130,780,1.25)}
    <frame x={615} y={845} width={620} height={8} radius={4} background="#dbe6e1"><rect width={620} height={8} radius={4} fill="#16b887" animate={[{property:"scaleX",from:0,to:1,at:.75,duration:1.1,easing:"ease-out"}]}/></frame>
  </frame>,{at:0,dur:3,name:"01-account-authenticated"});

  p.compose(<frame width={W} height={H} layout="none">{darkBg()}
    {screen(channels,{enter:{from:{x:460,scale:.92,opacity:0},duration:.55,easing:"house"},settle:{to:{x:-35,scale:1.02},duration:1.65,easing:"ease-in-out"},exit:{to:{scale:1.08,opacity:0},duration:.26,anchor:"end"}})}
    <frame x={560} y={535} width={830} height={330} clip radius={24} background="#fff" motion={{enter:{from:{y:80,scale:.88,opacity:0},duration:.55,at:.35,easing:"house"}}}>{image(channels,-470,-390,1410,980)}</frame>
    {cursor(1320,835,-420,-280,.7)}{ripple(1290,805,1.52)}
    <rect x={565} y={884} width={820} height={12} radius={6} fill="#d9eee7"/><rect x={565} y={884} width={820} height={12} radius={6} fill="#16b887" animate={[{property:"scaleX",from:.05,to:1,at:.45,duration:1.75,easing:"ease-out"}]}/>
  </frame>,{at:2.75,dur:3.55,name:"02-channels-connected"});

  p.compose(<frame width={W} height={H} layout="none">{darkBg()}
    {screen(ready,{enter:{from:{scale:1.16,opacity:0},duration:.42,easing:"ease-out"},settle:{to:{scale:1},duration:1.65,easing:"ease-in-out"},exit:{to:{scale:.82,opacity:0},duration:.28,anchor:"end"}})}
    <frame x={1290} y={775} width={150} height={150} radius={75} background="#16b887" motion={{enter:{from:{scale:.12,rotation:-120,opacity:0},duration:.55,at:.45,easing:"bounce"}}}><path x={30} y={40} width={90} height={70} d="M8 34 L32 58 L82 8" stroke={{color:"#ffffff",width:12,cap:"round"}} fill="none"/></frame>
    {cursor(1390,900,-520,-150,.9)}{ripple(1360,870,1.55)}
  </frame>,{at:6.05,dur:3.15,name:"03-ready-login"});

  p.compose(<frame width={W} height={H} layout="none" background="#071329">
    <frame x={0} y={0} width={W} height={H} clip motion={{enter:{from:{scale:1.28,opacity:0},duration:.4,easing:"ease-out"},settle:{to:{scale:1},duration:1.15,easing:"ease-in-out"}}}>{image(recovery,0,-126,1920,1333)}</frame>
    {cursor(1540,205,-1000,420,.22)}{ripple(1510,175,1.02)}
  </frame>,{at:8.9,dur:2.15,name:"04-login-to-payout"});

  p.compose(<frame width={W} height={H} layout="none" background="#071329">
    <frame x={0} y={0} width={W} height={H} clip>{image(recovery,-210,-270,2304,1600)}<rect x={0} y={0} width={W} height={H} fill="#07132933"/></frame>
    <frame x={90} y={160} width={1080} height={600} clip radius={26} background="#fff" shadow={{color:"#00000066",blur:42,x:0,y:22}} motion={{enter:{from:{x:-520,scale:.92,opacity:0},duration:.55,easing:"house"},settle:{to:{x:34,scale:1.02},duration:1.25,easing:"ease-in-out"},exit:{to:{x:-120,opacity:0},duration:.25,anchor:"end"}}}>{image(recovery,-210,-120,1728,1200)}</frame>
    <frame x={1210} y={250} width={620} height={460} clip radius={26} background="#fff" shadow={{color:"#00000066",blur:42,x:0,y:22}} motion={{enter:{from:{x:560,scale:.86,opacity:0},duration:.65,at:.12,easing:"house"},settle:{to:{x:-24,scale:1.03},duration:1.05,easing:"ease-in-out"}}}>{image(recovery,-1030,-205,1728,1200)}</frame>
    {cursor(720,520,-430,-210,.35)}{ripple(690,492,1.2)}
    <rect x={210} y={790} width={1500} height={8} radius={4} fill="#ffffff33"/><rect x={210} y={790} width={1500} height={8} radius={4} fill="#ff641d" animate={[{property:"scaleX",from:0,to:1,at:.2,duration:1.65,easing:"ease-out"}]}/>
  </frame>,{at:10.8,dur:2.75,name:"05-detect-discrepancy"});

  p.compose(<frame width={W} height={H} layout="none" background="#071329">
    <frame x={0} y={0} width={W} height={H} clip>{image(recovery,-250,-300,2400,1667)}<rect x={0} y={0} width={W} height={H} fill="#07132944"/></frame>
    <frame x={150} y={110} width={1620} height={850} clip radius={28} background="#fff" shadow={{color:"#00000077",blur:46,x:0,y:24}} motion={{enter:{from:{scale:1.3,opacity:0},duration:.38,easing:"ease-out"},settle:{to:{scale:.98},duration:1.75,easing:"ease-in-out"},exit:{to:{y:-90,scale:1.04,opacity:0},duration:.28,anchor:"end"}}}>{image(recovery,-125,-100,1620,1125)}</frame>
    <frame x={260} y={642} width={880} height={92} clip radius={46} background="#071329ee" motion={{enter:{from:{x:-300,opacity:0},duration:.45,at:.55,easing:"house"}}}><rect x={24} y={40} width={832} height={12} radius={6} fill="#ffffff22"/><rect x={24} y={40} width={832} height={12} radius={6} fill="#ff641d" animate={[{property:"scaleX",from:0,to:1,at:.15,duration:1.15,easing:"ease-out"}]}/></frame>
    {cursor(1600,765,450,-260,.45)}{ripple(1570,737,1.35)}
  </frame>,{at:13.3,dur:2.9,name:"06-trace-case"});

  p.compose(<frame width={W} height={H} layout="none" background="#071329">
    <frame x={0} y={0} width={W} height={H} clip>{image(recovery,0,-126,1920,1333)}</frame>
    <frame x={1440} y={725} width={150} height={150} radius={75} background="#16b887" motion={{enter:{from:{scale:.15,rotation:-120,opacity:0},duration:.55,at:.35,easing:"bounce"}}}><path width={90} height={70} x={30} y={40} d="M8 34 L32 58 L82 8" stroke={{color:"#ffffff",width:12,cap:"round"}} fill="none"/></frame>
  </frame>,{at:15.95,dur:2.35,name:"07-verified"});

  await p.frame(1.5,"renders/qc-01.png"); await p.frame(4.6,"renders/qc-02.png"); await p.frame(7.7,"renders/qc-03.png"); await p.frame(9.8,"renders/qc-04.png"); await p.frame(12.1,"renders/qc-05.png"); await p.frame(14.7,"renders/qc-06.png"); await p.frame(17.1,"renders/qc-07.png");
};
