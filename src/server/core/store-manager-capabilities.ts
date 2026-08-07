export type ManagerRisk="read_only"|"reversible"|"financial"|"permanent"|"external_commitment";
export type ManagerCapability={id:string;label:string;domain:string;platforms:string[];risk:ManagerRisk;preview:boolean;readback:boolean;rollback:boolean;approval:"never"|"policy"|"always";availability:"connected"|"manual_fallback"};

export const STORE_MANAGER_CAPABILITIES:ManagerCapability[]=[
  {id:"catalog.sync",label:"Synchronize catalogue",domain:"catalogue",platforms:["zid","salla","foodics"],risk:"read_only",preview:false,readback:true,rollback:false,approval:"never",availability:"connected"},
  {id:"catalog.inspect",label:"Inspect products and catalogue quality",domain:"catalogue",platforms:["zid","salla","foodics"],risk:"read_only",preview:false,readback:true,rollback:false,approval:"never",availability:"connected"},
  {id:"product.create",label:"Create product drafts",domain:"catalogue",platforms:["zid"],risk:"reversible",preview:true,readback:true,rollback:true,approval:"always",availability:"connected"},
  {id:"product.edit",label:"Edit products, variants, categories and images",domain:"catalogue",platforms:["zid"],risk:"reversible",preview:true,readback:true,rollback:true,approval:"always",availability:"connected"},
  {id:"product.publish",label:"Publish or unpublish products",domain:"catalogue",platforms:["zid"],risk:"reversible",preview:true,readback:true,rollback:true,approval:"always",availability:"connected"},
  {id:"inventory.inspect",label:"Inspect stock and availability",domain:"inventory",platforms:["zid"],risk:"read_only",preview:false,readback:true,rollback:false,approval:"never",availability:"connected"},
  {id:"inventory.update",label:"Update product stock",domain:"inventory",platforms:["zid"],risk:"reversible",preview:true,readback:true,rollback:true,approval:"always",availability:"connected"},
  {id:"pricing.preview",label:"Calculate protected prices",domain:"pricing",platforms:["zid","salla","foodics"],risk:"read_only",preview:true,readback:true,rollback:false,approval:"never",availability:"connected"},
  {id:"pricing.publish",label:"Publish protected prices",domain:"pricing",platforms:["zid","salla","foodics"],risk:"financial",preview:true,readback:true,rollback:true,approval:"policy",availability:"connected"},
  {id:"orders.inspect",label:"Inspect orders and fulfilment",domain:"orders",platforms:["zid"],risk:"read_only",preview:false,readback:true,rollback:false,approval:"never",availability:"connected"},
  {id:"orders.status",label:"Update order status",domain:"orders",platforms:["zid"],risk:"reversible",preview:true,readback:true,rollback:false,approval:"always",availability:"connected"},
  {id:"customers.inspect",label:"Find customers with masked personal data",domain:"customers",platforms:["zid"],risk:"read_only",preview:false,readback:true,rollback:false,approval:"never",availability:"connected"},
  {id:"loyalty.adjust",label:"Adjust loyalty points",domain:"customers",platforms:["zid"],risk:"financial",preview:true,readback:true,rollback:false,approval:"always",availability:"connected"},
  {id:"promotion.analyse",label:"Simulate promotion profitability",domain:"promotions",platforms:["all"],risk:"read_only",preview:true,readback:false,rollback:false,approval:"never",availability:"connected"},
  {id:"promotion.launch",label:"Launch partner campaign",domain:"promotions",platforms:["all"],risk:"external_commitment",preview:true,readback:false,rollback:false,approval:"always",availability:"manual_fallback"},
  {id:"payout.audit",label:"Audit payouts and prepare recovery evidence",domain:"finance",platforms:["all"],risk:"read_only",preview:true,readback:false,rollback:false,approval:"never",availability:"connected"},
  {id:"dispute.submit",label:"Submit recovery claim",domain:"finance",platforms:["all"],risk:"external_commitment",preview:true,readback:false,rollback:false,approval:"always",availability:"manual_fallback"},
  {id:"competitor.monitor",label:"Monitor competitor products",domain:"market",platforms:["web"],risk:"read_only",preview:false,readback:true,rollback:false,approval:"never",availability:"connected"},
  {id:"report.prepare",label:"Prepare operational or financial report",domain:"reporting",platforms:["all"],risk:"read_only",preview:true,readback:false,rollback:false,approval:"never",availability:"connected"},
  {id:"manual.coordinate",label:"Coordinate unsupported work with a person or partner",domain:"coordination",platforms:["all"],risk:"external_commitment",preview:true,readback:false,rollback:false,approval:"always",availability:"manual_fallback"},
];

export function capabilityById(id:string){return STORE_MANAGER_CAPABILITIES.find(item=>item.id===id)??null;}
export function validateManagerWorkflow(input:{steps?:Array<Record<string,unknown>>}){
  const errors:string[]=[],steps=(input.steps??[]).slice(0,20).map((step,index)=>{
    const capability=capabilityById(String(step.capability??""));
    if(!capability)errors.push(`Step ${index+1} uses an unsupported capability.`);
    return {...step,sequence:index+1,capability:capability?.id??String(step.capability??""),risk:capability?.risk??"read_only",approval_required:capability?.approval==="always"||capability?.approval==="policy",execution:capability?.availability??"manual_fallback",verification:capability?.readback?"platform_readback":capability?.availability==="manual_fallback"?"merchant_or_partner_reference":"evidence_record"};
  });
  if(!steps.length)errors.push("The workflow needs at least one step.");
  return {ok:errors.length===0,errors,steps};
}
