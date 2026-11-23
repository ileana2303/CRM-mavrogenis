/**
 * Log outbound server HTTP (SoftOne, GSIS, …). Passwords are redacted.
 *   SERVER_HTTP_DEBUG=1 (or true)        → every call
 *   SERVER_HTTP_DEBUG=calculate,setData  → only calls whose label contains one of the words (case-insensitive),
 *                                          e.g. «SoftOne calculate», «SoftOne JS /JS/api.crm.actions/getPendings»
 */

/** per body; SERVER_HTTP_DEBUG_MAX overrides (0 = never clip) – a SoftOne calculate answer is ~25.000 chars */
const MAX_CHARS = (() => {
  const n = Number(process.env.SERVER_HTTP_DEBUG_MAX);
  return Number.isFinite(n) && process.env.SERVER_HTTP_DEBUG_MAX !== undefined && process.env.SERVER_HTTP_DEBUG_MAX !== "" ? n : 12_000;
})();

export function httpDebugEnabled(label?: string): boolean {
  const v = (process.env.SERVER_HTTP_DEBUG ?? "").trim();
  if (!v || v === "0" || v === "false") return false;
  if (v === "1" || v === "true") return true;
  if (label === undefined) return true;
  const l = label.toLowerCase();
  return v
    .split(",")
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean)
    .some((w) => l.includes(w));
}

const SECRET_KEYS = /^password$/i;

function redactValue(key: string, value: unknown): unknown {
  if (SECRET_KEYS.test(key) && typeof value === "string") return "***";
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return redactBody(value as Record<string, unknown>);
  }
  return value;
}

export function redactBody(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    out[k] = Array.isArray(v)
      ? v.map((item) => (item && typeof item === "object" && !Array.isArray(item) ? redactBody(item as Record<string, unknown>) : item))
      : redactValue(k, v);
  }
  return out;
}

function clip(text: string): string {
  if (MAX_CHARS <= 0 || text.length <= MAX_CHARS) return text;
  return `${text.slice(0, MAX_CHARS)}\n… (${text.length - MAX_CHARS} more chars)`;
}

export function logHttpOutbound(label: string, url: string, requestBody: unknown, response: { status: number; bodyText: string }, ms: number) {
  if (!httpDebugEnabled(label)) return;
  const req =
    requestBody !== undefined && typeof requestBody === "object" && requestBody !== null && !Array.isArray(requestBody)
      ? JSON.stringify(redactBody(requestBody as Record<string, unknown>), null, 2)
      : requestBody === undefined
        ? "(none)"
        : String(requestBody);
  let res = response.bodyText;
  try {
    res = JSON.stringify(JSON.parse(response.bodyText), null, 2);
  } catch {
    // keep raw (SOAP, etc.)
  }
  // SERVER_HTTP_DEBUG_RESPONSE=0 → the request only (e.g. the payload sent to calculate, without its ~25.000-char answer)
  const withResponse = !["0", "false"].includes((process.env.SERVER_HTTP_DEBUG_RESPONSE ?? "").trim());
  console.log(
    `\n[http ${label}] ${Math.round(ms)}ms HTTP ${response.status}\n→ ${url}\n--- request ---\n${clip(req)}\n` +
      (withResponse ? `--- response ---\n${clip(res)}\n` : ""),
  );
}

/** Redact GSIS / SOAP credentials in logged XML. */
export function redactSoapBody(xml: string): string {
  return xml.replace(/(<(?:[\w-]+:)?Password[^>]*>)[^<]*(<\/(?:[\w-]+:)?Password>)/gi, "$1***$2");
}