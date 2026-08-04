import { createHash, createHmac, randomUUID, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { displayProductName, productMatches } from "./zid-product-match";

type Obj = Record<string, unknown>;
type Headers = Record<string, string>;
const arr = (value: unknown): Obj[] =>
  Array.isArray(value) ? (value.filter((item) => item && typeof item === "object") as Obj[]) : [];
const text = (...values: unknown[]) =>
  String(values.find((value) => typeof value === "string" || typeof value === "number") ?? "");
const number = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const nameOf = (product: Obj) => displayProductName(product);
const secret = () =>
  process.env.COPILOT_APPROVAL_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export type ProductChangeRequest = {
  mode: "edit" | "unpublish" | "publish" | "delete" | "duplicate";
  sku?: string;
  query?: string;
  scope?: "single" | "matching";
  inventory_filter?: "out_of_stock" | "in_stock";
  changes?: {
    name?: string;
    sku?: string;
    description?: string;
    price?: number;
    sale_price?: number;
    cost?: number;
    quantity?: number;
    barcode?: string;
    requires_shipping?: boolean;
    is_taxable?: boolean;
    is_infinite?: boolean;
    is_published?: boolean;
  };
};
type Snapshot = {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number | null;
  sale_price: number | null;
  cost: number | null;
  quantity: number | null;
  barcode: string;
  requires_shipping: boolean;
  is_taxable: boolean;
  is_infinite: boolean;
  is_published: boolean;
  is_draft: boolean;
  updated_at: string;
};
type Approval = {
  v: 1;
  account_id: string;
  store_id: string;
  mode: ProductChangeRequest["mode"];
  before: Snapshot[];
  patch: Obj;
  expires_at: number;
  nonce: string;
};

function encodeApproval(payload: Approval) {
  const raw = Buffer.from(JSON.stringify(payload)).toString("base64url"),
    key = secret();
  if (!key) throw new Error("COPILOT_APPROVAL_SECRET is not configured.");
  return `${raw}.${createHmac("sha256", key).update(raw).digest("base64url")}`;
}
function decodeApproval(token: string, accountId: string): Approval {
  const [raw, sig] = token.split("."),
    key = secret();
  if (!raw || !sig || !key) throw new Error("The approval has an invalid signature.");
  const expected = Buffer.from(createHmac("sha256", key).update(raw).digest("base64url"));
  const actual = Buffer.from(sig);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    throw new Error("The approval has been changed. Preview the action again.");
  const payload = JSON.parse(Buffer.from(raw, "base64url").toString()) as Approval;
  if (payload.account_id !== accountId || payload.expires_at < Date.now())
    throw new Error("This approval has expired. Preview the action again.");
  return payload;
}
async function zidJson(url: string, headers: Headers, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: { ...headers, ...(init?.headers ?? {}) } });
  const payload = (await response.json().catch(() => ({}))) as Obj;
  return { response, payload };
}
async function storefrontReadback(url: string, headers: Headers) {
  const customerHeaders: Headers = {
    Accept: "application/json",
    "Accept-Language": headers["Accept-Language"] || "en",
    Role: "Customer",
    ...(headers["Store-Id"] ? { "Store-Id": headers["Store-Id"] } : {}),
  };
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const call = await zidJson(url, customerHeaders);
    if (call.response.ok && text(call.payload.id)) return call.payload;
    if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, 750));
  }
  return null;
}
function productRows(payload: Obj) {
  return arr(payload.results).length
    ? arr(payload.results)
    : arr(payload.products).length
      ? arr(payload.products)
      : arr((payload.data as Obj | undefined)?.products);
}
async function listProducts(headers: Headers, search?: string) {
  const products: Obj[] = [];
  for (let page = 1; page <= 50; page += 1) {
    const query = search ? `&q=${encodeURIComponent(search)}` : "";
    const call = await zidJson(
      `https://api.zid.sa/v1/products/?page=${page}&page_size=100${query}`,
      headers,
    );
    if (!call.response.ok)
      throw new Error(`Zid products returned ${call.response.status}. Products — Read & Write is required.`);
    const rows = productRows(call.payload);
    products.push(...rows);
    if (rows.length < 100) break;
  }
  return products;
}
function snapshot(product: Obj): Snapshot {
  return {
    id: text(product.id),
    sku: text(product.sku),
    name: nameOf(product),
    description: typeof product.description === "object" && product.description ? text((product.description as Obj).en,(product.description as Obj).ar) : text(product.description),
    price: number(product.price),
    sale_price: number(product.sale_price),
    cost: number(product.cost),
    quantity: number(product.quantity),
    barcode: text(product.barcode),
    requires_shipping: Boolean(product.requires_shipping),
    is_taxable: Boolean(product.is_taxable),
    is_infinite: Boolean(product.is_infinite),
    is_published: Boolean(product.is_published ?? !product.is_draft),
    is_draft: Boolean(product.is_draft),
    updated_at: text(product.updated_at),
  };
}
async function storeId(headers: Headers) {
  const call = await zidJson("https://api.zid.sa/v1/managers/account/store", headers);
  if (!call.response.ok) throw new Error(`Zid store details returned ${call.response.status}.`);
  const store = (call.payload.store ??
    (call.payload.data as Obj | undefined)?.store ??
    call.payload.data ??
    {}) as Obj;
  return { id: text(store.id, store.uuid), title: text(store.title, store.name) };
}
function validatePatch(request: ProductChangeRequest) {
  const patch: Obj = {};
  if (request.mode === "duplicate") {
    const duplicateName = request.changes?.name?.trim().replace(/[,;:\s]+$/, "");
    if (!duplicateName) throw new Error("Give the duplicated product a new name.");
    patch.name = { en: duplicateName, ar: duplicateName };
    if (request.changes?.sku?.trim()) patch.sku = request.changes.sku.trim();
    if (request.changes?.description !== undefined) patch.description = { en: request.changes.description.trim(), ar: request.changes.description.trim() };
    for (const field of ["price", "sale_price", "cost", "quantity"] as const) {
      const value = request.changes?.[field];
      if (value !== undefined) patch[field] = value;
    }
    if (patch.price !== undefined && (!Number.isFinite(Number(patch.price)) || Number(patch.price) <= 0)) throw new Error("Selling price must be greater than zero.");
    if (patch.sale_price !== undefined && (!Number.isFinite(Number(patch.sale_price)) || Number(patch.sale_price) < 0)) throw new Error("Sale price cannot be negative.");
    if (patch.cost !== undefined && (!Number.isFinite(Number(patch.cost)) || Number(patch.cost) < 0)) throw new Error("Product cost cannot be negative.");
    if (patch.quantity !== undefined && (!Number.isInteger(Number(patch.quantity)) || Number(patch.quantity) < 0)) throw new Error("Stock quantity must be a whole number of zero or more.");
    if (request.changes?.barcode !== undefined) patch.barcode = request.changes.barcode.trim();
    for (const field of ["requires_shipping", "is_taxable", "is_infinite"] as const) if (request.changes?.[field] !== undefined) patch[field] = request.changes[field];
    const publish = request.changes?.is_published === true;
    patch.is_published = publish;
    patch.is_draft = !publish;
    return patch;
  }
  if (request.mode === "unpublish") Object.assign(patch, { is_published: false, is_draft: true });
  if (request.mode === "publish") Object.assign(patch, { is_published: true, is_draft: false });
  const changes = request.changes ?? {};
  if (changes.name !== undefined) {
    const value = changes.name.trim().replace(/[,;:\s]+$/, "");
    if (!value) throw new Error("The new product name cannot be empty.");
    patch.name = { en: value, ar: value };
  }
  if (changes.sku !== undefined) {
    const value = changes.sku.trim();
    if (!value) throw new Error("The new SKU cannot be empty.");
    patch.sku = value;
  }
  if (changes.description !== undefined) patch.description = { en: changes.description.trim(), ar: changes.description.trim() };
  if (changes.price !== undefined) {
    if (!Number.isFinite(changes.price) || changes.price <= 0)
      throw new Error("Selling price must be greater than zero.");
    patch.price = changes.price;
  }
  if (changes.cost !== undefined) {
    if (!Number.isFinite(changes.cost) || changes.cost < 0)
      throw new Error("Product cost cannot be negative.");
    patch.cost = changes.cost;
  }
  if (changes.sale_price !== undefined) {
    if (!Number.isFinite(changes.sale_price) || changes.sale_price < 0) throw new Error("Sale price cannot be negative.");
    patch.sale_price = changes.sale_price;
  }
  if (changes.quantity !== undefined) {
    if (!Number.isInteger(changes.quantity) || changes.quantity < 0)
      throw new Error("Stock quantity must be a whole number of zero or more.");
    Object.assign(patch, { quantity: changes.quantity, is_infinite: false });
  }
  if (changes.barcode !== undefined) patch.barcode = changes.barcode.trim();
  for (const field of ["requires_shipping", "is_taxable", "is_infinite"] as const) if (changes[field] !== undefined) patch[field] = changes[field];
  if (changes.is_published !== undefined)
    Object.assign(patch, { is_published: changes.is_published, is_draft: !changes.is_published });
  if (request.mode === "edit" && !Object.keys(patch).length)
    throw new Error("Specify at least one product field to change.");
  return patch;
}
function changedFields(before: Snapshot, patch: Obj) {
  const display: Record<string, unknown> = { ...patch };
  if (typeof patch.name === "object" && patch.name) display.name = (patch.name as Obj).en;
  if (typeof patch.description === "object" && patch.description) display.description = (patch.description as Obj).en;
  const changes=Object.entries(display).map(([field, after]) => ({
    field,
    before: field === "name" ? before.name : field === "description" ? before.description : (before as unknown as Obj)[field],
    after,
  }));
  if(patch.price!==undefined&&before.sale_price!==null)changes.push({field:"storefront sale price",before:before.sale_price,after:before.sale_price});
  return changes;
}
function buildGeneratedSku(name: string, nonce: string) {
  const slug = name.normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toUpperCase().slice(0, 48) || "PRODUCT";
  return `${slug}-${nonce.slice(0, 6).toUpperCase()}`.slice(0, 80);
}

