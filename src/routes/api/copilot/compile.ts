// POST /api/copilot/compile
//
// Dual-mode CFO Copilot:
//   - Pricing intent  → compiles to deterministic engine config JSON
//   - Questions/chat  → responds conversationally about pricing strategy
//
// Body:  { prompt: string }
// Returns:
//   { type: "rule",    rule: Record<string,unknown>, latency_ms: number }
//   { type: "chat",    message: string,             latency_ms: number }

import { createFileRoute } from "@tanstack/react-router";
import Anthropic from "@anthropic-ai/sdk";

// Used only when the input is a conversational question.
// No JSON schema — model outputs plain text, we return it as-is.
const CHAT_SYSTEM = `You are the CFO Copilot, a friendly expert pricing strategist built into PrizeSkout — a margin management platform for food and e-commerce merchants in the Gulf region (Qatar, Saudi Arabia, UAE).

Answer the merchant's question in plain, conversational prose. Be practical and specific to Gulf-region food/e-commerce contexts.

FORMATTING RULES — strictly follow these:
- No markdown. No asterisks, no hashes, no bold, no headers, no bullet dashes.
- Write in flowing sentences and short paragraphs only.
- Use a blank line to separate paragraphs if needed.
- No lists. If you need to enumerate things, write them inline: "I can help with X, Y, and Z."

Keep your answer under 100 words. Respond in the same language the merchant used.`;

// Used when the input looks like a pricing rule intent.
// Model must output pure JSON — no markdown, no prose.
const RULE_SYSTEM = `You are a pricing rule compiler for PrizeSkout, a margin management platform for Gulf-region merchants.

Convert the merchant's pricing intent into a JSON engine config. Output ONLY valid JSON — no markdown, no explanation, no extra text.

Schema:
{
  "policy_type": "margin_floor" | "approval_threshold" | "stale_cost_guard" | "maximum_price_change" | "competitor_match" | "conditional_floor" | "legal_ceiling" | "channel_parity",
  "engine_rule": "active_margin_defense" | "manual_approval_gate" | "stale_cost_guard" | "maximum_price_change" | "competitor_price_match" | "conditional_floor_raise" | "moci_ceiling_clamp" | "price_parity_lock",
  "target_category": string,
  "target_sku_class": string,
  "channels": string[],
  "minimum_floor": number | null,
  "maximum_ceiling": number | null,
  "approval_threshold_pct": number | null,
  "maximum_change_pct": number | null,
  "stop_on_stale_cost": boolean,
  "competitor": string | null,
  "match_direction": "up" | "down" | "both" | null,
  "trigger": string | null,
  "revert_after_hours": number,
  "region": string,
  "regional_override_allowed": boolean,
  "summary": string,
  "warnings": string[],
  "latency_budget_ms": 1850
}

Rules:
- All percentage fields are decimal fractions (0.25 = 25%)
- A percentage means ONLY what the merchant attached it to. Never turn an approval threshold into a margin floor.
- "require approval when a price increase exceeds 10%" means policy_type=approval_threshold, approval_threshold_pct=0.10, minimum_floor=null.
- "exclude/stop products with stale cost data" means policy_type=stale_cost_guard, stop_on_stale_cost=true, minimum_floor=null.
- Only explicit margin/floor language may produce minimum_floor.
- Extract named sales channels into channels (for example ["zid"]).
- Use null for fields the merchant did not specify. Never invent a floor, ceiling, competitor, trigger, or threshold.
- latency_budget_ms is always 1850
- competitor matching/beating → "competitor_price_match"
- weather/event/time triggered → "conditional_floor_raise"
- government price cap → "moci_ceiling_clamp"
- cross-channel parity → "price_parity_lock"
- default → "active_margin_defense"`;

