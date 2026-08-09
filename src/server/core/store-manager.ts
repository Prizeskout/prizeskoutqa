import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

const MODES=["observe","assist","supervised","policy_controlled","exception_only"];
const STATUSES=["detected","investigating","prepared","waiting_approval","approved","executing","verifying","completed","needs_attention","cancelled"];
const TRANSITIONS:Record<string,string[]>={
  detected:["investigating","prepared","waiting_approval","cancelled"],
  investigating:["prepared","waiting_approval","needs_attention","cancelled"],
  prepared:["waiting_approval","approved","cancelled"],
  waiting_approval:["approved","cancelled"],
  approved:["executing","cancelled"],
  executing:["verifying","needs_attention"],
  verifying:["completed","needs_attention"],
  needs_attention:["investigating","prepared","waiting_approval","cancelled"],
  completed:[],cancelled:[],
};

export async function getStoreManager(accountId:string){
  const defaultProfile={account_id:accountId,manager_name:"PrizeSkout Store Manager",operating_mode:"supervised",daily_brief_enabled:true,daily_brief_hour:8,timezone:"Asia/Riyadh",language:"en"};
  const [profile,policies,tasks]=await Promise.all([
    supabaseAdmin.from("ps_store_manager_profiles" as never).select("*").eq("account_id",accountId).maybeSingle(),
    supabaseAdmin.from("ps_store_manager_policies" as never).select("*").eq("account_id",accountId).order("policy_key"),
    supabaseAdmin.from("ps_store_manager_tasks" as never).select("*").eq("account_id",accountId).order("created_at",{ascending:false}).limit(100),
  ]);
  const schemaMissing=[profile,policies,tasks].some(result=>result.error&&(result.error.code==="42P01"||result.error.code==="PGRST205"||result.error.message.includes("schema cache")));
  if(schemaMissing)return {available:false,setup_required:true,profile:defaultProfile,policies:[],tasks:[]};
  for(const result of [profile,policies,tasks])if(result.error)throw new Error(result.error.message);
  let policyRows=(policies.data??[]) as any[];
  const defaults=[
      {policy_key:"catalog_hygiene",behavior:"prepare",description:"Prepare corrections for missing or inconsistent catalogue data."},
      {policy_key:"margin_protection",behavior:"recommend",description:"Watch true contribution margin and prepare protected price actions."},
      {policy_key:"inventory_watch",behavior:"recommend",description:"Watch stock-outs, overselling risk and slow-moving inventory."},
      {policy_key:"promotion_safety",behavior:"recommend",description:"Check discounts, coupon stacking and margin impact before campaigns."},
      {policy_key:"payout_recovery",behavior:"prepare",description:"Prepare evidence for payout discrepancies; submission still follows connector permissions."},
    ];
  const present=new Set(policyRows.map(policy=>String(policy.policy_key)));
  const missing=defaults.filter(policy=>!present.has(policy.policy_key)).map(policy=>({account_id:accountId,enabled:true,config:{approval_required:true} as Json,...policy}));
  if(missing.length){
    const {data,error}=await supabaseAdmin.from("ps_store_manager_policies" as never).upsert(missing as never,{onConflict:"account_id,policy_key"}).select("*");if(error)throw error;policyRows=[...policyRows,...((data??[]) as any[])];
  }
  return {available:true,setup_required:false,profile:profile.data??defaultProfile,policies:policyRows,tasks:tasks.data??[]};
}

export async function saveStoreManagerProfile(accountId:string,input:{operatingMode:string;dailyBriefEnabled:boolean;dailyBriefHour:number;timezone:string;language:string}){
  if(!MODES.includes(input.operatingMode))throw new Error("Choose a valid management mode.");
  if(!Number.isInteger(input.dailyBriefHour)||input.dailyBriefHour<0||input.dailyBriefHour>23)throw new Error("Daily brief hour must be between 0 and 23.");
  if(!["en","ar","fr"].includes(input.language))throw new Error("Choose a supported language.");
  const row={account_id:accountId,operating_mode:input.operatingMode,daily_brief_enabled:input.dailyBriefEnabled,daily_brief_hour:input.dailyBriefHour,timezone:input.timezone.slice(0,80),language:input.language};
  const {data,error}=await supabaseAdmin.from("ps_store_manager_profiles" as never).upsert(row as never,{onConflict:"account_id"}).select("*").single();if(error)throw error;return data;
}