export async function previewZidProductChange(
  accountId: string,
  headers: Headers,
  request: ProductChangeRequest,
) {
  const store = await storeId(headers),
    sku = (request.sku ?? "").trim().toLowerCase(),
    query = (request.query ?? "").trim().replace(/[,;:\s]+$/, "").toLowerCase(),
    initial = await listProducts(headers, request.sku ?? request.query);
  let all = initial;
  let matched = all.filter((product) =>
    sku
      ? text(product.sku).toLowerCase() === sku
      : query
        ? productMatches(product, query, true)
        : request.scope === "matching",
  );
  if (!matched.length && (request.sku || request.query)) {
    all = await listProducts(headers);
    matched = all.filter(product => sku
      ? text(product.sku).toLowerCase() === sku
      : productMatches(product, query, true));
  }
  if (!matched.length && query)
    matched = all.filter(
      (product) => productMatches(product, query, false),
    );
  if (request.inventory_filter === "out_of_stock")
    matched = matched.filter((product) => number(product.quantity) === 0 && !product.is_infinite);
  if (request.inventory_filter === "in_stock")
    matched = matched.filter(
      (product) => Boolean(product.is_infinite) || (number(product.quantity) ?? 0) > 0,
    );
  if (!matched.length) throw new Error("No Zid product matched that name or SKU.");
  if (request.scope !== "matching" && matched.length !== 1)
    throw new Error(
      `That request matched ${matched.length} products. Use an exact SKU or explicitly ask to change all matching products.`,
    );
  if (matched.length > 50) throw new Error("A single approved batch is limited to 50 products.");
  const before = matched.map(snapshot),
    patch = validatePatch(request);
  const mode = request.mode;
  if (mode === "duplicate" && text(patch.sku)) {
    const requestedSku = text(patch.sku).toLowerCase();
    const collisions = await listProducts(headers, text(patch.sku));
    if (collisions.some((product) => text(product.sku).toLowerCase() === requestedSku))
      throw new Error(`SKU ${text(patch.sku)} already exists in Zid. Choose a different SKU or omit it so PrizeSkout can generate one.`);
  }
  const destructive = mode === "delete";
  const approval: Approval = {
    v: 1,
    account_id: accountId,
    store_id: store.id,
    mode,
    before,
    patch,
    expires_at: Date.now() + 10 * 60_000,
    nonce: randomUUID(),
  };
  return {
    store,
    mode,
    count: before.length,
    products: before.map((product) => ({
      id: product.id,
      sku: product.sku,
      name: product.name,
      changes: destructive
        ? [{ field: "product", before: "Exists in Zid", after: "Permanently deleted" }]
        : mode === "duplicate"
          ? [
              { field: "source", before: `${product.name} (${product.sku})`, after: "Kept unchanged" },
              { field: "new product", before: "Does not exist", after: `${text((patch.name as Obj).en)} (${patch.is_published ? "published" : "unpublished draft"})` },
              { field: "new SKU", before: "Generated automatically", after: text(patch.sku) || buildGeneratedSku(text((patch.name as Obj).en), approval.nonce) },
            ]
          : changedFields(product, patch),
    })),
    approval_token: encodeApproval(approval),
    expires_at: new Date(approval.expires_at).toISOString(),
    risk: destructive
      ? "permanent_delete"
      : mode === "unpublish" || mode === "duplicate"
        ? "reversible_unpublish"
        : "reversible_edit",
    warning: destructive
      ? "Permanent deletion cannot be rolled back by Zid. PrizeSkout keeps the approved pre-change snapshot in its audit trail."
      : "Nothing changes until this exact preview is approved.",
  };
}