function normaliseCompiledRule(prompt: string, modelRule: Record<string, unknown>): Record<string, unknown> {
  const text = prompt.toLowerCase();
  const percentage = text.match(/(\d+(?:\.\d+)?)\s*%/);
  const pct = percentage ? Number(percentage[1]) / 100 : null;
  const channels = ["zid","salla","talabat","jahez","foodics","amazon","noon"]
    .filter(channel => new RegExp(`\\b${channel}\\b`, "i").test(text));
  const approvalIntent = /\b(approval|approve|manual review|sign[- ]?off)\b/.test(text);
  const staleCostIntent = /\b(stale|old|outdated|missing)\b.*\bcost\b|\bcost\b.*\b(stale|old|outdated|missing)\b/.test(text);
  const maxChangeIntent = /\b(max(?:imum)?|limit|no more than)\b.*\b(change|increase|decrease)\b/.test(text);
  const marginIntent = /\b(margin|floor)\b/.test(text);

  const rule: Record<string, unknown> = { ...modelRule, channels, latency_budget_ms: 1850 };
  if (approvalIntent) {
    return {
      ...rule,
      policy_type: "approval_threshold",
      engine_rule: "manual_approval_gate",
      minimum_floor: null,
      maximum_ceiling: null,
      approval_threshold_pct: pct,
      maximum_change_pct: null,
      stop_on_stale_cost: false,
      trigger: "price_change_requires_approval",
      summary: `Require manual approval when a price change exceeds ${pct == null ? "the configured threshold" : `${pct * 100}%`}.`,
      warnings: pct == null ? ["An approval threshold is required before this draft can be activated."] : [],
    };
  }
  if (staleCostIntent) {
    return {
      ...rule,
      policy_type: "stale_cost_guard",
      engine_rule: "stale_cost_guard",
      minimum_floor: null,
      maximum_ceiling: null,
      approval_threshold_pct: null,
      maximum_change_pct: null,
      stop_on_stale_cost: true,
      trigger: "cost_data_stale",
      summary: "Exclude products with stale or missing cost data from automatic repricing.",
      warnings: [],
    };
  }
  if (maxChangeIntent) {
    return {
      ...rule,
      policy_type: "maximum_price_change",
      engine_rule: "maximum_price_change",
      minimum_floor: null,
      maximum_ceiling: null,
      approval_threshold_pct: null,
      maximum_change_pct: pct,
      stop_on_stale_cost: false,
      summary: `Limit each price change to ${pct == null ? "the configured threshold" : `${pct * 100}%`}.`,
      warnings: pct == null ? ["A maximum-change threshold is required."] : [],
    };
  }
  if (marginIntent) {
    rule.policy_type = rule.policy_type ?? "margin_floor";
    rule.minimum_floor = pct ?? rule.minimum_floor ?? null;
  } else {
    rule.minimum_floor = null;
  }
  rule.approval_threshold_pct = rule.approval_threshold_pct ?? null;
  rule.maximum_change_pct = rule.maximum_change_pct ?? null;
  rule.stop_on_stale_cost = Boolean(rule.stop_on_stale_cost);
  rule.warnings = Array.isArray(rule.warnings) ? rule.warnings : [];
  return rule;
}

