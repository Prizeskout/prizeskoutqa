export type BridgeEligibility = { mazeed_active:boolean;jahez_active:boolean;eligible_skus:string[] };
const normalizeSku=(value:string)=>value.trim().toLocaleUpperCase();

export function bridgeCanTrack(settings:BridgeEligibility|null,sku:string){
  if(!settings?.mazeed_active||!settings.jahez_active)return false;
  const eligible=settings.eligible_skus.map(normalizeSku);
  return eligible.length>0&&eligible.includes(normalizeSku(sku));
}

export function zidCustomerPricePatch(product:Record<string,unknown>|null,newPrice:number){
  return product?.sale_price!=null?{sale_price:newPrice}:{price:newPrice};
}