export async function saveStoreManagerPolicy(accountId:string,input:{key:string;enabled:boolean;behavior:string;description:string;config?:Record<string,unknown>}){
  if(!/^[a-z][a-z0-9_]{2,60}$/.test(input.key))throw new Error("Policy key must use lowercase letters, numbers, and underscores.");
  if(!["observe","recommend","prepare","auto_execute"].includes(input.behavior))throw new Error("Choose a valid policy behavior.");
  const config={...(input.config??{}),approval_required:input.behavior==="auto_execute"?Boolean(input.config?.approval_required):true};
  const {data,error}=await supabaseAdmin.from("ps_store_manager_policies" as never).upsert({account_id:accountId,policy_key:input.key,enabled:input.enabled,behavior:input.behavior,description:input.description.slice(0,500),config:config as Json} as never,{onConflict:"account_id,policy_key"}).select("*").single();if(error)throw error;return data;
}

export async function createStoreManagerTask(accountId:string,input:{title:string;detail?:string;taskType?:string;priority?:string;dueAt?:string;approvalRequired?:boolean;riskLevel?:string;workflow?:Record<string,unknown>}){
  const title=input.title.trim();if(title.length<3)throw new Error("Describe the work the Store Manager should handle.");
  const priority=["critical","high","medium","low"].includes(input.priority??"")?input.priority!:"medium";
  const dueAt=input.dueAt?new Date(input.dueAt):null;if(dueAt&&!Number.isFinite(dueAt.getTime()))throw new Error("Use a valid due date.");
  const idempotencyKey=`merchant:${Date.now().toString(36)}:${title.toLowerCase().replace(/[^a-z0-9]+/g,"-").slice(0,50)}`;
  const approvalRequired=input.approvalRequired!==false;
  const requestedRisk=input.riskLevel??"read_only",riskLevel=["read_only","reversible","financial","permanent"].includes(requestedRisk)?requestedRisk:requestedRisk==="external_commitment"?"permanent":"read_only";
  const row={account_id:accountId,idempotency_key:idempotencyKey,source:input.workflow?"assistant":"merchant",task_type:(input.taskType??"store_admin").slice(0,60),title:title.slice(0,180),detail:(input.detail??"").slice(0,2000),status:approvalRequired?"waiting_approval":"detected",risk_level:riskLevel,priority,due_at:dueAt?.toISOString()??null,approval_required:approvalRequired,input:(input.workflow??{}) as Json};
  const {data,error}=await supabaseAdmin.from("ps_store_manager_tasks" as never).insert(row as never).select("*").single();if(error)throw error;
  await supabaseAdmin.from("ps_store_manager_task_events" as never).insert({account_id:accountId,task_id:(data as any).id,from_status:null,to_status:(data as any).status,actor:"merchant",note:"Task created from the management dashboard."} as never);
  return data;
}

export async function transitionStoreManagerTask(accountId:string,input:{id:string;toStatus:string;actor?:string;note?:string}){
  if(!STATUSES.includes(input.toStatus))throw new Error("Choose a valid task status.");
  const {data:current,error:readError}=await supabaseAdmin.from("ps_store_manager_tasks" as never).select("*").eq("account_id",accountId).eq("id",input.id).maybeSingle();if(readError||!current)throw new Error("Task not found.");
  const from=String((current as any).status);
  const readOnlyCompletion=input.toStatus==="completed"&&["investigating","prepared"].includes(from)&&(current as any).approval_required===false&&String((current as any).risk_level)==="read_only";
  if(!(TRANSITIONS[from]??[]).includes(input.toStatus)&&!readOnlyCompletion)throw new Error(`A task cannot move from ${from.replaceAll("_"," ")} to ${input.toStatus.replaceAll("_"," ")}.`);
  const patch:Record<string,unknown>={status:input.toStatus};
  if(input.toStatus==="approved")Object.assign(patch,{approved_by:(input.actor??"Merchant").slice(0,120),approved_at:new Date().toISOString()});
  if(input.toStatus==="completed")patch.completed_at=new Date().toISOString();
  const {data,error}=await supabaseAdmin.from("ps_store_manager_tasks" as never).update(patch as never).eq("account_id",accountId).eq("id",input.id).select("*").single();if(error)throw error;
  await supabaseAdmin.from("ps_store_manager_task_events" as never).insert({account_id:accountId,task_id:input.id,from_status:from,to_status:input.toStatus,actor:(input.actor??"Merchant").slice(0,120),note:(input.note??"").slice(0,500)} as never);
  return data;
}