const OPERATION_SYSTEM = `You are the operations planner for PrizeSkout, a commerce control platform.
Convert the merchant's request into a safe executable operation plan. Output ONLY valid JSON.
Schema:
{
  "operation": "sync_catalog" | "list_products" | "find_products" | "preview_reprice" | "publish_prices" | "protect_margin" | "low_stock" | "cost_attention" | "list_orders" | "profit_brief" | "tax_summary" | "returns_impact" | "coupon_risk" | "change_order_status" | "create_product_draft" | "seed_test_store" | "cleanup_test_store",
  "platform": "zid" | "salla" | "foodics" | "all",
  "query": string | null,
  "category": string | null,
  "sku": string | null,
  "scope": "single" | "matching" | "all",
  "price_mode": "recommended" | "fixed" | "percentage_change" | null,
  "target_price": number | null,
  "percentage_change": number | null,
  "minimum_margin_pct": number | null,
  "maximum_increase_pct": number | null,
  "verified_costs_only": boolean,
  "exclude_out_of_stock": boolean,
  "order_id": string | null,
  "order_status": "new" | "preparing" | "ready" | "indelivery" | "delivered" | "cancelled" | null,
  "product_name": string | null,
  "product_sku": string | null,
  "product_price": number | null,
  "summary": string,
  "requires_confirmation": boolean,
  "warnings": string[]
}
Pull/import/refresh/sync catalogue means sync_catalog. Show/list catalogue means list_products. Low/out of stock means low_stock. Missing/unverified product costs means cost_attention. Show/list/summarize today's orders means list_orders. Asking what the store kept, order profit, loss-making orders, or a profit brief means profit_brief. Asking about VAT, tax included in prices, or tax removed from revenue means tax_summary. Asking how returns or refunds affected revenue or profit means returns_impact. Asking whether coupons, discount codes, or promotions are safe means coupon_risk. Mark/move a named order to a status means change_order_status. Create/add a product as a draft means create_product_draft and is never published automatically. Prepare/seed/set up the Zid test store for review means seed_test_store. Remove/clean up PrizeSkout test fixtures means cleanup_test_store.
Find/show a named product or SKU means find_products. Reprice/recommend/calculate without
explicit live/push/apply language means preview_reprice. Push/apply/publish/go live means
publish_prices and requires_confirmation=true. A request to protect/maintain a stated margin and safely fix products means protect_margin; it is a preview unless the merchant explicitly says publish/apply/go live. Never invent a price. A named product is
scope=single; "all products" is scope=all. Live publishing always requires confirmation.`;

const FOLLOW_UP = /\b(it|them|those|that|same|next|now|then|go ahead|do it|proceed|continue|use recommended|push live|publish live)\b/i;

// "Find Sony A7S III and show its recommendation" names a specific product
// by model code and never says "product"/"catalog"/"sku" — so the
// product-vocabulary check below can't see it. A token mixing letters and
// digits (a model code, e.g. "A7S", "M4", "256GB") is a reliable substitute
// signal: ordinary pricing-strategy prose uses bare numbers ("10%", "25")
// but essentially never alphanumeric codes, so this doesn't pick up
// conversational questions that merely happen to contain a percentage.
const MODEL_CODE = /\b(?=[a-zA-Z0-9]*[a-zA-Z])(?=[a-zA-Z0-9]*\d)[a-zA-Z0-9]+\b/;
const FIND_VERB = /\b(find|search|show|look up|locate)\b/i;

function isOperationalRequest(text: string): boolean {
  const product = /\b(product|products|catalog|catalogue|sku|item|items)\b/i;
  const operation = /\b(pull|import|fetch|retrieve|sync|refresh|show|list|find|search|reprice|recommend|calculate|preview|push|publish|apply|live update|update)\b/i;
  return (product.test(text) && operation.test(text))
    || /\b(what|how much)\b.*\b(keep|kept|profit|contribution)\b|\b(loss[- ]making|unprofitable)\b.*\border/i.test(text)
    || /\b(check|review|show|which|are|is)\b.*\b(coupon|coupons|discount code|promotion|promotions)\b.*\b(safe|risk|margin|profit|loss)|\b(coupon|coupons|discount code|promotion|promotions)\b.*\b(safe|risk|margin|profit|loss)/i.test(text)
    || /\b(show|list|summari[sz]e|check|review)\b.*\b(order|orders)\b/i.test(text)
    || /\b(vat|tax|returns?|refunds?)\b/i.test(text)
    || /\b(mark|move|change|set)\b.*\border\b|\border\b.*\b(ready|preparing|delivered|cancelled)\b/i.test(text)
    || /\b(create|add)\b.*\bproduct\b/i.test(text)
    || /\b(prepare|seed|set ?up|populate|cleanup|clean up)\b.*\b(test store|zid test|review fixtures?|test fixtures?)\b/i.test(text)
    || /\b(protect|maintain|fix|restore)\b.*\bmargin\b.*\b(zid|store|products?)\b/i.test(text)
    || /\b(push|publish|apply|sync|refresh)\b.*\b(zid|salla|foodics)\b/i.test(text)
    || /\b(reprice|repricing|push live|publish live|live updates?)\b/i.test(text)
    || (FIND_VERB.test(text) && MODEL_CODE.test(text));
}

