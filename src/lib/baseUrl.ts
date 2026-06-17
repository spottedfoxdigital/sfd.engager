// Resolve the app's public base URL. On Railway (and most proxies) the Node
// server sees an internal host like localhost:3000 in req.url, so we prefer an
// explicit APP_URL env var, then the X-Forwarded-* headers, then the request
// origin as a last resort.
export function getBaseUrl(req: Request): string {
  const explicit = process.env.APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  }

  return new URL(req.url).origin;
}
