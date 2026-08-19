/** Domain vocabularies. Keep UI free of hard-coded literals — read from here. */

export type Option = { value: string; label: string };

export const UNITS: Option[] = [
  { value: "عدد", label: "عدد" },
  { value: "کیلوگرم", label: "کیلوگرم" },
  { value: "کارتن", label: "کارتن" },
  { value: "بسته", label: "بسته" },
  { value: "متر", label: "متر" },
  { value: "دستگاه", label: "دستگاه" },
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

export const BUSINESS_TYPES: Option[] = [
  { value: "manufacturer", label: "تولیدکننده" },
  { value: "importer", label: "واردکننده" },
  { value: "distributor", label: "توزیع‌کننده" },
  { value: "wholesaler", label: "عمده‌فروش" },
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

export function labelOf(options: Option[], value: string | null | undefined): string {
  if (!value) return "—";
  return options.find((o) => o.value === value)?.label ?? value;
}