function deterministicZidInsight(prompt:string):Record<string,unknown>|null{
  const text=prompt.toLowerCase();
  const seed=/\b(prepare|seed|set ?up|populate)\b.*\b(test store|zid test|review|test data|fixtures?)\b/.test(text),cleanup=/\b(cleanup|clean up|remove|unpublish)\b.*\b(prizeskout|test store|fixtures?|test products?)\b/.test(text);
  if(seed||cleanup){const operation=cleanup?"cleanup_test_store":"seed_test_store";return {type:"operation",operation:{_type:"operation",operation,platform:"zid",query:null,category:null,sku:null,risk_level:"sensitive_write",requires_confirmation:true,plan:cleanup?["Confirm Zid identifies the connected store as a test store.","Find only products whose SKU starts PS-ZID- and coupons PSMARGIN20/PSSAFE5.","Unpublish test products and remove only the two test coupons.","Keep genuine test orders as review evidence."]:["Confirm Zid identifies the connected store as a test store.","Inspect the existing source product and all PS-ZID fixtures.","Preview nine realistic products and two coupons without writing.","Wait for explicit merchant approval.","Create only missing fixtures using idempotent SKUs and codes.","Read everything back from Zid and report any missing item.","Provide the five-order storefront checkout script."],summary:cleanup?"Clean up only the PrizeSkout review fixtures from the Zid test store.":"Prepare the connected Zid test store for the PrizeSkout review."}};}
  const profit=/\b(what|how much)\b.*\b(keep|kept|profit|contribution)\b|\b(loss[- ]making|unprofitable)\b.*\border|\bprofit brief\b/.test(text);
  const coupons=/\b(coupon|coupons|discount code|promotion|promotions)\b.*\b(safe|risk|margin|profit|loss|below)|\b(which|check|review)\b.*\b(coupon|coupons)\b/.test(text);
  const tax=/\b(vat|tax|taxes)\b/.test(text),returns=/\b(return|returns|returned|refund|refunds|refunded)\b/.test(text);
  if(!profit&&!coupons&&!tax&&!returns)return null;
  const operation=tax?"tax_summary":returns?"returns_impact":profit?"profit_brief":"coupon_risk";
  const plans:Record<string,string[]>={profit_brief:["Read the last 30 days of Zid orders.","Remove confirmed VAT and recorded returns from merchant revenue.","Match ordered products to verified catalogue costs.","Show contribution and loss-making orders without changing the store."],tax_summary:["Read the store's VAT settings from Zid.","Check whether selling prices include VAT.","Use order tax evidence where Zid supplies it.","Show tax removed from contribution calculations without changing the store."],returns_impact:["Read recent Zid orders and recorded refund or return amounts.","Remove recorded returns from usable merchant revenue.","Show affected orders and the impact on what the merchant kept."],coupon_risk:["Read active Zid coupons.","Apply each percentage discount to available verified-cost products.","Remove included VAT before comparing contribution with the active floor.","Show unsafe and unknown coupons without changing them."]};
  const summaries:Record<string,string>={profit_brief:"Calculate what recent Zid orders kept after confirmed tax, returns and verified product costs.",tax_summary:"Explain how Zid VAT affects recent revenue and margin calculations.",returns_impact:"Show how recorded Zid returns and refunds changed what the store kept.",coupon_risk:"Check active Zid coupons against the merchant's protection floor."};
  return {type:"operation",operation:{_type:"operation",operation,platform:"zid",query:null,category:null,sku:null,risk_level:"read",requires_confirmation:false,plan:plans[operation],summary:summaries[operation]}};
}

