/** Log outbound server HTTP (SoftOne, GSIS, …) when SERVER_HTTP_DEBUG=1. Passwords are redacted. */

const MAX_CHARS = 12_000;

export function httpDebugEnabled(): boolean {
  return process.env.SERVER_HTTP_DEBUG === "1" || process.env.SERVER_HTTP_DEBUG === "true";
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
  if (text.length <= MAX_CHARS) return text;
  return `${text.slice(0, MAX_CHARS)}\n… (${text.length - MAX_CHARS} more chars)`;
}

export function logHttpOutbound(label: string, url: string, requestBody: unknown, response: { status: number; bodyText: string }, ms: number) {
  if (!httpDebugEnabled()) return;
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
  console.log(
    `\n[http ${label}] ${Math.round(ms)}ms HTTP ${response.status}\n→ ${url}\n--- request ---\n${clip(req)}\n--- response ---\n${clip(res)}\n`,
  );
}

/** Redact GSIS / SOAP credentials in logged XML. */
export function redactSoapBody(xml: string): string {
  return xml.replace(/(<(?:[\w-]+:)?Password[^>]*>)[^<]*(<\/(?:[\w-]+:)?Password>)/gi, "$1***$2");
}