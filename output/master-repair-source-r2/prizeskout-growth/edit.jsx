export default async ({project})=>{
 const W=1920,H=1080,p=await project({dir:".",size:`${W}x${H}`,fps:30,background:"#071a38"});
 const margin=await p.add("media/margin.png"),promo=await p.add("media/promo.png"),result=await p.add("media/result.png"),defend=await p.add("media/defend.png"),approved=await p.add("media/approved.png");
 const bg=<rect x={0} y={0} width={W} height={H} fill="#071a38"/>;
 const stage=(f,m)=><frame layout="none" x={160} y={55} width={1600} height={900} clip radius={24} shadow={{color:"#0009",blur:50,x:0,y:24}} motion={m}><media x={0} y={0} file={f} width={1600} height={900} fit="fill"/></frame>;
 const crop=(f,sx,sy,w,h,x,y,m)=><frame layout="none" x={x} y={y} width={w} height={h} clip motion={m}><media x={-sx} y={-sy} file={f} width={1600} height={900} fit="fill"/></frame>;
 const pop=(at,dx=80,dy=0,rot=0)=>({enter:{from:{x:dx,y:dy,opacity:0,scale:.94,rotation:rot},duration:.34,at,easing:"house"},settle:{to:{scale:1.012},duration:.16,easing:"ease-out"},exit:{to:{opacity:0},duration:.18,anchor:"end"}});
 const click=(x,y,at,c="#ff641d")=><><frame layout="none" x={x} y={y} width={22} height={22} radius={11} background={c} motion={{enter:{from:{scale:.1,opacity:0},duration:.08,at},settle:{to:{scale:.72},duration:.1},exit:{to:{opacity:0},duration:.2,anchor:"end"}}}/><frame layout="none" x={x-28} y={y-28} width={78} height={78} radius={39} background={c+"25"} motion={{enter:{from:{scale:.1,opacity:0},duration:.08,at:at+.1},exit:{to:{scale:1.9,opacity:0},duration:.3,anchor:"end"}}}/></>;

 // Hook.
 p.compose(<frame layout="none" x={0} y={0} width={W} height={H}>{bg}{crop(approved,125,125,760,40,275,245,pop(.05,-120,0))}{crop(approved,125,175,1080,150,275,330,pop(.18,0,90))}<rect x={275} y={550} width={1100} height={7} radius={4} fill="#193455"/><rect x={275} y={550} width={1100} height={7} radius={4} fill="#16d69a" animate={[{property:"scaleX",from:0,to:1,at:.35,duration:1.15,easing:"ease-out"}]}/></frame>,{at:0,dur:2.1,name:"hook"});

 // Margin intelligence: metrics and product rows build independently; risky SKUs receive clicks.
 p.compose(<frame layout="none" x={0} y={0} width={W} height={H}>{bg}{stage(margin)}<rect x={430} y={230} width={1300} height={620} fill="#f5f7fb"/>{crop(margin,280,180,285,117,440,235,pop(.04,0,-85))}{crop(margin,583,180,285,117,743,235,pop(.14,0,-85))}{crop(margin,886,180,285,117,1046,235,pop(.24,0,-85))}{crop(margin,1189,180,285,117,1349,235,pop(.34,0,-85))}{crop(margin,280,356,1270,78,440,411,pop(.48,-180,0))}{crop(margin,280,444,1270,78,440,499,pop(.66,180,0))}{crop(margin,280,532,1270,78,440,587,pop(.84,-180,0))}{crop(margin,280,620,1270,78,440,675,pop(1.02,180,0))}{crop(margin,280,708,1270,78,440,763,pop(1.2,-180,0))}{click(1500,542,1.4)}{click(1500,718,1.75)}</frame>,{at:1.9,dur:4.1,name:"margin"});

 // Promotion builder: fields populate rapidly, then Run Simulation.
 p.compose(<frame layout="none" x={0} y={0} width={W} height={H}>{bg}{stage(promo,pop(.08,-60,0))}{click(650,735,1.35)}</frame>,{at:5.75,dur:3.75,name:"simulate"});

 // Forecast result: three scenarios reveal in sequence; loss lands last.
 p.compose(<frame layout="none" x={0} y={0} width={W} height={H}>{bg}{stage(result)}<rect x={430} y={230} width={1300} height={520} fill="#f5f7fb"/>{crop(result,280,180,410,225,440,235,pop(.08,-130,0,-3))}{crop(result,710,180,410,225,870,235,pop(.28,0,-100))}{crop(result,1140,180,410,225,1300,235,pop(.48,130,0,3))}{crop(result,280,433,1270,190,440,488,pop(.92,0,110))}<rect x={470} y={682} width={650} height={8} radius={4} fill="#ff641d" animate={[{property:"scaleX",from:0,to:1,at:1.15,duration:.75,easing:"ease-out"}]}/>{click(1160,610,1.55)}</frame>,{at:9.25,dur:3.65,name:"forecast"});

 // Defend Loop: original and safer alternatives separate, then merchant approves.
 p.compose(<frame layout="none" x={0} y={0} width={W} height={H}>{bg}{stage(defend)}<rect x={430} y={205} width={1300} height={520} fill="#f5f7fb"/>{crop(defend,280,151,1270,172,440,206,pop(.08,0,-110))}{crop(defend,280,345,623,292,440,400,pop(.45,-160,0,-2))}{crop(defend,923,345,627,292,1083,400,pop(.72,160,0,2))}{click(1450,635,1.2,"#16b887")}<rect x={1100} y={705} width={530} height={8} radius={4} fill="#16b887" animate={[{property:"scaleX",from:0,to:1,at:1.22,duration:.7,easing:"ease-out"}]}/></frame>,{at:12.65,dur:3.5,name:"defend"});

 // Protected outcome.
 p.compose(<frame layout="none" x={0} y={0} width={W} height={H}>{bg}{stage(approved)}{crop(approved,125,382,1350,138,285,437,pop(.35,0,90))}<frame layout="none" x={315} y={438} width={170} height={170} radius={85} background="#16d69a22" motion={{enter:{from:{scale:.1,opacity:0},duration:.2,at:.7,easing:"house"},settle:{to:{scale:1.4},duration:.4},exit:{to:{opacity:0},duration:.25,anchor:"end"}}}/></frame>,{at:15.9,dur:3.1,name:"approved"});
 for(const [i,t] of [1,3.8,7.3,10.8,14.2,17.2].entries()) await p.frame(t,`renders/qc-${i+1}.png`);
 await p.render("renders/prizeskout-protect-grow.mov",{codec:"hevc",bitrate:12000000,concurrency:4});
};