// Detect conversational questions vs pricing rule intents.
// Strategy: look for HARD RULE SIGNALS; anything without them is conversational.
function isQuestion(text: string): boolean {
  // A specific percentage → pricing rule
  if (/\d+(\.\d+)?%/.test(text)) return false;

  // A named platform → pricing rule
  if (/\b(talabat|jahez|noon|salla|zid|foodics|amazon)\b/i.test(text)) return false;

  // A pricing action verb paired with a pricing noun → pricing rule
  const ACTION  = /\b(lock|match|beat|raise|lower|drop|cap|clamp|enforce|parity|set|apply|trigger|push)\b/i;
  const NOUN    = /\b(price|prices|margin|margins|floor|ceiling|cost|rate|markup)\b/i;
  if (ACTION.test(text) && NOUN.test(text)) return false;

  // Everything else is conversational
  return true;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/copilot/compile")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => null) as {
          prompt?: string;
          context?: {
            previous_operation?: Record<string, unknown>;
            products?: Array<{ name?:string; sku?:string; platform?:string }>;
          };
        } | null;
        const prompt = body?.prompt?.trim();

        if (!prompt) {
          return json({ error: "prompt is required" }, 400);
        }
        if (prompt.length > 2000) {
          return json({ error: "Prompt too long (max 2000 characters)" }, 400);
        }

        const deterministicInsight=deterministicZidInsight(prompt);
        if(deterministicInsight)return json(deterministicInsight);

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          return json({ error: "AI service not configured" }, 503);
        }

        const client = new Anthropic({ apiKey });
        const t0 = Date.now();
        const hasOperationContext = Boolean(body?.context?.previous_operation);
        const operationMode = isOperationalRequest(prompt) || (hasOperationContext && FOLLOW_UP.test(prompt));
        const chatMode = !operationMode && isQuestion(prompt);

        try {
          const message = await client.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: chatMode ? 512 : 768,
            system: operationMode ? OPERATION_SYSTEM : chatMode ? CHAT_SYSTEM : RULE_SYSTEM,
            messages: [{
              role: "user",
              content: operationMode && body?.context
                ? `${prompt}\n\nPRIOR OPERATION CONTEXT (resolve words such as it/them/that/same from this data):\n${JSON.stringify(body.context)}`
                : prompt,
            }],
          });

          const raw = message.content
            .filter(b => b.type === "text")
            .map(b => (b as { type: "text"; text: string }).text)
            .join("")
            .trim();

          const latency_ms = Date.now() - t0;

          // Chat mode: raw text IS the message — no JSON parsing needed.
          // Also include a `rule` shim so older cached UI builds don't show
          // an error when data.rule is undefined.
          if (chatMode) {
            return json({
              type: "chat",
              message: raw,
              rule: { _type: "chat", response: raw },
              latency_ms,
            });
          }

          // Rule mode: parse JSON output
          const cleaned = raw
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```\s*$/i, "")
            .trim();

          let rule: Record<string, unknown>;
          try {
            rule = JSON.parse(cleaned) as Record<string, unknown>;
          } catch {
            const match = cleaned.match(/\{[\s\S]*\}/);
            if (!match) {
              return json({ error: "Model returned unparseable output" }, 502);
            }
            rule = JSON.parse(match[0]) as Record<string, unknown>;
          }

          if (operationMode) {
            const operation = String(rule.operation ?? "");
            const allowed = ["sync_catalog", "list_products", "find_products", "preview_reprice", "publish_prices", "protect_margin", "low_stock", "cost_attention", "list_orders", "profit_brief", "tax_summary", "returns_impact", "coupon_risk", "change_order_status", "create_product_draft", "seed_test_store", "cleanup_test_store"];
            if (!allowed.includes(operation)) {
              return json({ error: "The requested commerce operation is not supported yet." }, 422);
            }
            const prior = body?.context?.previous_operation;
            const referencedProducts = body?.context?.products ?? [];
            const vagueQuery = !rule.query || /^(it|them|those|that|same|product|products)$/i.test(String(rule.query).trim());
            if (prior) {
              if (vagueQuery) {
                if (referencedProducts.length === 1 && referencedProducts[0].sku) {
                  rule.sku = referencedProducts[0].sku;
                  rule.query = referencedProducts[0].sku;
                  rule.scope = "single";
                } else {
                  rule.query = prior.query ?? null;
                  rule.sku = prior.sku ?? null;
                  rule.scope = prior.scope ?? rule.scope ?? "matching";
                }
              }
              if (!rule.platform || rule.platform === "all") rule.platform = prior.platform ?? "all";
              if (!rule.category) rule.category = prior.category ?? null;
              for(const key of ["minimum_margin_pct","maximum_increase_pct","verified_costs_only","exclude_out_of_stock"]){
                if(rule[key]==null) rule[key]=prior[key]??null;
              }
            }
            const floorMatch=prompt.match(/(?:margin|floor)[^\d]{0,20}(\d+(?:\.\d+)?)\s*%|(\d+(?:\.\d+)?)\s*%[^.]{0,30}(?:margin|floor)/i);
            const capMatch=prompt.match(/(?:no more than|max(?:imum)?|cap(?:ped)? at)[^\d]{0,20}(\d+(?:\.\d+)?)\s*%/i);
            rule.minimum_margin_pct=Number(rule.minimum_margin_pct)||(floorMatch?Number(floorMatch[1]??floorMatch[2])/100:null);
            rule.maximum_increase_pct=Number(rule.maximum_increase_pct)||(capMatch?Number(capMatch[1])/100:null);
            rule.verified_costs_only=operation==="protect_margin"||Boolean(rule.verified_costs_only);
            rule.exclude_out_of_stock=operation==="protect_margin"||Boolean(rule.exclude_out_of_stock);
            rule.risk_level=operation==="publish_prices"?"reversible_write":["change_order_status","create_product_draft","seed_test_store","cleanup_test_store"].includes(operation)?"sensitive_write":"read";
            rule.requires_confirmation = ["publish_prices","change_order_status","create_product_draft","seed_test_store","cleanup_test_store"].includes(operation);
            const platform=String(rule.platform??"all");
            const scope=String(rule.scope??"matching");
            rule.plan=operation==="publish_prices"?[
              `Resolve the ${scope} product scope on ${platform}.`,"Use verified product costs and the active policy constraints.","Show before-and-after prices and contribution margins.","Wait for explicit merchant approval.","Publish each approved price.","Read every product back from the store.","Restore the original price if live confirmation fails.","Record a separate action result for every product.",
            ]:operation==="protect_margin"?[
              `Refresh the ${platform} catalogue.`,"Use verified product costs only.","Identify products below the requested contribution-margin floor.","Exclude out-of-stock and unverified-cost products.","Cap every proposed increase at the merchant's stated limit.","Show the proposed changes without publishing them.",
            ]:operation==="low_stock"?["Load the latest connected-store catalogue.","Identify products currently marked out of stock or requiring inventory attention.","Return a read-only action list; do not alter inventory."]:operation==="cost_attention"?["Load the latest connected-store catalogue.","Separate verified platform costs from missing or estimated costs.","Return products that cannot safely participate in automated repricing."]:operation==="list_orders"?["Read today's orders from Zid.","Group orders by operational status.","Return order references and totals without changing fulfilment state."]:operation==="change_order_status"?["Validate the Zid order reference and requested status.","Show the exact fulfilment change and wait for approval.","Submit the status change to Zid.","Read today's orders again to verify the new status."]:operation==="create_product_draft"?["Validate the proposed name, SKU and price.","Show the exact product fields and wait for approval.","Create the product in Zid as an unpublished draft.","Return the new Zid product reference."]:[`Load the latest ${platform} catalogue.`,`Resolve the ${scope} product scope.`,"Return current store facts without changing the store."];
            rule.warnings = Array.isArray(rule.warnings) ? rule.warnings : [];
            return json({ type: "operation", operation: rule, latency_ms });
          }

          // Normalise percentages if model returns e.g. 25 instead of 0.25
          if (typeof rule.minimum_floor === "number" && rule.minimum_floor > 1) {
            rule.minimum_floor = rule.minimum_floor / 100;
          }
          if (typeof rule.maximum_ceiling === "number" && rule.maximum_ceiling > 1) {
            rule.maximum_ceiling = rule.maximum_ceiling / 100;
          }
          rule = normaliseCompiledRule(prompt, rule);

          return json({ type: "rule", rule, latency_ms });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return json({ error: `Request failed: ${msg}` }, 500);
        }
      },
    },
  },
});
