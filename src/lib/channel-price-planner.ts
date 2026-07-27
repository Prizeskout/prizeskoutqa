export type PriceChannel="in_store"|"zid"|"salla"|"talabat"|"snoonu"|"jahez"|"keeta";
export type ChannelEconomics={channel:PriceChannel;commission_pct:number;vat_on_fees_pct:number;payment_fee_pct:number;fixed_fee:number;minimum_margin_pct:number};
export type ChannelPriceProduct={sku:string;name:string;current_price:number;net_margin_pct:number|null;source_platform:string;ingest_event_id:string};
export type ChannelPriceRow={
  sku:string;name:string;channel:PriceChannel;current_price:number;planned_price:number;
  inferred_cost:number|null;contribution:number|null;margin_pct:number|null;change_pct:number|null;
  consumer_difference:number|null;status:"ready"|"approval_required"|"excluded";reason:string;
};

const round=(v:number)=>Math.round((v+Number.EPSILON)*100)/100;

export function planChannelPrices(products:ChannelPriceProduct[],channels:ChannelEconomics[],approvalAbovePct:number,maxChangePct:number):ChannelPriceRow[]{
  return products.flatMap(product=>channels.map(config=>{
    if(!(product.current_price>0)||product.net_margin_pct==null||!Number.isFinite(product.net_margin_pct)){
      return {sku:product.sku,name:product.name,channel:config.channel,current_price:product.current_price,planned_price:product.current_price,inferred_cost:null,contribution:null,margin_pct:null,change_pct:null,consumer_difference:null,status:"excluded",reason:"Verified cost or current margin is missing."} satisfies ChannelPriceRow;
    }
    const cost=product.current_price*(1-product.net_margin_pct/100);
    const feeRate=(config.commission_pct*(1+config.vat_on_fees_pct/100)+config.payment_fee_pct)/100;
    const denominator=1-feeRate-config.minimum_margin_pct/100;
    if(denominator<=0)return {sku:product.sku,name:product.name,channel:config.channel,current_price:product.current_price,planned_price:product.current_price,inferred_cost:round(cost),contribution:null,margin_pct:null,change_pct:null,consumer_difference:null,status:"excluded",reason:"Fees and margin target leave no feasible selling price."} satisfies ChannelPriceRow;
    const unconstrained=(cost+config.fixed_fee)/denominator;
    const change=(unconstrained-product.current_price)/product.current_price*100;
    const constrainedChange=Math.max(-maxChangePct,Math.min(maxChangePct,change));
    const planned=product.current_price*(1+constrainedChange/100);
    const fees=planned*feeRate+config.fixed_fee;
    const contribution=planned-cost-fees;
    const margin=planned?contribution/planned*100:0;
    return {
      sku:product.sku,name:product.name,channel:config.channel,current_price:round(product.current_price),
      planned_price:round(planned),inferred_cost:round(cost),contribution:round(contribution),margin_pct:round(margin),
      change_pct:round(constrainedChange),consumer_difference:round(planned-product.current_price),
      status:Math.abs(constrainedChange)>approvalAbovePct?"approval_required":"ready",
      reason:Math.abs(change)>maxChangePct?`Movement capped at ${maxChangePct}%; target margin is not yet reached.`:"Meets configured channel margin after fees.",
    };
  }));
}
