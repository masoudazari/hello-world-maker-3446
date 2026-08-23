import { UNITS } from "@/lib/constants";

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toEnDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (d) => {
    const fa = FA_DIGITS.indexOf(d);
    if (fa > -1) return String(fa);
    return String(AR_DIGITS.indexOf(d));
  });
}

const UNIT_ALIASES: Record<string, string> = {
  عدد: "عدد",
  تا: "عدد",
  کارتن: "کارتن",
  جعبه: "کارتن",
  شل: "کارتن",
  شلگی: "کارتن",
  کیلو: "کیلوگرم",
  کیلوگرم: "کیلوگرم",
  کیلوگرمی: "کیلوگرم",
  کگ: "کیلوگرم",
  لیتر: "لیتر",
  لیتری: "لیتر",
  بسته: "بسته",
  پک: "بسته",
};

export type ParsedNeed = {
  productName: string;
  quantity: number | null;
  unit: string | null;
};

/** Turns free text like «۱۰۰ عدد کوکاکولا» into structured request fields. */
export function parseNeed(raw: string): ParsedNeed {
  const text = toEnDigits(raw).replace(/\s+/g, " ").trim();
  if (!text) return { productName: "", quantity: null, unit: null };

  const match = text.match(/(\d+(?:[.,]\d+)?)\s*([\u0600-\u06FF]+)?/);
  let quantity: number | null = null;
  let unit: string | null = null;
  let rest = text;

  if (match) {
    quantity = Number(String(match[1]).replace(",", "."));
    const maybeUnit = match[2] ? UNIT_ALIASES[match[2]] : undefined;
    if (maybeUnit) unit = maybeUnit;
    rest = text.replace(match[0], " ").replace(/\s+/g, " ").trim();
    if (!maybeUnit && match[2]) rest = `${match[2]} ${rest}`.trim();
  }

  rest = rest.replace(/^(می‌خواهم|میخوام|نیاز دارم|لطفا|لطفاً)\s+/u, "").trim();

  return {
    productName: rest || text,
    quantity: quantity && quantity > 0 ? quantity : null,
    unit: unit ?? (UNITS[0]?.value ?? "عدد"),
  };
}
