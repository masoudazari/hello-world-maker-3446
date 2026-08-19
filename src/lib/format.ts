const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/** Convert any latin digits inside a value to Persian digits. */
export function fa(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]!);
}

/** Group a number with thousand separators, in Persian digits. */
export function faNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return fa(new Intl.NumberFormat("en-US").format(Math.round(value)));
}

/** Format an amount stored in Toman. */
export function toman(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${faNumber(value)} تومان`;
}

const rtf = new Intl.RelativeTimeFormat("fa", { numeric: "auto" });

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, secs] of units) {
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
  }
  return "همین حالا";
}

export function faDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(iso));
}

export function faDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(iso),
  );
}

/** Build a URL-safe slug that also tolerates Persian characters. */
export function slugify(input: string): string {
  return (
    input
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, "-")
      .replace(/[^\p{L}\p{N}-]/gu, "")
      .slice(0, 60) || "item"
  );
}
