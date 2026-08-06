import {supabaseAdmin} from "@/integrations/supabase/client.server";
export type GroupControls={id:string;account_id:string;group_name:string;legal_entities:unknown[];brands:unknown[];branches:unknown[];members:unknown[];finance_approved_by:string|null;finance_approved_at:string|null;operations_approved_by:string|null;operations_approved_at:string|null;hierarchy_hash?:string|null;approved_hierarchy_hash?:string|null;policy_status?:string;active_policy_version?:number|null;active_margin_floor_pct?:number|null;policy_activated_at?:string|null;policy_rollout?:Array<{branch_id:string;branch_name:string;status:"live"|"manual";channels:string[]}>;created_at:string;updated_at:string};

type GroupMember={id:string;name:string;role:"finance_reviewer"|"operations_reviewer"|"branch_manager"|"viewer"};
const normalize=(value:string)=>value.trim().toLocaleLowerCase();
async function hashHierarchy(input:Pick<GroupControls,"group_name"|"legal_entities"|"brands"|"branches"|"members">){
  const encoded=new TextEncoder().encode(JSON.stringify(input));
  const digest=await crypto.subtle.digest("SHA-256",encoded);
  return Array.from(new Uint8Array(digest)).map(value=>value.toString(16).padStart(2,"0")).join("");
}
export async function getGroupControls(accountId:string){
  const {data,error}=await supabaseAdmin.from("ps_group_controls").select("*").eq("account_id",accountId).maybeSingle();
  if(error&&error.code!=="42P01")throw error;return data as GroupControls|null;
}
export async function saveGroupControls(accountId:string,input:Pick<GroupControls,"group_name"|"legal_entities"|"brands"|"branches"|"members">){
  const hierarchyHash=await hashHierarchy(input);
  const {data,error}=await supabaseAdmin.from("ps_group_controls").upsert({account_id:accountId,...input,hierarchy_hash:hierarchyHash,approved_hierarchy_hash:null,policy_status:"pending_approval",finance_approved_by:null,finance_approved_at:null,operations_approved_by:null,operations_approved_at:null,updated_at:new Date().toISOString()} as never,{onConflict:"account_id"}).select("*").single();
  if(error)throw error;return data as GroupControls;
}
export async function approveGroupControls(accountId:string,role:"finance"|"operations",reviewer:string){
  const current=await getGroupControls(accountId);
  if(!current)throw new Error("Save the group hierarchy before requesting approval.");
  const requiredRole=role==="finance"?"finance_reviewer":"operations_reviewer";
  const members=(current.members??[]) as GroupMember[];
  const member=members.find(item=>item.role===requiredRole&&(normalize(item.name)===normalize(reviewer)||item.id===reviewer));
  if(!member)throw new Error(`Choose a configured ${role} reviewer. Typed names cannot approve group policies.`);
  const other=role==="finance"?current.operations_approved_by:current.finance_approved_by;
  if(other&&normalize(other)===normalize(member.name))throw new Error("Finance and Operations must be approved by different people.");
  const now=new Date().toISOString();
  const firstPatch=role==="finance"?{finance_approved_by:member.name,finance_approved_at:now}:{operations_approved_by:member.name,operations_approved_at:now};
  const financeApproved=role==="finance"||Boolean(current.finance_approved_at);
  const operationsApproved=role==="operations"||Boolean(current.operations_approved_at);
  const patch={...firstPatch,policy_status:financeApproved&&operationsApproved?"approved":"pending_approval",approved_hierarchy_hash:financeApproved&&operationsApproved?current.hierarchy_hash:null,updated_at:now};
  const {data,error}=await supabaseAdmin.from("ps_group_controls").update(patch as never).eq("account_id",accountId).eq("hierarchy_hash" as never,current.hierarchy_hash as never).select("*").single();
  if(error)throw error;
  const {error:auditError}=await supabaseAdmin.from("ps_group_approval_events" as never).insert({account_id:accountId,group_control_id:current.id,approval_role:role,reviewer_member_id:member.id,reviewer_name:member.name,hierarchy_hash:current.hierarchy_hash??"legacy",decision:"approved"} as never);
  if(auditError&&auditError.code!=="42P01")throw auditError;
  return data as GroupControls;
}

export async function activateGroupPolicy(accountId:string,marginFloorPct:number){
  const current=await getGroupControls(accountId);
  if(!current||current.policy_status!=="approved"||!current.finance_approved_at||!current.operations_approved_at)throw new Error("Finance and Operations must approve the current hierarchy first.");
  if(!current.hierarchy_hash||current.approved_hierarchy_hash!==current.hierarchy_hash)throw new Error("The hierarchy changed after approval. Save and approve it again.");
  if(!Number.isFinite(marginFloorPct)||marginFloorPct<0||marginFloorPct>100)throw new Error("Margin floor must be between 0 and 100.");
  const {data:connections}=await supabaseAdmin.from("ps_merchant_channels").select("platform,status").eq("account_id",accountId);
  const connected=new Set((connections??[]).filter(item=>item.status==="connected").map(item=>item.platform));
  const rollout=((current.branches??[]) as Array<{id?:string;name?:string;channels?:string[]}>).map(branch=>{
    const channels=(branch.channels??[]).map(value=>value.toLowerCase());
    return {branch_id:branch.id??"unknown",branch_name:branch.name??"Unnamed branch",channels,status:channels.length>0&&channels.every(channel=>channel==="in_store"||connected.has(channel))?"live" as const:"manual" as const};
  });
  const now=new Date().toISOString();
  const version=(current.active_policy_version??0)+1;
  const status=rollout.some(item=>item.status==="manual")?"partially_live":"live";
  const {data,error}=await supabaseAdmin.from("ps_group_controls").update({policy_status:status,active_policy_version:version,active_margin_floor_pct:marginFloorPct,policy_activated_at:now,policy_rollout:rollout,updated_at:now} as never).eq("account_id",accountId).eq("hierarchy_hash" as never,current.hierarchy_hash as never).select("*").single();
  if(error)throw error;
  return data as GroupControls;
}
