const PRIVATE_V4 = /^(?:0\.|10\.|127\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.|224\.|255\.)/;

export function assertSafePublicHttpsUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== "https:" || (url.port && url.port !== "443")) throw new Error("Only public HTTPS URLs on port 443 are allowed.");
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("Private or local destinations are not allowed.");
  if (PRIVATE_V4.test(host) || host === "::1" || host === "[::1]" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:")) throw new Error("Private or local destinations are not allowed.");
  if (/^\d+$/.test(host) || /^0x/i.test(host)) throw new Error("Alternative numeric IP addresses are not allowed.");
  url.username = "";
  url.password = "";
  return url;
}

export async function safePublicFetch(raw: string, init: RequestInit = {}, maxRedirects = 3) {
  let url = assertSafePublicHttpsUrl(raw);
  for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
    const response = await fetch(url, { ...init, redirect: "manual" });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    if (redirects === maxRedirects) throw new Error("Too many redirects.");
    const location = response.headers.get("location");
    if (!location) throw new Error("Redirect response did not include a destination.");
    url = assertSafePublicHttpsUrl(new URL(location, url).toString());
  }
  throw new Error("Outbound request failed.");
}
