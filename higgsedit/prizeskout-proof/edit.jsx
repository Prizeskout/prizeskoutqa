export default async ({ project }) => {
  const W=1920, H=1080;
  const p=await project({dir:".",size:`${W}x${H}`,fps:30,background:"#071329"});
  const ui=await p.add("media/recovery.png");

  const bg=(scale=1.42,x=-60,y=-120)=><frame x={0} y={0} width={W} height={H} clip background="#071329">
    <media file={ui} x={x} y={y} width={1440*scale} height={1000*scale} fit="fill" />
    <rect x={0} y={0} width={W} height={H} fill="#07132955" />
  </frame>;
  const crop=(x,y,w,h,mx,my,mw,mh,motion)=><frame x={x} y={y} width={w} height={h} clip radius={26} background="#ffffff" shadow={{color:"#00000066",blur:42,x:0,y:22}} motion={motion}>
    <media file={ui} x={mx} y={my} width={mw} height={mh} fit="fill" />
  </frame>;
  const cursor=(x,y,dx,dy,at=0)=><frame x={x} y={y} width={42} height={42} origin="center" motion={{enter:{from:{x:dx,y:dy,opacity:0},duration:.75,at,easing:"house"},settle:{to:{scale:.78},duration:.13,easing:"ease-out"}}}>
    <path width={36} height={44} d="M4 2 L4 34 L13 26 L20 42 L27 38 L20 23 L32 23 Z" fill="#071329" stroke={{color:"#ffffff",width:3}} />
  </frame>;
  const ripple=(x,y,at=.8)=><frame x={x} y={y} width={90} height={90} origin="center" motion={{enter:{from:{scale:.15,opacity:0},duration:.12,at},settle:{to:{scale:1.8,opacity:0},duration:.42,easing:"ease-out"}}}>
    <rect x={10} y={10} width={70} height={70} radius={35} fill="#ff641d22" strokeColor="#ff641d" strokeWidth={5}/>
  </frame>;

  p.compose(<frame width={W} height={H} layout="none" background="#071329">
    {bg(1.5,-120,-180)}
    {crop(110,120,1700,840,-18,-70,1740,1208,{enter:{from:{scale:.84,rotation:-2,opacity:0},duration:.65,easing:"house"},settle:{to:{scale:1.04},duration:1.1,easing:"ease-in-out"},exit:{to:{scale:1.12,opacity:0},duration:.22,anchor:"end"}})}
    {cursor(1390,205,-1050,480,.15)}{ripple(1360,178,1.05)}
  </frame>,{at:0,dur:2.25,name:"01-locate-discrepancy"});

  p.compose(<frame width={W} height={H} layout="none" background="#071329">
    {bg(1.75,-300,-240)}
    {crop(90,160,1080,600,-210,-120,1728,1200,{enter:{from:{x:-520,scale:.92,opacity:0},duration:.55,easing:"house"},settle:{to:{x:34,scale:1.02},duration:1.25,easing:"ease-in-out"},exit:{to:{x:-120,opacity:0},duration:.25,anchor:"end"}})}
    {crop(1210,250,620,460,-1030,-205,1728,1200,{enter:{from:{x:560,scale:.86,opacity:0},duration:.65,at:.12,easing:"house"},settle:{to:{x:-24,scale:1.03},duration:1.05,easing:"ease-in-out"}})}
    {cursor(720,520,-430,-210,.35)}{ripple(690,492,1.2)}
    <rect x={210} y={770} width={1500} height={8} radius={4} fill="#ffffff33"/>
    <rect x={210} y={770} width={1500} height={8} radius={4} fill="#ff641d" animate={[{property:"scaleX",from:0,to:1,at:.2,duration:1.65,easing:"ease-out"}]}/>
  </frame>,{at:2.05,dur:2.75,name:"02-reconcile"});

  p.compose(<frame width={W} height={H} layout="none" background="#071329">
    {bg(1.62,-210,-220)}
    {crop(150,110,1620,850,-125,-100,1620,1125,{enter:{from:{scale:1.3,opacity:0},duration:.38,easing:"ease-out"},settle:{to:{scale:.98},duration:1.75,easing:"ease-in-out"},exit:{to:{y:-90,scale:1.04,opacity:0},duration:.28,anchor:"end"}})}
    <frame x={260} y={642} width={880} height={92} clip radius={46} background="#071329ee" motion={{enter:{from:{x:-300,opacity:0},duration:.45,at:.55,easing:"house"}}}>
      <rect x={24} y={40} width={832} height={12} radius={6} fill="#ffffff22"/>
      <rect x={24} y={40} width={832} height={12} radius={6} fill="#ff641d" animate={[{property:"scaleX",from:0,to:1,at:.15,duration:1.15,easing:"ease-out"}]}/>
    </frame>
    {cursor(1600,765,450,-260,.45)}{ripple(1570,737,1.35)}
  </frame>,{at:4.55,dur:2.9,name:"03-trace-case"});

  p.compose(<frame width={W} height={H} layout="none" background="#071329">
    {bg(1.9,-490,-330)}
    {crop(120,140,1040,720,-250,-375,1872,1300,{enter:{from:{x:-420,rotation:-3,opacity:0},duration:.5,easing:"house"},settle:{to:{x:28,rotation:0},duration:1.2,easing:"ease-in-out"}})}
    {crop(1090,210,720,520,-1130,-610,1872,1300,{enter:{from:{x:480,rotation:3,opacity:0},duration:.58,at:.12,easing:"house"},settle:{to:{x:-28,rotation:0},duration:1.1,easing:"ease-in-out"}})}
    <frame x={1030} y={775} width={650} height={96} radius={48} background="#16b887" motion={{enter:{from:{y:100,scale:.75,opacity:0},duration:.5,at:.6,easing:"bounce"},exit:{to:{scale:1.08,opacity:0},duration:.2,anchor:"end"}}}>
      <rect x={35} y={39} width={580} height={18} radius={9} fill="#ffffff" animate={[{property:"scaleX",from:.08,to:1,at:.1,duration:1.15,easing:"ease-out"}]}/>
    </frame>
  </frame>,{at:7.2,dur:2.65,name:"04-recover"});

  p.compose(<frame width={W} height={H} layout="none" background="#071329">
    {bg(1.5,-120,-180)}
    {crop(170,120,1580,820,-85,-95,1728,1200,{enter:{from:{scale:1.18,opacity:0},duration:.42,easing:"ease-out"},settle:{to:{scale:1},duration:1.15,easing:"ease-in-out"}})}
    <frame x={1440} y={725} width={150} height={150} radius={75} background="#16b887" motion={{enter:{from:{scale:.15,rotation:-120,opacity:0},duration:.55,at:.35,easing:"bounce"}}}>
      <path width={90} height={70} x={30} y={40} d="M8 34 L32 58 L82 8" stroke={{color:"#ffffff",width:12,cap:"round"}} fill="none"/>
    </frame>
  </frame>,{at:9.6,dur:2.4,name:"05-verified"});

  await p.frame(1.15,"renders/qc-01.png");
  await p.frame(3.25,"renders/qc-02.png");
  await p.frame(5.9,"renders/qc-03.png");
  await p.frame(8.5,"renders/qc-04.png");
  await p.frame(10.8,"renders/qc-05.png");
};
