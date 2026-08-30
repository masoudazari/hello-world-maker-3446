/**
 * Bilingual (Persian/English) search matching.
 *
 * Two problems this solves:
 *  1) Persian text has multiple valid encodings for the same letter
 *     (ي vs ی, ك vs ک, Arabic vs Persian digits, zero-width joiners,
 *     diacritics) — two strings that "look the same" to a person can
 *     fail a naive `includes()` check.
 *  2) A search for "pepsi" should also find "پپسی" and vice versa —
 *     these are different scripts entirely, not just normalization,
 *     so this requires an explicit alias table. It is intentionally
 *     small and hand-maintained (common wholesale FMCG brands sold on
 *     the platform) rather than automatic transliteration, because
 *     automatic Persian↔English transliteration produces enough false
 *     positives to make search worse, not better.
 */

// Common brand/product-name aliases seen in wholesale FMCG requests.
// Add more pairs here as real search queries reveal gaps.
const BRAND_ALIASES: string[][] = [
  ["pepsi", "پپسی"],
  ["coca cola", "coca-cola", "cocacola", "coke", "کوکاکولا", "کوکا کولا"],
  ["nestle", "nestlé", "نستله"],
  ["delster", "دلستر"],
  ["sprite", "اسپرایت"],
  ["fanta", "فانتا"],
  ["mirinda", "میراندا"],
  ["tea", "چای"],
  ["coffee", "قهوه"],
  ["chocolate", "شکلات"],
  ["milk", "شیر"],
  ["rice", "برنج"],
  ["sugar", "شکر", "قند"],
  ["oil", "روغن"],
  ["detergent", "پودر لباسشویی", "مایع ظرفشویی"],
  ["diaper", "پوشک"],
  ["water", "آب معدنی", "آب"],
  ["juice", "آبمیوه"],
  ["yogurt", "yoghurt", "ماست"],
  ["cheese", "پنیر"],
  ["cola", "نوشابه"],
];

const ALIAS_LOOKUP = new Map<string, number>();
BRAND_ALIASES.forEach((group, idx) => {
  group.forEach((term) => ALIAS_LOOKUP.set(normalizeSearchText(term), idx));
});

export function normalizeSearchText(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .toLowerCase()
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[\u200c\u200f\u200e]/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Given a user's search query, returns every text variant that should
 * be treated as an equivalent match — the query itself, plus any known
 * alias-group terms (Persian + English) for words found in it. Meant
 * for building a server-side `ilike ANY(...)`-style filter across
 * multiple columns, where true substring matching happens in SQL but
 * cross-script equivalence has to be supplied explicitly.
 */
export function getSearchVariants(query: string): string[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];
  const variants = new Set<string>([query.trim()]);

  const words = normalizedQuery.split(" ").filter(Boolean);
  for (const word of words) {
    const groupId = ALIAS_LOOKUP.get(word);
    if (groupId !== undefined) {
      BRAND_ALIASES[groupId].forEach((term) => variants.add(term));
    }
  }
  return Array.from(variants);
}
export function matchesQuery(text: string | null | undefined, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  const normalizedText = normalizeSearchText(text);
  if (!normalizedText) return false;

  if (normalizedText.includes(normalizedQuery) || normalizedQuery.includes(normalizedText)) {
    return true;
  }

  const queryWords = normalizedQuery.split(" ").filter(Boolean);
  const textWords = normalizedText.split(" ").filter(Boolean);

  return queryWords.some((qWord) => {
    if (textWords.some((tWord) => tWord.includes(qWord) || qWord.includes(tWord))) return true;
    const groupId = ALIAS_LOOKUP.get(qWord);
    if (groupId === undefined) return false;
    return textWords.some((tWord) => ALIAS_LOOKUP.get(tWord) === groupId);
  });
}