async function audit(
  accountId: string,
  channel: { licensee_id: string; merchant_id: string },
  approval: Approval,
  results: Obj[],
) {
  const trace = `trc_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`,
    payload = {
      operation: "zid_product_change",
      store_id: approval.store_id,
      mode: approval.mode,
      before: approval.before,
      patch: approval.patch,
      results,
      approval_nonce: approval.nonce,
    };
  const payloadHash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  const { error } = await supabaseAdmin.from("ps_govern_audit_log").insert({
    trace_id: trace,
    account_id: accountId,
    licensee_id: channel.licensee_id,
    merchant_id: channel.merchant_id,
    sku: approval.before
      .map((item) => item.sku)
      .join(",")
      .slice(0, 250),
    region: "SA",
    source_platform: "zid",
    target_channel: "zid",
    event_type: "product_action",
    summary_en: `Approved Zid product ${approval.mode} completed for ${approval.before.length} product(s).`,
    summary_ar: `تم تنفيذ إجراء منتج معتمد على زد لعدد ${approval.before.length} من المنتجات.`,
    data_route: "SA",
    pdpl_compliant: true,
    payload_hash: payloadHash,
    payload_snapshot: payload as unknown as Json,
  });
  if (error)
    throw new Error(`The Zid action completed, but its audit record failed: ${error.message}`);
  return trace;
}

