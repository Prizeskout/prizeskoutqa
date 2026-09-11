import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { V1Context, V1Result } from "@/server/v1-handlers";
import { fetchOdooPosOrders } from "./odoo-json2-adapter";
import { syncEvidenceSourceOrders } from "./evidence-source-sync";

const allowedAuth = new Set(["oauth2","api_key","service_account","partner_webhook","local_agent","file"]);
const allowedCapabilities = new Set(["merchant.read","branches.read","catalogue.read","orders.read","refunds.read","payments.read","costs.read","settlements.read","promotions.read"]);
const forbiddenCredentialKeys = /(^|_)(password|secret|token|api_?key|private_?key|credential)(_|$)/i;
const result = (status:number,body:unknown):V1Result => ({status,body});
const error = (status:number,code:string,message:string):V1Result => result(status,{error:{code,message}});

function hasScope(ctx:V1Context,write=false){return ctx.scopes.some(scope=>write?["write","admin"].includes(scope):["read","write","admin"].includes(scope));}
function cleanString(value:unknown,max=200){return typeof value==="string"?value.trim().slice(0,max):"";}
export function containsRawCredential(value:unknown):boolean{
  if(!value||typeof value!=="object")return false;
  if(Array.isArray(value))return value.some(containsRawCredential);
  return Object.entries(value as Record<string,unknown>).some(([key,item])=>forbiddenCredentialKeys.test(key)||containsRawCredential(item));
}

export async function handleListConnectorDefinitions(_request:Request,ctx:V1Context):Promise<V1Result>{
  if(!hasScope(ctx))return error(403,"forbidden","This API key requires read access.");
  const {data,error:dbError}=await (supabaseAdmin as any).from("ps_connector_definitions").select("provider,display_name,system_type,readiness,auth_methods,capabilities").order("display_name");
  return dbError?error(500,"internal_error","Could not list connector definitions."):result(200,{data:data??[]});
}

export async function handleListConnectorConnections(_request:Request,ctx:V1Context):Promise<V1Result>{
  if(!hasScope(ctx))return error(403,"forbidden","This API key requires read access.");
  const {data,error:dbError}=await (supabaseAdmin as any).from("ps_connector_connections")
    .select("id,merchant_id,provider,environment,auth_method,external_merchant_id,status,requested_capabilities,granted_capabilities,last_health_at,last_success_at,last_error,connected_at,created_at,updated_at")
    .eq("account_id",ctx.accountId).neq("status","revoked").order("created_at",{ascending:false});
  return dbError?error(500,"internal_error","Could not list connector connections."):result(200,{data:data??[]});
}

export async function handleCreateConnectorConnection(request:Request,ctx:V1Context):Promise<V1Result>{
  if(!hasScope(ctx,true))return error(403,"forbidden","This API key requires write access.");
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  if(!body)return error(422,"validation_failed","Request body must be valid JSON.");
  if(containsRawCredential(body.configuration))return error(422,"raw_credentials_forbidden","Do not send passwords, tokens, API keys or secrets in configuration. Use an approved credential_reference.");
  const provider=cleanString(body.provider,80).toLowerCase(),merchantId=cleanString(body.merchant_id),environment=body.environment==="production"?"production":"sandbox",authMethod=cleanString(body.auth_method,40);
  if(!provider||!merchantId||!allowedAuth.has(authMethod))return error(422,"validation_failed","provider, merchant_id and a supported auth_method are required.");
  const requested=Array.isArray(body.requested_capabilities)?[...new Set(body.requested_capabilities.map(value=>cleanString(value,80)).filter(Boolean))]:[];
  if(requested.some(capability=>!allowedCapabilities.has(capability)))return error(422,"unsupported_capability","One or more requested capabilities are unsupported.");
  const db=supabaseAdmin as any,{data:definition}=await db.from("ps_connector_definitions").select("auth_methods,capabilities,readiness").eq("provider",provider).maybeSingle();
  if(!definition)return error(404,"connector_not_found","The requested connector is not registered.");
  if(!definition.auth_methods.includes(authMethod))return error(422,"unsupported_auth_method","This connector does not support the requested authorization method.");
  if(requested.some(value=>!definition.capabilities.includes(value)))return error(422,"unsupported_capability","The connector does not advertise one or more requested capabilities.");
  const status=definition.readiness==="production"&&body.credential_reference?"connected":"setup_required";
  const {data,error:dbError}=await db.from("ps_connector_connections").upsert({account_id:ctx.accountId,merchant_id:merchantId,provider,environment,auth_method:authMethod,
    credential_reference:cleanString(body.credential_reference,500)||null,external_merchant_id:cleanString(body.external_merchant_id)||null,status,requested_capabilities:requested,
    granted_capabilities:status==="connected"?requested:[],configuration:body.configuration&&typeof body.configuration==="object"?body.configuration:{},connected_at:status==="connected"?new Date().toISOString():null,updated_at:new Date().toISOString()},
    {onConflict:"account_id,merchant_id,provider,environment"}).select("id,merchant_id,provider,environment,auth_method,status,requested_capabilities,granted_capabilities,created_at").single();
  return dbError?error(500,"internal_error","Could not register the connector connection."):result(201,{data});
}

