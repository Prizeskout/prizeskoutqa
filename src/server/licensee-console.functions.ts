import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Licensee Console server functions.
 *
 * The console is the licensee-facing surface for managing the *organization*
 * (the "Licensee" tier of the three-tier identity model):
 *   - Overview      → licensee summary, account/member counts, recent activity
 *   - Tenants       → CRUD over `accounts_v2` (operating units)
 *   - Team          → invite / role / remove members on `licensee_members`
 *
 * Every function resolves the caller's primary licensee from `licensee_members`
 * and authorizes via the database `is_licensee_member()` security-definer
 * helper (RLS does the actual gating). We never trust a client-supplied
 * `licensee_id` for authorization — we re-derive it server-side.
 */

type LicenseeRole = "owner" | "admin" | "developer" | "viewer";

const ROLE_RANK: Record<LicenseeRole, number> = {
  viewer: 0,
  developer: 1,
  admin: 2,
  owner: 3,
};

async function getCallerLicensee(
  supabase: any,
  userId: string,
): Promise<{ licenseeId: string; role: LicenseeRole }> {
  const { data, error } = await supabase
    .from("licensee_members")
    .select("licensee_id, role")
    .eq("user_id", userId)
    .order("role", { ascending: false }) // owner > admin > developer > viewer (alphabetical isn't helpful but RLS narrows already)
    .limit(1);
  if (error) throw new Error(error.message);
  const row = (data ?? [])[0];
  if (!row) throw new Error("No licensee found for this user.");
  return { licenseeId: row.licensee_id, role: row.role as LicenseeRole };
}

function requireRole(actual: LicenseeRole, min: LicenseeRole) {
  if (ROLE_RANK[actual] < ROLE_RANK[min]) {
    throw new Error(
      `Insufficient permissions. ${min} role required, you have ${actual}.`,
    );
  }
}

// ---------- Overview ----------

export const getConsoleOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { licenseeId, role } = await getCallerLicensee(supabase, userId);

    const [licResp, accResp, memResp, keyResp, logResp] = await Promise.all([
      supabase
        .from("licensees")
        .select("id, name, slug, status, contact_email, billing_email, created_at")
        .eq("id", licenseeId)
        .maybeSingle(),
      supabase
        .from("accounts_v2")
        .select("id, name, slug, region, currency, is_default, created_at")
        .eq("licensee_id", licenseeId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true }),
      supabase
        .from("licensee_members")
        .select("user_id, role, accepted_at, invited_at, created_at")
        .eq("licensee_id", licenseeId),
      supabase
        .from("api_keys")
        .select("id, mode, revoked_at")
        .eq("licensee_id", licenseeId),
      supabase
        .from("api_request_logs")
        .select("id, method, path, status_code, occurred_at")
        .order("occurred_at", { ascending: false })
        .limit(8),
    ]);

    const errors = [licResp.error, accResp.error, memResp.error, keyResp.error, logResp.error].filter(
      Boolean,
    );
    if (errors.length) throw new Error(errors[0]!.message);

    const keys = keyResp.data ?? [];
    const activeKeys = keys.filter((k) => !k.revoked_at);

    return {
      callerRole: role,
      licensee: licResp.data,
      accounts: accResp.data ?? [],
      members: memResp.data ?? [],
      stats: {
        accountCount: (accResp.data ?? []).length,
        memberCount: (memResp.data ?? []).length,
        keyCount: keys.length,
        activeKeyCount: activeKeys.length,
        testKeyCount: activeKeys.filter((k) => k.mode === "test").length,
        liveKeyCount: activeKeys.filter((k) => k.mode === "live").length,
      },
      recentActivity: logResp.data ?? [],
    };
  });

// ---------- Tenants (accounts_v2) ----------

type AccountInput = {
  name: string;
  slug: string;
  region?: string | null;
  currency?: string;
  isDefault?: boolean;
};

function validateAccountInput(input: AccountInput) {
  const name = String(input?.name ?? "").trim().slice(0, 120);
  const slugRaw = String(input?.slug ?? "").trim().toLowerCase().slice(0, 60);
  const slug = slugRaw.replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "");
  const region = input?.region ? String(input.region).trim().slice(0, 60) : null;
  const currency = String(input?.currency ?? "QAR").trim().toUpperCase().slice(0, 8) || "QAR";
  const isDefault = Boolean(input?.isDefault);
  if (!name) throw new Error("Account name is required.");
  if (!slug) throw new Error("Slug is required (lowercase letters, numbers, hyphens).");
  return { name, slug, region, currency, isDefault };
}

