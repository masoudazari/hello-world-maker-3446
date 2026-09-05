/**
 * Iranian mobile numbers arrive in the wild in every format:
 * 09122464364, +989122464364, 00989122464364, with spaces or dashes.
 * This normalizes all of them to one canonical form so the database
 * never ends up with the same number stored five different ways.
 */

/** Canonical form: "+989XXXXXXXXX" (13 chars). Returns null if invalid. */
export function normalizeIranianMobile(input: string | null | undefined): string | null {
  if (!input) return null;
  // Strip everything except digits and a leading +
  let digits = input.trim().replace(/[\s\-()]/g, "");
  digits = digits.replace(/[^\d+]/g, "");

  if (digits.startsWith("+98")) digits = digits.slice(3);
  else if (digits.startsWith("0098")) digits = digits.slice(4);
  else if (digits.startsWith("98") && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = digits.slice(1);

  // `digits` should now be 10 digits starting with "9" (e.g. 9122464364)
  if (!/^9\d{9}$/.test(digits)) return null;

  return `+98${digits}`;
}

/** Human-friendly display: "0912 246 4364" */
export function formatIranianMobile(input: string | null | undefined): string {
  const normalized = normalizeIranianMobile(input);
  if (!normalized) return input ?? "";
  const local = "0" + normalized.slice(3); // 0912xxxxxxx
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}

export function isValidIranianMobile(input: string | null | undefined): boolean {
  return normalizeIranianMobile(input) !== null;
}
