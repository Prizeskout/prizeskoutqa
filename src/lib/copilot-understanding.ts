export type CopilotProductReference={name?:string;sku?:string;platform?:string};

const TYPO:Record<string,string>={
  prodcut:"product",proejct:"project",publsh:"publish",catelogue:"catalogue",
  catlog:"catalogue",reprce:"reprice",prce:"price",quanity:"quantity",
  inventry:"inventory",commision:"commission",profitt:"profit",
};

export function normalizeCopilotPrompt(value:string){
  return value.normalize("NFKC")
    .replace(/[٠-٩]/g,d=>String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g,d=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[\u0640\u064B-\u065F\u0670]/g,"")
    .replace(/[’‘]/g,"'").replace(/[“”]/g,'"')
    .replace(/\b[a-z]+\b/gi,word=>TYPO[word.toLocaleLowerCase("und")]??word)
    .replace(/\s+/g," ").trim();
}

const clean=(value:string)=>normalizeCopilotPrompt(value).toLocaleLowerCase("und")
  .replace(/[أإآٱ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه")
  .replace(/[^\p{L}\p{N}]+/gu," ").trim();
const tokens=(value:string)=>new Set(clean(value).split(" ").filter(Boolean));
const overlap=(a:Set<string>,b:Set<string>)=>{let hit=0;for(const item of a)if(b.has(item))hit++;return hit/Math.max(1,Math.max(a.size,b.size));};

export function rankProductReferences<T extends CopilotProductReference>(products:T[],queryValue:string,platform="all"){
  const query=clean(queryValue),queryTokens=tokens(queryValue),wantedPlatform=clean(platform);
  return products.map(product=>{
    if(wantedPlatform&&wantedPlatform!=="all"&&clean(product.platform??"")!==wantedPlatform)return {product,score:0};
    const sku=clean(product.sku??""),name=clean(product.name??""),haystack=`${name} ${sku}`.trim();
    let score=overlap(queryTokens,tokens(haystack));
    if(query&&sku===query)score=1;
    else if(query&&name===query)score=.98;
    else if(query&&(name.includes(query)||sku.includes(query)))score=Math.max(score,.86);
    else if(query&&query.includes(name)&&name.length>2)score=Math.max(score,.8);
    return {product,score};
  }).filter(item=>item.score>0).sort((a,b)=>b.score-a.score);
}

export function resolveProductReferences<T extends CopilotProductReference>(products:T[],query:string,platform="all"){
  const ranked=rankProductReferences(products,query,platform),best=ranked[0],second=ranked[1];
  if(!best||best.score<.45)return {status:"missing" as const,matches:[] as T[],confidence:best?.score??0};
  const ambiguous=best.score<.97&&Boolean(second&&second.score>=.3&&best.score-second.score<.25);
  return {status:ambiguous?"ambiguous" as const:"resolved" as const,matches:(ambiguous?ranked.slice(0,5):[best]).map(item=>item.product),confidence:best.score};
}

export function compactConversation(turns:Array<{role:"user"|"assistant";text:string}>,limit=6){
  return turns.slice(-limit).map(turn=>({role:turn.role,text:turn.text.slice(0,500)}));
}
