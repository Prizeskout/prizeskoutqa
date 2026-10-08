import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = (process.env.DEMO_LOGIN_EMAIL ?? "demo@prizeskout.qa").trim().toLowerCase();
const password = process.env.DEMO_LOGIN_PASSWORD ?? "";
assert(url && serviceKey, "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
assert(password.length >= 14, "DEMO_LOGIN_PASSWORD must be at least 14 characters.");

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const { data: accessRows, error: accessError } = await admin
  .from("ps_access_codes")
  .select("merchant_id,store_name,created_at")
  .ilike("store_name", "%naija%")
  .order("created_at", { ascending: false });
if (accessError) throw accessError;
const merchantIds = [...new Set((accessRows ?? []).map((row) => String(row.merchant_id)))];
assert(merchantIds.length, "Naija Restaurant demo account was not found.");
const { data: workspaces, error: workspaceError } = await admin
  .from("ps_restaurant_workspaces")
  .select("account_id,licensee_id,name,metadata")
  .in("account_id", merchantIds);
if (workspaceError) throw workspaceError;
const target = (workspaces ?? []).find((row) => {
  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : {};
  return metadata.demo_mode === true && row.licensee_id;
});
assert(target?.licensee_id, "A demo-marked Naija Restaurant workspace was not found.");

const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listed.error) throw listed.error;
let user = listed.data.users.find((candidate) => candidate.email?.toLowerCase() === email);
if (user) {
  const updated = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
    user_metadata: { ...user.user_metadata, prizeskout_merchant_id: target.account_id, demo_account: true },
  });
  if (updated.error) throw updated.error;
  user = updated.data.user;
} else {
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { prizeskout_merchant_id: target.account_id, demo_account: true },
  });
  if (created.error || !created.data.user) throw created.error ?? new Error("Demo user was not created.");
  user = created.data.user;
}

await admin.from("licensee_members").upsert({
  licensee_id: target.licensee_id,
  user_id: user.id,
  role: "viewer",
  functional_role: "management",
  accepted_at: new Date().toISOString(),
}, { onConflict: "licensee_id,user_id" }).throwOnError();

const demoCode = "PSK-NAIJA-PARTNER-DEMO";
await admin.from("ps_access_codes").upsert({
  code: demoCode,
  merchant_id: target.account_id,
  email,
  store_name: "Naija Restaurant",
}, { onConflict: "code" }).throwOnError();

const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
assert(anonKey, "A Supabase publishable key is required for login verification.");
const client = createClient(url, anonKey, { auth: { persistSession: false } });
const login = await client.auth.signInWithPassword({ email, password });
assert(!login.error && login.data.session, `Demo login verification failed: ${login.error?.message ?? "no session"}`);

const verifyUrl = process.env.DEMO_LOGIN_VERIFY_URL?.replace(/\/$/, "");
if (verifyUrl) {
  const resolved = await fetch(`${verifyUrl}/api/auth/resolve-merchant`, {
    method: "POST",
    headers: { Authorization: `Bearer ${login.data.session.access_token}` },
  });
  const payload = await resolved.json() as { merchant_id?: string; code?: string; error?: string };
  assert(resolved.ok && payload.merchant_id === target.account_id && payload.code === demoCode,
    `Production session resolution failed: ${payload.error ?? resolved.status}`);
}

console.log(JSON.stringify({ ok: true, email, merchant_id: target.account_id, role: "viewer", demo_mode: true, production_resolved: Boolean(verifyUrl) }));