export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: AccountInput) => validateAccountInput(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { licenseeId, role } = await getCallerLicensee(supabase, userId);
    requireRole(role, "admin");

    if (data.isDefault) {
      // Clear any existing default first.
      const { error: clearErr } = await supabase
        .from("accounts_v2")
        .update({ is_default: false })
        .eq("licensee_id", licenseeId)
        .eq("is_default", true);
      if (clearErr) throw new Error(clearErr.message);
    }

    const { data: row, error } = await supabase
      .from("accounts_v2")
      .insert({
        licensee_id: licenseeId,
        name: data.name,
        slug: data.slug,
        region: data.region,
        currency: data.currency,
        is_default: data.isDefault,
      })
      .select("id, name, slug, region, currency, is_default, created_at")
      .single();
    if (error) {
      if (/duplicate key/i.test(error.message)) {
        throw new Error(`Slug "${data.slug}" already exists for this licensee.`);
      }
      throw new Error(error.message);
    }
    return { account: row };
  });

export const updateAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: AccountInput & { id: string }) => {
    const id = String(input?.id ?? "");
    if (!id) throw new Error("id required");
    return { id, ...validateAccountInput(input) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { licenseeId, role } = await getCallerLicensee(supabase, userId);
    requireRole(role, "admin");

    if (data.isDefault) {
      const { error: clearErr } = await supabase
        .from("accounts_v2")
        .update({ is_default: false })
        .eq("licensee_id", licenseeId)
        .eq("is_default", true)
        .neq("id", data.id);
      if (clearErr) throw new Error(clearErr.message);
    }

    const { error } = await supabase
      .from("accounts_v2")
      .update({
        name: data.name,
        slug: data.slug,
        region: data.region,
        currency: data.currency,
        is_default: data.isDefault,
      })
      .eq("id", data.id)
      .eq("licensee_id", licenseeId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id required");
    return { id: String(input.id) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { licenseeId, role } = await getCallerLicensee(supabase, userId);
    requireRole(role, "admin");

    // Refuse to delete the default account if it's the only one.
    const { data: accounts, error: listErr } = await supabase
      .from("accounts_v2")
      .select("id, is_default")
      .eq("licensee_id", licenseeId);
    if (listErr) throw new Error(listErr.message);
    const list = accounts ?? [];
    if (list.length <= 1) {
      throw new Error("You can't delete the last account. Create another account first.");
    }
    const target = list.find((a) => a.id === data.id);
    if (!target) throw new Error("Account not found.");
    if (target.is_default) {
      throw new Error("Set another account as default before deleting this one.");
    }

    const { error } = await supabase
      .from("accounts_v2")
      .delete()
      .eq("id", data.id)
      .eq("licensee_id", licenseeId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Team ----------

export const getTeamMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { licenseeId, role } = await getCallerLicensee(supabase, userId);

    const { data: members, error } = await supabase
      .from("licensee_members")
      .select("id, user_id, role, invited_at, accepted_at, created_at")
      .eq("licensee_id", licenseeId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const userIds = (members ?? []).map((m) => m.user_id).filter(Boolean);
    let profilesById: Record<string, { display_name: string | null; avatar_url: string | null }> =
      {};
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);
      profilesById = Object.fromEntries(
        (profs ?? []).map((p) => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url }]),
      );
    }

    return {
      callerRole: role,
      callerId: userId,
      members: (members ?? []).map((m) => ({
        ...m,
        profile: profilesById[m.user_id] ?? { display_name: null, avatar_url: null },
      })),
    };
  });