export async function handleSaveConnectorMapping(request:Request,ctx:V1Context,connectionId:string):Promise<V1Result>{
  if(!hasScope(ctx,true))return error(403,"forbidden","This API key requires write access.");
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  if(!body)return error(422,"validation_failed","Request body must be valid JSON.");
  const identityType=cleanString(body.identity_type,40),externalId=cleanString(body.external_id),canonicalId=cleanString(body.canonical_id),approved=body.merchant_approved===true;
  if(!["legal_entity","brand","branch","revenue_center","product","customer","order"].includes(identityType)||!externalId||!canonicalId)return error(422,"validation_failed","identity_type, external_id and canonical_id are required.");
  const db=supabaseAdmin as any,{data:connection}=await db.from("ps_connector_connections").select("id").eq("id",connectionId).eq("account_id",ctx.accountId).maybeSingle();
  if(!connection)return error(404,"connection_not_found","Connector connection not found.");
  const submittedConfidence=Number(body.confidence??0.5),confidence=Number.isFinite(submittedConfidence)?Math.max(0,Math.min(1,submittedConfidence)):0.5;
  const now=new Date().toISOString(),{data,error:dbError}=await db.from("ps_connector_identity_mappings").upsert({account_id:ctx.accountId,connection_id:connectionId,identity_type:identityType,
    external_id:externalId,canonical_id:canonicalId,match_status:approved?"confirmed":"proposed",match_method:approved?"merchant_confirmed":"manual",confidence:approved?1:confidence,
    approved_by:approved?cleanString(body.approved_by,160)||"Merchant API":null,approved_at:approved?now:null,updated_at:now},{onConflict:"connection_id,identity_type,external_id"})
    .select("id,identity_type,external_id,canonical_id,match_status,match_method,confidence,approved_at").single();
  return dbError?error(500,"internal_error","Could not save the identity mapping."):result(200,{data});
}

export async function handleUpdateConnectorCheckpoint(request:Request,ctx:V1Context,connectionId:string):Promise<V1Result>{
  if(!hasScope(ctx,true))return error(403,"forbidden","This API key requires write access.");
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null,stream=cleanString(body?.stream,80);
  if(!body||!stream)return error(422,"validation_failed","stream is required.");
  const db=supabaseAdmin as any,{data:connection}=await db.from("ps_connector_connections").select("id").eq("id",connectionId).eq("account_id",ctx.accountId).maybeSingle();
  if(!connection)return error(404,"connection_not_found","Connector connection not found.");
  const state=["idle","running","healthy","partial","failed"].includes(String(body.status))?String(body.status):"healthy",now=new Date().toISOString();
  const {data,error:dbError}=await db.from("ps_connector_sync_checkpoints").upsert({connection_id:connectionId,stream,cursor_value:cleanString(body.cursor,1000)||null,
    watermark_at:cleanString(body.watermark_at,80)||null,last_attempt_at:now,last_success_at:state==="healthy"?now:null,status:state,records_received:Math.max(0,Number(body.records_received??0)||0),
    last_error:state==="failed"?cleanString(body.error,1000)||"Connector reported failure":null,updated_at:now},{onConflict:"connection_id,stream"}).select("*").single();
  if(!dbError)await db.from("ps_connector_connections").update({last_health_at:now,last_success_at:state==="healthy"?now:undefined,last_error:state==="failed"?cleanString(body.error,1000):null,status:state==="failed"?"degraded":undefined,updated_at:now}).eq("id",connectionId).eq("account_id",ctx.accountId);
  return dbError?error(500,"internal_error","Could not update the sync checkpoint."):result(200,{data});
}

export async function handleStoreConnectorCredential(request:Request,ctx:V1Context,connectionId:string):Promise<V1Result>{
  if(!hasScope(ctx,true))return error(403,"forbidden","This API key requires write access.");
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  if(!body)return error(422,"validation_failed","Request body must be valid JSON.");
  const allowedKeys=new Set(["api_key"]),keys=Object.keys(body);
  if(keys.length!==1||keys.some(key=>!allowedKeys.has(key))||!cleanString(body.api_key,1000))return error(422,"validation_failed","Provide only the dedicated provider api_key. Usernames and passwords are not accepted.");
  const db=supabaseAdmin as any,{data:connection}=await db.from("ps_connector_connections").select("id,provider,auth_method").eq("id",connectionId).eq("account_id",ctx.accountId).maybeSingle();
  if(!connection)return error(404,"connection_not_found","Connector connection not found.");
  if(connection.auth_method!=="api_key")return error(409,"auth_method_mismatch","This connection is not configured for API-key authorization.");
  const {data:vaultId,error:rpcError}=await db.rpc("ps_store_connector_credential",{p_account_id:ctx.accountId,p_connection_id:connectionId,p_secret:{api_key:cleanString(body.api_key,1000)}});
  if(rpcError||!vaultId)return error(500,"credential_storage_failed","Could not encrypt and store the connector credential.");
  await db.from("ps_connector_connections").update({status:"pending_approval",last_error:null,updated_at:new Date().toISOString()}).eq("id",connectionId).eq("account_id",ctx.accountId);
  return result(200,{data:{connection_id:connectionId,credential_reference:`vault://${vaultId}`,status:"pending_approval"}});
}

