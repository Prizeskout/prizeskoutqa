/**
 * Returns the public-facing origin of the request.
 *
 * Behind a reverse proxy (PipeOps/nginx), request.url contains the internal
 * container address (e.g. localhost:3000). The proxy sets X-Forwarded-Host
 * and X-Forwarded-Proto headers with the real public hostname and scheme.
 * We read those first so every redirect URL points to the real domain.
 */
export function getPublicOrigin(request: Request): string {
  const host  = request.headers.get("x-forwarded-host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}
