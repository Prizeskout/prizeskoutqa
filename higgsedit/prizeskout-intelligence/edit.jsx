export default async ({project})=>{
 const W=1920,H=1080,p=await project({dir:".",size:`${W}x${H}`,fps:30,background:"#071a38"});
 const priorities=await p.add("media/priorities.png"),request=await p.add("media/request.png"),plan=await p.add("media/plan.png"),sync=await p.add("media/sync.png"),question=await p.add("media/question.png"),answer=await p.add("media/answer.png"),final=await p.add("media/final.png");
 const bg=<rect x={0} y={0} width={W} height={H} fill="#071a38"/>;
 const stage=(f,m)=><frame layout="none" x={160} y={55} width={1600} height={900} clip radius={24} shadow={{color:"#0009",blur:50,x:0,y:24}} motion={m}><media x={0} y={0} file={f} width={1600} height={900} fit="fill"/></frame>;
 const crop=(f,sx,sy,w,h,x,y,m)=><frame layout="none" x={x} y={y} width={w} height={h} clip motion={m}><media x={-sx} y={-sy} file={f} width={1600} height={900} fit="fill"/></frame>;
 const pop=(at,dx=90,dy=0,rot=0)=>({enter:{from:{x:dx,y:dy,opacity:0,scale:.94,rotation:rot},duration:.34,at,easing:"house"},settle:{to:{scale:1.012},duration:.16,easing:"ease-out"},exit:{to:{opacity:0},duration:.16,anchor:"end"}});
 const click=(x,y,at,c="#ff641d")=><><frame layout="none" x={x} y={y} width={22} height={22} radius={11} background={c} motion={{enter:{from:{scale:.1,opacity:0},duration:.08,at},settle:{to:{scale:.7},duration:.1},exit:{to:{opacity:0},duration:.2,anchor:"end"}}}/><frame layout="none" x={x-28} y={y-28} width={78} height={78} radius={39} background={c+"25"} motion={{enter:{from:{scale:.1,opacity:0},duration:.08,at:at+.1},exit:{to:{scale:1.9,opacity:0},duration:.3,anchor:"end"}}}/></>;
 p.compose(<frame layout="none" x={0} y={0} width={W} height={H}>{bg}{crop(final,120,120,720,35,280,230,pop(.05,-120,0))}{crop(final,120,175,1160,150,280,320,pop(.2,0,90))}<rect x={280} y={545} width={1120} height={7} radius={4} fill="#193455"/><rect x={280} y={545} width={1120} height={7} radius={4} fill="#ff641d" animate={[{property:"scaleX",from:0,to:1,at:.35,duration:1.1,easing:"ease-out"}]}/></frame>,{at:0,dur:2.1,name:"hook"});
 p.compose(<frame layout="none" x={0} y={0} width={W} height={H}>{bg}{stage(priorities,pop(.08,0,70))}{click(1490,422,1.3)}</frame>,{at:1.9,dur:3.7,name:"priorities"});
 p.compose(<frame layout="none" x={0} y={0} width={W} height={H}>{bg}{stage(request,pop(.08,70,0))}{click(785,327,.38)}</frame>,{at:5.35,dur:3.1,name:"request"});
 p.compose(<frame layout="none" x={0} y={0} width={W} height={H}>{bg}{stage(plan,pop(.08,-70,0))}{click(1490,690,1.3,"#16b887")}</frame>,{at:8.2,dur:3.25,name:"plan"});
 p.compose(<frame layout="none" x={0} y={0} width={W} height={H}>{bg}{stage(sync,pop(.08,0,70))}</frame>,{at:11.2,dur:3.1,name:"sync"});
 p.compose(<frame layout="none" x={0} y={0} width={W} height={H}>{bg}{stage(question,pop(.08,70,0))}</frame>,{at:14.05,dur:2.8,name:"question"});
 p.compose(<frame layout="none" x={0} y={0} width={W} height={H}>{bg}{stage(answer,pop(.08,0,70))}{click(1470,650,1.48)}</frame>,{at:16.6,dur:3.45,name:"answer"});
 p.compose(<frame layout="none" x={0} y={0} width={W} height={H}>{bg}{stage(final)}{crop(final,120,375,1360,75,280,430,pop(.3,0,70))}{crop(final,120,485,1360,65,280,540,pop(.75,0,70))}</frame>,{at:19.8,dur:3.1,name:"close"});
 for(const [i,t] of [1,3.6,6.8,9.7,12.8,15.5,18.2,21.3].entries()) await p.frame(t,`renders/qc-${i+1}.png`);
 await p.render("renders/prizeskout-intelligence.mov",{codec:"hevc",bitrate:12000000,concurrency:4});
};
