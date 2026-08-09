/**
 * Returns the public-facing origin of the request.
 *
 * Behind a reverse proxy (PipeOps/nginx), request.url contains the internal
 * container address (e.g. localhost:3000). The proxy sets X-Forwarded-Host
 * and X-Forwarded-Proto headers with the real public hostname and scheme.
 * We read those first so every redirect URL points to the real domain.
 */
export function getPublicOrigin(request: Request): string {
  const configured = process.env.PUBLIC_APP_ORIGIN?.trim();
  if (configured) return new URL(configured).origin;
  const requestOrigin = new URL(request.url).origin;
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const allowedHosts = new Set((process.env.PUBLIC_APP_HOSTS ?? "prizeskout.qa,www.prizeskout.qa").split(",").map(value => value.trim().toLowerCase()).filter(Boolean));
  if (forwardedHost && forwardedProto === "https" && allowedHosts.has(forwardedHost.toLowerCase())) return `https://${forwardedHost}`;
  return requestOrigin;
}
