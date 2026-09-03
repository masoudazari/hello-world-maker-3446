/** Domain vocabularies. Keep UI free of hard-coded literals — read from here. */

export type Option = { value: string; label: string };

export const UNITS: Option[] = [
  { value: "عدد", label: "عدد" },
  { value: "کارتن", label: "کارتن" },
  { value: "کیلوگرم", label: "کیلوگرم" },
  { value: "لیتر", label: "لیتر" },
  { value: "بسته", label: "بسته" },
  { value: "سایر", label: "سایر" },
];

export const QUALITY_LEVELS: Option[] = [
  { value: "economy", label: "اقتصادی" },
  { value: "normal", label: "معمولی" },
  { value: "premium", label: "درجه یک" },
  { value: "any", label: "فرقی ندارد" },
];

export const TIMEFRAMES: Option[] = [
  { value: "urgent", label: "فوری" },
  { value: "3days", label: "تا ۳ روز" },
  { value: "7days", label: "تا ۷ روز" },
  { value: "30days", label: "تا ۳۰ روز" },
  { value: "flexible", label: "انعطاف‌پذیر" },
];

/** Supplier business types — MVP focuses on cafe & restaurant supply chain. */
export const BUSINESS_TYPES: Option[] = [
  { value: "food_distributor", label: "پخش‌کننده مواد غذایی" },
  { value: "beverage_distributor", label: "پخش‌کننده نوشیدنی" },
  { value: "wholesaler", label: "عمده‌فروش" },
  { value: "importer", label: "واردکننده" },
  { value: "manufacturer", label: "تولیدکننده" },
  { value: "cafe_supplier", label: "تأمین‌کننده مواد اولیه کافه و رستوران" },
  { value: "distributor", label: "توزیع‌کننده" },
];

/** Buyer business types — cafes and restaurants only in this MVP. */
export const BUYER_TYPES: Option[] = [
  { value: "cafe", label: "کافه" },
  { value: "restaurant", label: "رستوران" },
  { value: "fastfood", label: "فست‌فود" },
  { value: "catering", label: "کترینگ" },
  { value: "juice_icecream", label: "آبمیوه و بستنی‌فروشی" },
];

export const CITIES: string[] = [
  "تهران",
  "کرج",
  "اصفهان",
  "مشهد",
  "تبریز",
  "شیراز",
  "قم",
  "اهواز",
  "کرمانشاه",
  "رشت",
  "یزد",
  "ارومیه",
  "بندرعباس",
  "سایر",
];

export const REQUEST_STATUSES: Option[] = [
  { value: "pending", label: "در انتظار بررسی" },
  { value: "matching", label: "در حال تطبیق" },
  { value: "offers_received", label: "دریافت پیشنهاد" },
  { value: "buyer_reviewing", label: "بررسی توسط خریدار" },
  { value: "accepted", label: "پذیرفته‌شده" },
  { value: "closed", label: "بسته‌شده" },
];

export const OFFER_STATUSES: Option[] = [
  { value: "pending", label: "در انتظار پاسخ" },
  { value: "accepted", label: "پذیرفته‌شده" },
  { value: "rejected", label: "رد شده" },
];

export const ORDER_STATUSES: Option[] = [
  { value: "pending_payment", label: "در انتظار پرداخت" },
  { value: "processing", label: "در حال آماده‌سازی" },
  { value: "shipped", label: "ارسال شده" },
  { value: "completed", label: "تکمیل شده" },
  { value: "cancelled", label: "لغو شده" },
];

export const PRODUCT_STATUSES: Option[] = [
  { value: "pending_review", label: "در انتظار تأیید" },
  { value: "active", label: "فعال" },
  { value: "rejected", label: "رد شده" },
  { value: "disabled", label: "غیرفعال" },
];

export const VERIFICATION_STATUSES: Option[] = [
  { value: "pending", label: "در انتظار احراز" },
  { value: "verified", label: "تأییدشده" },
  { value: "rejected", label: "رد شده" },
  { value: "suspended", label: "تعلیق‌شده" },
];

export const PAYMENT_TERMS: Option[] = [
  { value: "نقدی", label: "نقدی" },
  { value: "۵۰٪ پیش‌پرداخت", label: "۵۰٪ پیش‌پرداخت" },
  { value: "چک ۱ ماهه", label: "چک ۱ ماهه" },
  { value: "چک ۳ ماهه", label: "چک ۳ ماهه" },
  { value: "توافقی", label: "توافقی" },
];

/**
 * Structured payment terms. Unlike the free-text list above these are
 * comparable and filterable, and each one carries a supplier-defined
 * surcharge percentage (deferred payment costs the supplier money).
 */
export type PaymentTermOption = Option & { defaultSurcharge: number };

export const PAYMENT_TERM_OPTIONS: PaymentTermOption[] = [
  { value: "cash", label: "نقدی", defaultSurcharge: 0 },
  { value: "prepay_50", label: "۵۰٪ پیش‌پرداخت", defaultSurcharge: 0 },
  { value: "net_7", label: "۷ روزه", defaultSurcharge: 2 },
  { value: "net_30", label: "۳۰ روزه", defaultSurcharge: 10 },
  { value: "net_60", label: "۶۰ روزه", defaultSurcharge: 18 },
  { value: "check_1m", label: "چک ۱ ماهه", defaultSurcharge: 8 },
  { value: "check_3m", label: "چک ۳ ماهه", defaultSurcharge: 20 },
];

export function paymentTermLabel(code: string | null | undefined): string {
  if (!code) return "—";
  return PAYMENT_TERM_OPTIONS.find((o) => o.value === code)?.label ?? code;
}

/** Total price including the payment-term surcharge, rounded to Toman. */
export function withSurcharge(base: number, surchargePercent: number | null | undefined): number {
  const percent = Number(surchargePercent) || 0;
  return Math.round(base * (1 + percent / 100));
}

export function labelOf(options: Option[], value: string | null | undefined): string {
  if (!value) return "—";
  return options.find((o) => o.value === value)?.label ?? value;
}

/** Online presence buckets derived from suppliers.last_seen_at. */
export function presenceOf(lastSeenAt: string | null | undefined): { label: string; tone: "online" | "recent" | "offline" } {
  if (!lastSeenAt) return { label: "آفلاین", tone: "offline" };
  const minutes = (Date.now() - new Date(lastSeenAt).getTime()) / 60000;
  if (minutes <= 10) return { label: "آنلاین", tone: "online" };
  if (minutes <= 60 * 24) return { label: "اخیراً فعال", tone: "recent" };
  return { label: "آفلاین", tone: "offline" };
}