export async function executeZidProductChange(
  accountId: string,
  headers: Headers,
  channel: { licensee_id: string; merchant_id: string },
  token: string,
) {
  const approval = decodeApproval(token, accountId),
    store = await storeId(headers);
  if (store.id !== approval.store_id)
    throw new Error("The connected Zid store changed after preview. No action was taken.");
  // Refuse to touch Zid unless the immutable ledger can first retain the
  // merchant's exact signed intent.
  let intent_trace_id: string;
  try {
    intent_trace_id = await audit(accountId, channel, approval, [
      { status: "approved_intent", message: "Signed approval verified; Zid execution may begin." },
    ]);
  } catch (error) {
    throw new Error(
      `No Zid action was taken because its immutable audit intent could not be saved. ${error instanceof Error ? error.message : ""}`.trim(),
    );
  }
  const results: Obj[] = [];
  for (const before of approval.before) {
    const freshCall = await zidJson(
      `https://api.zid.sa/v1/products/${encodeURIComponent(before.id)}/`,
      headers,
    );
    if (!freshCall.response.ok) {
      results.push({
        id: before.id,
        sku: before.sku,
        status: "blocked",
        message: "Product could not be read immediately before execution.",
      });
      continue;
    }
    const fresh = snapshot(freshCall.payload);
    if (fresh.updated_at && before.updated_at && fresh.updated_at !== before.updated_at) {
      results.push({
        id: before.id,
        sku: before.sku,
        status: "blocked",
        message: "Product changed in Zid after preview.",
      });
      continue;
    }
    if (approval.mode === "duplicate") {
      const source = freshCall.payload;
      const requestedSku = text(approval.patch.sku);
      const generatedSku = buildGeneratedSku(text((approval.patch.name as Obj).en), approval.nonce);
      const variants = arr(source.variants).map((variant) => {
        const copy = { ...variant };
        for (const key of ["id", "product_id", "created_at", "updated_at", "sku"]) delete copy[key];
        return copy;
      });
      const duplicateBody: Obj = {
        name: approval.patch.name,
        description: approval.patch.description ?? source.description,
        sku: requestedSku || generatedSku,
        price: approval.patch.price ?? source.price,
        ...((approval.patch.sale_price ?? source.sale_price) != null ? { sale_price: approval.patch.sale_price ?? source.sale_price } : {}),
        ...((approval.patch.cost ?? source.cost) != null ? { cost: approval.patch.cost ?? source.cost } : {}),
        quantity: approval.patch.quantity ?? source.quantity,
        is_infinite: approval.patch.is_infinite ?? Boolean(source.is_infinite),
        is_taxable: approval.patch.is_taxable ?? Boolean(source.is_taxable),
        requires_shipping: approval.patch.requires_shipping ?? Boolean(source.requires_shipping),
        ...(approval.patch.barcode !== undefined ? { barcode: approval.patch.barcode } : source.barcode != null ? { barcode: source.barcode } : {}),
        ...(source.weight ? { weight: source.weight } : {}),
        ...(Array.isArray(source.keywords) ? { keywords: source.keywords } : {}),
        ...(variants.length ? { variants } : {}),
        // Zid supports creating a standard product directly in its intended
        // publication state. A follow-up PATCH below makes the request
        // idempotent across stores that defer publication processing.
        is_published: approval.patch.is_published === true,
        is_draft: approval.patch.is_published !== true,
      };
      const create = await zidJson("https://api.zid.sa/v1/products/", headers, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(duplicateBody),
      });
      const createdId = text(create.payload.id, (create.payload.data as Obj | undefined)?.id);
      if (!create.response.ok || !createdId) {
        results.push({ id: before.id, sku: before.sku, status: "failed", message: `Zid rejected the duplicate (${create.response.status}): ${JSON.stringify(create.payload).slice(0, 180)}` });
        continue;
      }
      if (approval.patch.is_published === true) {
        const publish = await zidJson(
          `https://api.zid.sa/v1/products/${encodeURIComponent(createdId)}/`,
          headers,
          { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_published: true, is_draft: false }) },
        );
        if (!publish.response.ok) {
          results.push({ id: createdId, sku: requestedSku || generatedSku, source_id: before.id, source_sku: before.sku, status: "failed", message: `The copy was created as a draft, but Zid rejected publication (${publish.response.status}): ${JSON.stringify(publish.payload).slice(0, 180)}` });
          continue;
        }
      }
      const readback = await zidJson(`https://api.zid.sa/v1/products/${encodeURIComponent(createdId)}/`, headers);
      const created = readback.response.ok ? snapshot(readback.payload) : null;
      const expectedName = text((approval.patch.name as Obj).en);
      const managerConfirmed = Boolean(created && created.name === expectedName && created.sku === (requestedSku || generatedSku) && created.is_published === Boolean(approval.patch.is_published));
      const storefrontProduct = approval.patch.is_published === true
        ? await storefrontReadback(`https://api.zid.sa/v1/products/${encodeURIComponent(createdId)}/`, headers)
        : null;
      const storefrontVisible = Boolean(storefrontProduct && nameOf(storefrontProduct) === expectedName);
      const confirmed = managerConfirmed && (approval.patch.is_published !== true || storefrontVisible);
      results.push({ id: createdId, sku: requestedSku || generatedSku, source_id: before.id, source_sku: before.sku, status: confirmed ? "confirmed" : "unconfirmed", before, after: created ? { ...created, storefront_visible: storefrontVisible } : created, storefront_visible: storefrontVisible, message: confirmed ? `${created?.is_published ? "Published duplicate confirmed in Zid's customer catalogue" : "Unpublished duplicate confirmed by Zid"}; the source product was unchanged.` : managerConfirmed && approval.patch.is_published === true ? "Zid saved the product as published, but it is not yet visible through Zid's customer catalogue. PrizeSkout will not call it live until that check passes." : "Zid accepted the duplicate, but readback did not match every approved field." });
      continue;
    }
    const response = await fetch(
      `https://api.zid.sa/v1/products/${encodeURIComponent(before.id)}/`,
      {
        method: approval.mode === "delete" ? "DELETE" : "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        ...(approval.mode === "delete" ? {} : { body: JSON.stringify(approval.patch) }),
      },
    );
    if (!response.ok) {
      results.push({
        id: before.id,
        sku: before.sku,
        status: "failed",
        message: `Zid returned ${response.status}: ${(await response.text().catch(() => "")).slice(0, 180)}`,
      });
      continue;
    }
    const verify = await fetch(`https://api.zid.sa/v1/products/${encodeURIComponent(before.id)}/`, {
      headers,
    });
    if (approval.mode === "delete") {
      results.push({
        id: before.id,
        sku: before.sku,
        status: verify.status === 404 ? "confirmed" : "unconfirmed",
        message:
          verify.status === 404
            ? "Deletion confirmed by Zid readback."
            : `Zid accepted deletion; readback returned ${verify.status}.`,
      });
      continue;
    }
    const after = verify.ok ? snapshot((await verify.json()) as Obj) : null;
    const managerConfirmed =
      Boolean(after) &&
      Object.entries(approval.patch).every(([field, value]) =>
        field === "name" || field === "description"
          ? (after as unknown as Obj)[field] === text((value as Obj).en)
          : JSON.stringify((after as unknown as Obj)[field]) === JSON.stringify(value),
      );
    const storefrontProduct = approval.mode === "publish" || approval.patch.is_published === true
      ? await storefrontReadback(`https://api.zid.sa/v1/products/${encodeURIComponent(before.id)}/`, headers)
      : null;
    const storefrontVisible = Boolean(storefrontProduct && text(storefrontProduct.id) === before.id);
    const confirmed = managerConfirmed && (approval.mode !== "publish" && approval.patch.is_published !== true || storefrontVisible);
    results.push({
      id: before.id,
      sku: before.sku,
      status: confirmed ? "confirmed" : "unconfirmed",
      before,
      after: after ? { ...after, storefront_visible: storefrontVisible } : after,
      storefront_visible: storefrontVisible,
      message: confirmed
        ? storefrontVisible ? "Change confirmed in Zid's customer catalogue." : "Change confirmed by Zid readback."
        : managerConfirmed ? "Zid marks the product as published, but it is not yet visible through Zid's customer catalogue." : "Zid accepted the update, but readback did not match every approved field.",
    });
  }
  const trace_id = await audit(accountId, channel, approval, results);
  const ok = results.length > 0 && results.every((result) => result.status === "confirmed");
  return {
    ok,
    confirmed: ok,
    intent_trace_id,
    trace_id,
    action_id: trace_id,
    results,
    message: ok
      ? `${approval.before.length} product action${approval.before.length === 1 ? "" : "s"} completed and confirmed in Zid.`
      : "Some product actions were blocked, failed, or could not be confirmed. No unapproved fallback was attempted.",
  };
}