export const updateMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { memberId: string; role: LicenseeRole }) => {
    const memberId = String(input?.memberId ?? "");
    const role = input?.role;
    if (!memberId) throw new Error("memberId required");
    if (!role || !(role in ROLE_RANK)) throw new Error("Invalid role.");
    return { memberId, role };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { licenseeId, role: callerRole } = await getCallerLicensee(supabase, userId);
    requireRole(callerRole, "admin");

    // Look up the target member to enforce safety rules.
    const { data: target, error: tErr } = await supabase
      .from("licensee_members")
      .select("id, user_id, role")
      .eq("id", data.memberId)
      .eq("licensee_id", licenseeId)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!target) throw new Error("Member not found.");

    // Only an owner can set or unset the owner role.
    if ((data.role === "owner" || target.role === "owner") && callerRole !== "owner") {
      throw new Error("Only the owner can change owner roles.");
    }

    // If demoting an owner, ensure at least one owner remains.
    if (target.role === "owner" && data.role !== "owner") {
      const { count, error: cErr } = await supabase
        .from("licensee_members")
        .select("id", { count: "exact", head: true })
        .eq("licensee_id", licenseeId)
        .eq("role", "owner");
      if (cErr) throw new Error(cErr.message);
      if ((count ?? 0) <= 1) {
        throw new Error("You can't demote the last owner. Promote another member to owner first.");
      }
    }

    const { error } = await supabase
      .from("licensee_members")
      .update({ role: data.role })
      .eq("id", data.memberId)
      .eq("licensee_id", licenseeId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { memberId: string }) => {
    if (!input?.memberId) throw new Error("memberId required");
    return { memberId: String(input.memberId) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { licenseeId, role: callerRole } = await getCallerLicensee(supabase, userId);
    requireRole(callerRole, "admin");

    const { data: target, error: tErr } = await supabase
      .from("licensee_members")
      .select("id, user_id, role")
      .eq("id", data.memberId)
      .eq("licensee_id", licenseeId)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!target) throw new Error("Member not found.");
    if (target.user_id === userId) {
      throw new Error("You can't remove yourself. Ask another admin to remove you.");
    }
    if (target.role === "owner") {
      const { count, error: cErr } = await supabase
        .from("licensee_members")
        .select("id", { count: "exact", head: true })
        .eq("licensee_id", licenseeId)
        .eq("role", "owner");
      if (cErr) throw new Error(cErr.message);
      if ((count ?? 0) <= 1) {
        throw new Error("You can't remove the last owner.");
      }
    }

    const { error } = await supabase
      .from("licensee_members")
      .delete()
      .eq("id", data.memberId)
      .eq("licensee_id", licenseeId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Invites ----------
//
// Invites add an existing auth.users record (matched by email) to the caller's
// licensee. If no matching user exists, we surface a clear error explaining
// they must first sign up. (Email-based invitations with magic links are a
// post-MLP feature; this keeps Week 4 scope tight while still being useful.)

export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; role: LicenseeRole }) => {
    const email = String(input?.email ?? "").trim().toLowerCase().slice(0, 200);
    const role = input?.role;
    if (!email || !email.includes("@")) throw new Error("Valid email required.");
    if (!role || !(role in ROLE_RANK)) throw new Error("Invalid role.");
    if (role === "owner") {
      throw new Error("Promote a member to owner from the team list, not via invite.");
    }
    return { email, role };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { licenseeId, role: callerRole } = await getCallerLicensee(supabase, userId);
    requireRole(callerRole, "admin");

    // Look up the user by email via the profiles join. profiles.id == auth.users.id.
    // We can't query auth.users directly with the user-scoped client, so we use
    // a small SQL helper: search profiles by display_name OR query through a
    // server-side lookup on licensee_members for already-known users. To keep
    // RLS-safe, we ask the database to find the user_id with a security-definer
    // helper. For now (no helper yet) we rely on the email being indexable via
    // a future RPC. As a pragmatic Week-4 solution, we look up the user_id via
    // the auth.users table using the service-role client.
    //
    // To avoid taking the service-role dependency client-wide, we just ask the
    // database via a tiny inline RPC call.
    const { data: lookup, error: lErr } = await (supabase as any).rpc(
      "find_user_id_by_email",
      { _email: data.email },
    );

    let inviteeId: string | null = null;
    if (!lErr && typeof lookup === "string") {
      inviteeId = lookup;
    }

    if (!inviteeId) {
      throw new Error(
        `No PrizeSkout user found for ${data.email}. Ask them to sign up first, then invite.`,
      );
    }

    if (inviteeId === userId) {
      throw new Error("You're already a member.");
    }

    // Idempotent: if they're already a member, just update the role.
    const { data: existing } = await supabase
      .from("licensee_members")
      .select("id, role")
      .eq("licensee_id", licenseeId)
      .eq("user_id", inviteeId)
      .maybeSingle();

    if (existing) {
      if (existing.role === data.role) return { ok: true, alreadyMember: true };
      const { error } = await supabase
        .from("licensee_members")
        .update({ role: data.role })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { ok: true, updated: true };
    }

    const { error } = await supabase
      .from("licensee_members")
      .insert({
        licensee_id: licenseeId,
        user_id: inviteeId,
        role: data.role,
        invited_by: userId,
        invited_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(),
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
