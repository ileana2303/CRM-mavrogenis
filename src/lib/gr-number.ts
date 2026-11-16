/**
 * Numbers as Greeks type and read them: «.» thousands, «,» decimals – "4.714,286".
 * Pure: used by inputs (client) and anything that formats (server).
 */

/**
 * "4.714,29" / "4714,29" / "1.500" / "4714.286" / "12.5" → number; "" or garbage → null.
 * A comma is always the decimal mark (dots are then thousands). Without a comma, several dots are thousands; a single
 * dot is a thousands mark only when it reads like one (1–3 digits, dot, exactly 3 digits: "1.500"), else a decimal
 * point – an iPad on a non-Greek keyboard gives "4714.29".
 */
export function parseGr(raw: string | null | undefined): number | null {
  const t = String(raw ?? "").replace(/[\s€%]/g, "");
  if (t === "") return null;
  let normal: string;
  if (t.includes(",")) normal = t.replace(/\./g, "").replace(",", ".");
  else if ((t.match(/\./g) ?? []).length > 1) normal = t.replace(/\./g, "");
  else if (/^-?\d{1,3}\.\d{3}$/.test(t)) normal = t.replace(".", "");
  else normal = t;
  if (!/^-?\d*\.?\d*$/.test(normal) || normal === "." || normal === "-") return null;
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

const formatters = new Map<number, Intl.NumberFormat>();

/** 4714.286 → "4.714,286" (up to `maxDecimals`, no trailing zeros unless `minDecimals`). */
export function formatGr(n: number | null | undefined, maxDecimals = 2, minDecimals = 0): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "";
  const key = maxDecimals * 10 + minDecimals;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat("el-GR", { maximumFractionDigits: maxDecimals, minimumFractionDigits: minDecimals, useGrouping: true });
    formatters.set(key, f);
  }
  return f.format(n);
}

/** Keeps only what a number can contain while typing (digits, one sign, dots, comma). */
export const cleanNumberInput = (t: string) => t.replace(/[^\d.,-]/g, "");
