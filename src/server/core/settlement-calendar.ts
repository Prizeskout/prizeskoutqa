export type SettlementCalendarTerms={
  settlementDays:number|null;dayBasis:"calendar_days"|"business_days"|null;
  scheduleType:"daily"|"weekly"|"twice_monthly"|"monthly"|null;
  weekday:number|null;monthDays:number[];cutoffHour:number|null;timeZone:string|null;
  weekendDays:number[];holidays:string[];reserveDays:number;minimumPayoutThreshold:number|null;
};

const iso=(date:Date)=>date.toISOString().slice(0,10);
const addDays=(date:Date,days:number)=>new Date(date.getTime()+days*86_400_000);
const dateAtUtc=(value:string)=>new Date(`${value}T12:00:00.000Z`);
const localParts=(instant:Date,timeZone:string)=>Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",hourCycle:"h23"}).formatToParts(instant).filter(part=>part.type!=="literal").map(part=>[part.type,part.value]));

export function expectedSettlementDate(orderInstant:string,terms:SettlementCalendarTerms){
  const blockers:string[]=[];
  const parsed=new Date(orderInstant);
  if(!Number.isFinite(parsed.getTime()))return {date:null,blockers:["Order timestamp is invalid."]};
  let localDate=iso(parsed),localHour=parsed.getUTCHours();
  if(terms.timeZone){
    try{const parts=localParts(parsed,terms.timeZone);localDate=`${parts.year}-${parts.month}-${parts.day}`;localHour=Number(parts.hour);}
    catch{blockers.push("Settlement timezone is invalid; UTC was used.");}
  }else blockers.push("Settlement timezone is not established; UTC was used.");
  let cursor=dateAtUtc(localDate);
  if(terms.cutoffHour!=null&&localHour>=terms.cutoffHour)cursor=addDays(cursor,1);
  else if(terms.cutoffHour==null)blockers.push("Settlement cutoff time is not established.");
  const lag=terms.settlementDays;
  if(lag==null)blockers.push("Settlement lag is not established.");
  const days=Math.max(0,lag??0)+Math.max(0,terms.reserveDays??0);
  if(terms.dayBasis==="business_days"){
    if(!terms.weekendDays.length)blockers.push("Business-day basis lacks an approved weekend calendar.");
    let added=0;
    while(added<days){cursor=addDays(cursor,1);const day=cursor.getUTCDay();if(!terms.weekendDays.includes(day)&&!terms.holidays.includes(iso(cursor)))added++;}
  }else{
    if(!terms.dayBasis)blockers.push("Calendar-day versus business-day basis is not established.");
    cursor=addDays(cursor,days);
  }
  if(terms.scheduleType==="weekly"){
    if(terms.weekday==null)blockers.push("Weekly settlement day is not established.");
    else while(cursor.getUTCDay()!==terms.weekday)cursor=addDays(cursor,1);
  }else if(terms.scheduleType==="monthly"||terms.scheduleType==="twice_monthly"){
    const allowed=[...new Set(terms.monthDays.filter(day=>day>=1&&day<=31))].sort((a,b)=>a-b);
    if(!allowed.length)blockers.push("Monthly settlement day is not established.");
    else{
      let found:Date|null=null;
      for(let offset=0;offset<370&&!found;offset++){const candidate=addDays(cursor,offset);if(allowed.includes(candidate.getUTCDate()))found=candidate;}
      if(found)cursor=found;
    }
  }else if(!terms.scheduleType)blockers.push("Settlement frequency is not structured.");
  return {date:iso(cursor),blockers:[...new Set(blockers)]};
}

export function applyMinimumPayoutThreshold(rows:{date:string;amount:number;orders:number}[],threshold:number|null){
  if(!(threshold&&threshold>0))return {rows,heldAmount:0};
  const output:{date:string;amount:number;orders:number}[]=[],sorted=[...rows].sort((a,b)=>a.date.localeCompare(b.date));
  let heldAmount=0,heldOrders=0;
  for(const row of sorted){heldAmount+=row.amount;heldOrders+=row.orders;if(heldAmount>=threshold){output.push({date:row.date,amount:heldAmount,orders:heldOrders});heldAmount=0;heldOrders=0;}}
  return {rows:output,heldAmount};
}
