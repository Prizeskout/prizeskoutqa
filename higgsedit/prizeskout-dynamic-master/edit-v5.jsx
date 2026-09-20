export default async ({project})=>{
  const W=1920,H=1080;
  const p=await project({dir:".",size:`${W}x${H}`,fps:30,background:"#06162f"});
  const files={};
  for(const n of ["orders","order","reconEvidence","margin","promo","result","defend","priorities","request","plan","sync","question","answer","alert","trustEvidence","history","export","final"]){
    files[n]=await p.add(`media/${n}.png`);
  }
  const bg=<><rect x={0} y={0} width={W} height={H} fill="#06162f"/><rect x={0} y={0} width={W} height={H} fill="#0b2447" opacity={.32}/></>;
  const enter=(dx=0,dy=70,rot=0,delay=.04)=>({enter:{from:{x:dx,y:dy,scale:.9,opacity:0,rotation:rot},duration:.42,at:delay,easing:"house"},settle:{to:{scale:1.012},duration:1.9,easing:"ease-out"},exit:{to:{scale:1.045,opacity:0},duration:.24,anchor:"end"}});
  const fly=(dx,dy,rot,delay=.02)=>({enter:{from:{x:dx,y:dy,scale:.58,opacity:0,rotation:rot},duration:.46,at:delay,easing:"house"},settle:{to:{x:-dx*.08,y:-dy*.08,scale:1.03,rotation:-rot*.08},duration:.75,easing:"ease-out"},exit:{to:{x:-dx*.25,y:-dy*.2,scale:1.14,opacity:0},duration:.25,anchor:"end"}});
  const screen=(f,m=enter(),x=160,y=55,w=1600,h=900)=><frame layout="none" x={x} y={y} width={w} height={h} clip radius={24} shadow={{color:"#000a",blur:52,x:0,y:24}} motion={m}><media x={0} y={0} file={f} width={w} height={h} fit="fill"/></frame>;
  const card=(f,x,y,w,h,m)=><frame layout="none" x={x} y={y} width={w} height={h} clip radius={18} shadow={{color:"#000b",blur:35,x:0,y:18}} motion={m}><media x={0} y={0} file={f} width={w} height={h} fit="fill"/></frame>;
  const pulse=(x,y,c="#ff641d",at=.5)=><><frame layout="none" x={x} y={y} width={22} height={22} radius={11} background={c} motion={{enter:{from:{scale:.1,opacity:0},duration:.09,at},settle:{to:{scale:.75},duration:.12},exit:{to:{opacity:0},duration:.22,anchor:"end"}}}/><frame layout="none" x={x-30} y={y-30} width={82} height={82} radius={41} background={c+"30"} motion={{enter:{from:{scale:.1,opacity:0},duration:.09,at:at+.08},exit:{to:{scale:2.1,opacity:0},duration:.38,anchor:"end"}}}/></>;
  const stream=(y,color,delay)=> <><rect x={120} y={y} width={1680} height={3} radius={2} fill={color} opacity={.18}/><rect x={120} y={y} width={1680} height={3} radius={2} fill={color} animate={[{property:"scaleX",from:0,to:1,at:delay,duration:1.1,easing:"ease-out"}]}/></>;
  const scene=(name,at,dur,content)=>p.compose(<frame layout="none" x={0} y={0} width={W} height={H}>{bg}{content}</frame>,{at,dur,name});

  scene("01-ui-universe",0,2.45,<>{card(files.orders,80,120,610,343,fly(-650,-220,-8,.02))}{card(files.margin,650,70,620,349,fly(0,-560,3,.10))}{card(files.trustEvidence,1260,130,560,315,fly(620,-240,8,.18))}{card(files.promo,240,570,590,332,fly(-520,430,6,.24))}{card(files.answer,1050,560,650,366,fly(550,420,-6,.31))}{stream(520,"#16d69a",.25)}</>);
  scene("02-orders-arrive",2.15,3.25,<>{screen(files.orders,enter(-120,0,-1.4))}{stream(250,"#2765ff",.35)}{stream(770,"#16b887",.65)}{pulse(1510,545,"#ff641d",1.15)}</>);
  scene("03-one-order",5.1,3.25,<>{screen(files.order,enter(120,0,1.2))}{card(files.orders,80,700,620,349,fly(-500,260,-5,.16))}{pulse(1480,598,"#ff641d",.72)}{pulse(1480,745,"#16b887",1.25)}</>);
  scene("04-evidence-lock",8.05,3.25,<>{screen(files.reconEvidence,enter(0,90,0))}{stream(330,"#2765ff",.25)}{stream(447,"#8b5cf6",.47)}{stream(564,"#e7a52d",.69)}{stream(681,"#16b887",.91)}</>);
  scene("05-margin-scan",11,3.25,<>{screen(files.margin,enter(-100,0,-1))}{card(files.order,1330,650,500,281,fly(500,320,5,.22))}{pulse(1500,542,"#ff641d",.72)}{pulse(1500,718,"#ff641d",1.22)}</>);
  scene("06-promotion-input",13.95,3.25,<>{screen(files.promo,enter(100,0,1))}{stream(690,"#2765ff",.65)}{pulse(650,735,"#ff641d",.9)}</>);
  scene("07-forecast",16.9,3.25,<>{screen(files.result,enter(0,-90,0))}{card(files.promo,70,690,570,321,fly(-520,280,-5,.16))}{stream(682,"#ff641d",.52)}{pulse(1160,610,"#ff641d",1.0)}</>);
  scene("08-defend-loop",19.85,3.25,<>{screen(files.defend,enter(0,90,0))}{stream(705,"#16b887",.62)}{pulse(1450,635,"#16b887",.88)}</>);
  scene("09-priority-wall",22.8,3.25,<>{screen(files.priorities,enter(-120,0,-1.2))}{card(files.alert,1280,610,560,315,fly(520,280,5,.2))}{pulse(1490,422,"#16b887",1.0)}</>);
  scene("10-ai-command",25.75,3.25,<>{screen(files.request,enter(120,0,1.2))}{card(files.priorities,60,650,610,343,fly(-520,260,-6,.15))}{pulse(1355,215,"#ff641d",.7)}</>);
  scene("11-plan-assembly",28.7,3.25,<>{screen(files.plan,enter(0,100,0))}{stream(600,"#16b887",.52)}{pulse(1490,690,"#16b887",.92)}</>);
  scene("12-store-sync",31.65,3.25,<>{screen(files.sync,enter(0,-100,0))}{card(files.plan,1290,690,560,315,fly(500,280,5,.12))}{stream(555,"#16b887",.35)}</>);
  scene("13-cfo-question",34.6,3.25,<>{screen(files.question,enter(-110,0,-1))}{card(files.sync,80,680,590,332,fly(-520,280,-5,.18))}{pulse(1350,245,"#ff641d",.72)}</>);
  scene("14-cfo-answer",37.55,3.25,<>{screen(files.answer,enter(110,0,1))}{stream(650,"#16b887",.62)}{pulse(1470,650,"#ff641d",.96)}</>);
  scene("15-trust-assembly",40.5,3.25,<>{screen(files.trustEvidence,enter(0,100,0))}{card(files.alert,90,690,560,315,fly(-520,280,-5,.15))}{pulse(1465,635,"#16b887",.85)}</>);
  scene("16-audit-history",43.45,3.25,<>{screen(files.history,enter(-100,0,-1))}{card(files.export,1260,620,590,332,fly(520,260,5,.18))}{stream(780,"#16b887",.7)}</>);
  scene("17-final",46.4,3.6,<>{screen(files.final,{enter:{from:{scale:.82,opacity:0},duration:.55,at:.04,easing:"house"},settle:{to:{scale:1.035},duration:2.2,easing:"ease-out"}})}{stream(760,"#ff641d",.55)}</>);

  for(const [i,t] of [1.2,3.6,6.6,9.5,12.5,15.4,18.4,21.3,24.3,27.2,30.2,33.1,36.1,39,42,45,48.2].entries()) await p.frame(t,`renders/qc-${String(i+1).padStart(2,"0")}.png`);
  await p.render("renders/prizeskout-dynamic-master.mov",{codec:"hevc",bitrate:14000000,concurrency:4});
};
