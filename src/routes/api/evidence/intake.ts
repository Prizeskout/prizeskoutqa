import {createHash} from "node:crypto";
import {createFileRoute} from "@tanstack/react-router";
import {supabaseAdmin} from "@/integrations/supabase/client.server";
import {verifyMerchantAccess} from "@/server/core/byok-connect";
import {appendEvidenceProcessingAttempt,registerMerchantEvidence} from "@/server/core/merchant-evidence-intake";

const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json"}});
const safeName=(value:string)=>value.replace(/[^a-zA-Z0-9._-]+/g,"-").slice(-180)||"evidence";

export const Route=createFileRoute("/api/evidence/intake")({server:{handlers:{
  POST:async({request})=>{try{
    const form=await request.formData();
    const merchantId=String(form.get("merchant_id")??"").trim(),accessCode=String(form.get("access_code")??"");
    if(!await verifyMerchantAccess(merchantId,accessCode))return response({error:"Unauthorized"},403);
    const file=form.get("file");if(!(file instanceof File))return response({error:"Choose an evidence file."},400);
    if(file.size<1||file.size>15*1024*1024)return response({error:"Evidence files must be between 1 byte and 15 MB."},413);
    const bytes=Buffer.from(await file.arrayBuffer()),hash=createHash("sha256").update(bytes).digest("hex");
    const provider=String(form.get("source_provider")??"merchant-upload").trim().toLowerCase().slice(0,120)||"merchant-upload";
    const path=`${merchantId}/${hash}/${safeName(file.name)}`;
    const {error:storageError}=await supabaseAdmin.storage.from("merchant-evidence").upload(path,bytes,{contentType:file.type||"application/octet-stream",upsert:false});
    if(storageError&&!/already exists|duplicate/i.test(storageError.message))throw storageError;
    const intake=await registerMerchantEvidence({accountId:merchantId,merchantId,sourceKind:"file_upload",sourceProvider:provider,sourceExternalId:`upload:${hash}`,documentKind:"unknown",contentSha256:hash,mediaType:file.type||null,originalFilename:file.name,storageReference:`merchant-evidence/${path}`,sourceMetadata:{original_bytes_retained:true,size_bytes:file.size}});
    if(!intake.duplicate)await appendEvidenceProcessingAttempt({evidenceItemId:intake.evidenceItemId,accountId:merchantId,processorVersion:"original-file-intake-v1",attemptNumber:1,state:"accepted",detectedDocumentKind:"unknown",extractionSummary:{original_bytes_retained:true,size_bytes:file.size}});
    return response({ok:true,evidence_item_id:intake.evidenceItemId,duplicate:intake.duplicate,content_sha256:hash});
  }catch(error){return response({error:error instanceof Error?error.message:"Evidence intake failed."},422);}
  }
}}});
