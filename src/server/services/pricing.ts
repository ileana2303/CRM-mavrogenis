/** Shared pricing math (used on server and client). */
export function offerPrice(floorPrice: number, qty: number, discountPct: number, specialDiscountPct: number): number {
  const f = Number(floorPrice) || 0;
  const q = Number(qty) || 0;
  const d = (Number(discountPct) || 0) / 100;
  const s = (Number(specialDiscountPct) || 0) / 100;
  return Math.round(f * q * (1 - d) * (1 - s) * 100) / 100;
}

export function sum(values: number[]) {
  return values.reduce((a, b) => a + (Number(b) || 0), 0);
}
