/**
 * The Greek tax number (ΑΦΜ): nine digits, the last a check digit. Pure, so
 * the billing form checks it as it is typed and the action checks it again.
 *
 * Check digit: the first eight digits weighted by 2^8 … 2^1, summed, mod 11,
 * then mod 10. It catches almost every mistyped digit; it cannot tell whether
 * the number belongs to who typed it — that is for the tax office.
 */

/** "EL 123 456 789", "123456789" → "123456789"; anything else → null. */
export function normalizeAfm(raw: string): string | null {
  const digits = raw.replace(/^\s*(EL|GR)/i, '').replace(/\D/g, '');
  return digits.length === 9 ? digits : null;
}

export function isValidAfm(raw: string): boolean {
  const afm = normalizeAfm(raw);
  if (!afm || afm === '000000000') return false;
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += Number(afm[i]) * 2 ** (8 - i);
  return (sum % 11) % 10 === Number(afm[8]);
}