export async function handleRunConnectorSync(_request:Request,ctx:V1Context,connectionId:string):Promise<V1Result>{
  if(!hasScope(ctx,true))return error(403,"forbidden","This API key requires write access.");
  const db=supabaseAdmin as any,{data:connection}=await db.from("ps_connector_connections").select("*").eq("id",connectionId).eq("account_id",ctx.accountId).maybeSingle();
  if(!connection)return error(404,"connection_not_found","Connector connection not found.");
  if(connection.provider!=="odoo")return error(409,"adapter_unavailable",`A production pull adapter is not enabled for ${connection.provider}.`);
  const {data:credential,error:credentialError}=await db.rpc("ps_read_connector_credential",{p_account_id:ctx.accountId,p_connection_id:connectionId});
  if(credentialError||!cleanString(credential?.api_key,1000))return error(409,"credential_not_configured","Store the dedicated Odoo API key before synchronizing.");
  const config=connection.configuration&&typeof connection.configuration==="object"?connection.configuration:{};
  const baseUrl=cleanString(config.base_url,500),currency=cleanString(config.currency,3).toUpperCase(),database=cleanString(config.database,120)||null;
  if(!baseUrl||!currency)return error(409,"configuration_incomplete","Odoo base_url and three-letter currency are required in connection configuration.");
  const {data:checkpoint}=await db.from("ps_connector_sync_checkpoints").select("cursor_value").eq("connection_id",connectionId).eq("stream","orders").maybeSingle();
  const started=new Date().toISOString();
  await db.from("ps_connector_sync_checkpoints").upsert({connection_id:connectionId,stream:"orders",status:"running",last_attempt_at:started,updated_at:started},{onConflict:"connection_id,stream"});
  try{
    const page=await fetchOdooPosOrders({baseUrl,apiKey:credential.api_key,database,currency,cursor:checkpoint?.cursor_value});
    let sourceQuery=db.from("ps_evidence_source_connections").select("id").eq("account_id",ctx.accountId).eq("provider","odoo").eq("external_connection_reference",connectionId).maybeSingle();
    let {data:source}=await sourceQuery;
    if(!source){const inserted=await db.from("ps_evidence_source_connections").insert({account_id:ctx.accountId,merchant_id:connection.merchant_id,provider:"odoo",connection_kind:"optional_api",status:"active",read_only:true,permissions:["orders.read"],branch_references:[],external_connection_reference:connectionId}).select("id").single();source=inserted.data;}
    if(!source)throw new Error("Could not create the Odoo evidence source.");
    const syncResult=page.records.length?await syncEvidenceSourceOrders({connectionId:source.id,batchId:`odoo:${checkpoint?.cursor_value??"start"}:${page.cursorAfter??"end"}`,cursorAfter:page.cursorAfter,records:page.records,deliveryComplete:page.deliveryComplete,declaredRecordCount:page.recordsSeen}):null;
    const finished=new Date().toISOString();
    await db.from("ps_connector_sync_checkpoints").upsert({connection_id:connectionId,stream:"orders",cursor_value:page.cursorAfter,status:"healthy",records_received:page.recordsSeen,last_attempt_at:started,last_success_at:finished,last_error:null,updated_at:finished},{onConflict:"connection_id,stream"});
    await db.from("ps_connector_connections").update({status:"connected",granted_capabilities:connection.requested_capabilities.filter((value:string)=>value==="orders.read"||value==="branches.read"),last_health_at:finished,last_success_at:finished,last_error:null,connected_at:connection.connected_at??finished,updated_at:finished}).eq("id",connectionId).eq("account_id",ctx.accountId);
    return result(200,{data:{connection_id:connectionId,stream:"orders",records_seen:page.recordsSeen,records_accepted:page.records.length,cursor_after:page.cursorAfter,delivery_complete:page.deliveryComplete,sync:syncResult}});
  }catch(caught){const message=(caught instanceof Error?caught.message:"Odoo synchronization failed.").slice(0,1000),finished=new Date().toISOString();
    await db.from("ps_connector_sync_checkpoints").upsert({connection_id:connectionId,stream:"orders",status:"failed",last_attempt_at:started,last_error:message,updated_at:finished},{onConflict:"connection_id,stream"});
    await db.from("ps_connector_connections").update({status:"degraded",last_health_at:finished,last_error:message,updated_at:finished}).eq("id",connectionId).eq("account_id",ctx.accountId);
    return error(502,"connector_sync_failed",message);}
}
