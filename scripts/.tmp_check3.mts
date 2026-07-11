import { createClient } from "@supabase/supabase-js";
const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const UID = "bed12406-2798-47f7-a30c-5de559e90d6d";

// Check the actual user_id for each competitor URL row
const { data: urls } = await (admin as any)
  .from("competitor_product_urls")
  .select("user_id, competitor, url")
  .neq("competitor", "self")
  .order("user_id");

console.log("User IDs in competitor_product_urls (non-self):");
const userIds = new Set<string>();
for (const u of (urls ?? [])) {
  userIds.add(u.user_id);
  if (u.user_id !== UID) {
    console.log(`  DIFFERENT USER: ${u.user_id} - ${u.competitor} - ${u.url.slice(0,50)}`);
  }
}

console.log("\nDistinct user_ids:", [...userIds].map(id => id.slice(0,8)).join(', '));

// Try inserting a test "failed" row for UID
const testUrl = "https://diag-test-failed.example.com";
const { error } = await (admin as any).from("competitor_scrapes").insert({
  user_id: UID,
  url: testUrl, competitor: "Test", product: "Test",
  price: null, status: "failed", error: "FK test"
});
console.log("\nDirect insert with user_id=bed12406:", error?.message ?? "SUCCESS");
if (!error) {
  await (admin as any).from("competitor_scrapes").delete().eq("url", testUrl);
}

// Also verify UID exists in auth schema
const { data: userData, error: userErr } = await (admin as any)
  .rpc("get_user_by_id", { p_user_id: UID })
  .single()
  .catch(() => ({ data: null, error: { message: "RPC not found" } }));
console.log("User lookup via RPC:", userErr?.message ?? JSON.stringify(userData));
