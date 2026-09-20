export default async ({project})=>{
 const W=1920,H=1080,p=await project({dir:".",size:`${W}x${H}`,fps:30,background:"#071a38"});
 const cat=await p.add("media/catalog.png"),agg=await p.add("media/aggregate.png"),orders=await p.add("media/orders.png"),order=await p.add("media/order.png"),evidence=await p.add("media/evidence.png"),final=await p.add("media/final.png");
 const stage=(file,motion)=><frame layout="none" x={160} y={55} width={1600} height={900} clip radius={24} background="#fff" shadow={{color:"#0009",blur:50,x:0,y:24}} motion={motion}><media x={0} y={0} file={file} width={1600} height={900} fit="fill"/></frame>;
 const crop=(file,sx,sy,w,h,x,y,motion)=><frame layout="none" x={x} y={y} width={w} height={h} clip motion={motion}><media x={-sx} y={-sy} file={file} width={1600} height={900} fit="fill"/></frame>;
 const pop=(at,dx=90,dy=0,rot=0)=>({enter:{from:{x:dx,y:dy,opacity:0,scale:.94,rotation:rot},duration:.34,at,easing:"house"},settle:{to:{scale:1.015},duration:.18,easing:"ease-out"},exit:{to:{opacity:0},duration:.16,anchor:"end"}});
 const click=(x,y,at,color="#ff641d")=><><frame layout="none" x={x} y={y} width={22} height={22} radius={11} background={color} motion={{enter:{from:{scale:.1,opacity:0},duration:.08,at},settle:{to:{scale:.75},duration:.1},exit:{to:{opacity:0},duration:.22,anchor:"end"}}}/><frame layout="none" x={x-28} y={y-28} width={78} height={78} radius={39} background={color+"25"} motion={{enter:{from:{scale:.1,opacity:0},duration:.08,at:at+.1},exit:{to:{scale:1.9,opacity:0},duration:.32,anchor:"end"}}}/></>;
 const dark=<rect x={0} y={0} width={W} height={H} fill="#071a38"/>;

 // Kinetic promise: three rasterized text strips, no unstable native type.
 p.compose(<frame layout="none" x={0} y={0} width={W} height={H}>{dark}{crop(final,125,125,650,42,260,235,pop(.05,-120,0))}{crop(final,125,185,1220,73,260,330,pop(.16,0,80))}{crop(final,125,265,980,73,260,425,pop(.34,0,80))}<rect x={260} y={555} width={1180} height={7} radius={4} fill="#193455"/><rect x={260} y={555} width={1180} height={7} radius={4} fill="#18c996" animate={[{property:"scaleX",from:0,to:1,at:.35,duration:1.15,easing:"ease-out"}]}/></frame>,{at:0,dur:2.15,name:"00-hook"});

 // Catalog: the real product rows enter independently after sync is clicked.
 p.compose(<frame layout="none" x={0} y={0} width={W} height={H}>{dark}{stage(cat)}<rect x={425} y={455} width={1285} height={480} fill="#f7f9fc"/>{click(1645,324,.25)}{crop(cat,276,435,1285,68,436,490,pop(.55,-190,0))}{crop(cat,276,503,1285,68,436,558,pop(.74,190,0))}{crop(cat,276,571,1285,68,436,626,pop(.93,-190,0))}{crop(cat,276,639,1285,68,436,694,pop(1.12,190,0))}{crop(cat,276,707,1285,68,436,762,pop(1.31,-190,0))}{crop(cat,276,775,1285,68,436,830,pop(1.5,190,0))}<rect x={1320} y={195} width={400} height={7} radius={4} fill="#dce4ee"/><rect x={1320} y={195} width={400} height={7} radius={4} fill="#16b887" animate={[{property:"scaleX",from:0,to:1,at:.45,duration:1.4,easing:"ease-out"}]}/></frame>,{at:1.95,dur:4.05,name:"01-catalog"});

 // Orders: metrics snap in, then five rows stream from alternating channels.
 p.compose(<frame layout="none" x={0} y={0} width={W} height={H}>{dark}{stage(orders)}<rect x={435} y={230} width={1300} height={610} fill="#f5f7fb"/>{crop(orders,280,183,285,118,440,238,pop(.06,0,-80))}{crop(orders,583,183,285,118,743,238,pop(.16,0,-80))}{crop(orders,886,183,285,118,1046,238,pop(.26,0,-80))}{crop(orders,1189,183,285,118,1349,238,pop(.36,0,-80))}{crop(orders,280,361,1270,74,440,416,pop(.48,-220,0))}{crop(orders,280,447,1270,74,440,502,pop(.66,220,0))}{crop(orders,280,532,1270,74,440,587,pop(.84,-220,0))}{crop(orders,280,617,1270,74,440,672,pop(1.02,220,0))}{crop(orders,280,703,1270,74,440,758,pop(1.2,-220,0))}{click(1510,545,1.44)}</frame>,{at:5.75,dur:3.85,name:"02-orders"});

 // Per-order reconciliation: deductions build the expected payout, then settlement exposes the gap.
 p.compose(<frame layout="none" x={0} y={0} width={W} height={H}>{dark}{stage(order)}<rect x={440} y={242} width={1230} height={610} fill="#f5f7fb"/>{crop(order,280,187,760,524,440,242,pop(.04,-140,0))}<rect x={470} y={315} width={700} height={370} fill="#fff"/>{crop(order,310,285,700,68,470,340,pop(.28,130,0))}{crop(order,310,361,700,68,470,416,pop(.52,-130,0))}{crop(order,310,437,700,68,470,492,pop(.76,130,0))}{crop(order,310,513,700,68,470,568,pop(1,-130,0))}{crop(order,310,605,700,75,470,660,pop(1.24,0,60))}{crop(order,1068,187,440,524,1228,242,pop(1.38,170,0))}{click(1480,598,1.78)}{click(1480,745,2.2)}</frame>,{at:9.35,dur:4.25,name:"03-per-order"});

 // Evidence chain: each source attaches to the same case.
 p.compose(<frame layout="none" x={0} y={0} width={W} height={H}>{dark}{stage(evidence,pop(.08,0,70))}{click(1550,330,.4,"#2765ff")}{click(1550,447,.74,"#8b5cf6")}{click(1550,564,1.08,"#e7a52d")}{click(1550,681,1.42,"#16b887")}</frame>,{at:13.35,dur:3.55,name:"04-evidence"});

 // Aggregation: two cases converge into the real recovery dashboard.
 p.compose(<frame layout="none" x={0} y={0} width={W} height={H}>{dark}{stage(agg)}<frame layout="none" x={1410} y={215} width={120} height={120} radius={60} background="#ff641d" motion={pop(.1,260,-120,-12)}/><frame layout="none" x={1410} y={390} width={120} height={120} radius={60} background="#e7a52d" motion={pop(.35,260,120,12)}/><frame layout="none" x={1270} y={305} width={150} height={150} radius={75} background="#16b88733" motion={pop(.72,180,0)}/><rect x={1190} y={375} width={360} height={8} radius={4} fill="#16b887" animate={[{property:"scaleX",from:0,to:1,at:.62,duration:.7,easing:"ease-out"}]}/>{click(1260,620,1.25)}</frame>,{at:16.65,dur:3.35,name:"05-aggregate"});

 p.compose(<frame layout="none" x={0} y={0} width={W} height={H}>{dark}{stage(final)}{crop(final,125,398,1340,140,285,455,pop(.3,0,90))}</frame>,{at:19.75,dur:2.75,name:"06-close"});
 for(const [i,t] of [1,3.8,7.5,11.5,14.9,18.1,21].entries()) await p.frame(t,`renders/qc-${i+1}.png`);
 await p.render("renders/prizeskout-causal-motion.mov",{codec:"hevc",bitrate:12000000,concurrency:4});
};
