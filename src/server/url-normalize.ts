// Deterministic URL normalization for the shared competitor URL cache.
// Must match the SQL normalize_competitor_url() function in the migration.
// Rules: lowercase host+scheme, strip fragment, strip known tracking params,
//        sort remaining params, strip trailing slash from pathname.

const TRACKING = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "fbclid", "gclid", "msclkid", "ref", "referrer", "source", "track",
  "_ga", "_gl", "mc_cid", "mc_eid", "igshid", "s_kwcid", "si", "twclid",
]);

export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  try {
    const u = new URL(trimmed);
    u.protocol = u.protocol.toLowerCase();
    u.hostname  = u.hostname.toLowerCase();
    u.pathname  = u.pathname.toLowerCase();              // lowercase path (matches SQL lower())
    u.hash      = "";                                    // strip fragment
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING.has(key.toLowerCase())) u.searchParams.delete(key);
    }
    u.searchParams.sort();                               // stable param order
    u.pathname = u.pathname.replace(/\/+$/, "") || "/"; // strip trailing slash
    return u.toString();
  } catch {
    // Malformed URL: just lowercase and strip fragment.
    return trimmed.toLowerCase().replace(/#.*$/, "");
  }
}
