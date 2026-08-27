// supabase/functions/market-price-collector/index.ts
//
// The "Collector" layer described in the spec:
//   Price Provider → fetch → normalize → store in DB → UI reads from DB
//
// This function is called on-demand (e.g. when a user searches a product
// name on the "مقایسه قیمت بازار" page, or from a cron schedule you set up
// in Lovable/Supabase) — NOT on every page render, and never fans out to
// dozens of external sites per visit: it only fetches for the exact
// search_key it's given, and only from providers marked active.
//
// ============================================================================
// HONESTY / SCOPE NOTE
// ----------------------------------------------------------------------------
// Only `MockProvider` is implemented below. It returns clearly-labeled
// synthetic data (is_mock: true) so the rest of the pipeline (storage,
// aggregation view, UI) can be built and tested end to end without
// pretending to have real market data. No real external site is scraped
// here — nothing here bypasses CAPTCHAs, auth walls, or rate limits, per
// the constraint in the spec.
//
// ADDING A REAL PROVIDER LATER
// ----------------------------------------------------------------------------
// 1. Confirm the source has either an official API, or a documented,
//    ToS-compliant way to access product/price data (many Iranian
//    marketplace sites, including ترب, do not currently offer this for
//    third parties — verify current terms before building anything).
// 2. Implement a new class satisfying the `PriceProvider` interface below.
// 3. Register it in the `PROVIDERS` array.
// 4. Insert a matching row in `public.price_sources` with is_mock=false
//    and is_active=true only once you've confirmed step 1.
// Until then, leave new providers out entirely rather than approximating
// with scraped or fabricated data.
// ============================================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

interface NormalizedPriceResult {
  sourceSlug: string;
  productName: string;
  brand?: string;
  variant?: string;
  sellerName?: string;
  price: number;
  inStock?: boolean;
  productUrl?: string;
  isMock: boolean;
}

interface PriceProvider {
  slug: string;
  fetchPrices(query: string): Promise<NormalizedPriceResult[]>;
}

// ---- Mock provider (only implementation for now) --------------------------
class MockProvider implements PriceProvider {
  slug = "mock-demo";

  async fetchPrices(query: string): Promise<NormalizedPriceResult[]> {
    // Deterministic-ish synthetic spread around a hash of the query, so the
    // UI has something stable to demo with. Clearly marked isMock: true.
    const base = 100000 + (hashString(query) % 900000);
    const sellers = ["فروشگاه نمونه ۱", "فروشگاه نمونه ۲", "فروشگاه نمونه ۳", "فروشگاه نمونه ۴"];
    return sellers.map((sellerName, i) => ({
      sourceSlug: this.slug,
      productName: query,
      sellerName,
      price: Math.round((base * (0.9 + i * 0.07)) / 1000) * 1000,
      inStock: i !== 2,
      productUrl: undefined,
      isMock: true,
    }));
  }
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

const PROVIDERS: PriceProvider[] = [new MockProvider()];

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
  }

  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return new Response(JSON.stringify({ error: "پرس‌وجوی جستجو نامعتبر است." }), { status: 400 });
    }
    const searchKey = query.trim().toLowerCase();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: sources } = await supabase
      .from("price_sources")
      .select("id, slug, is_active")
      .eq("is_active", true);
    const activeSlugs = new Set((sources ?? []).map((s) => s.slug));
    const sourceIdBySlug = new Map((sources ?? []).map((s) => [s.slug, s.id]));

    const results: NormalizedPriceResult[] = [];
    for (const provider of PROVIDERS) {
      if (!activeSlugs.has(provider.slug)) continue;
      try {
        const providerResults = await provider.fetchPrices(searchKey);
        results.push(...providerResults);
      } catch (err) {
        console.error(`provider ${provider.slug} failed:`, err);
        // one provider failing must not break the others
      }
    }

    if (results.length > 0) {
      const rows = results.map((r) => ({
        source_id: sourceIdBySlug.get(r.sourceSlug),
        search_key: searchKey,
        product_name: r.productName,
        brand: r.brand ?? null,
        variant: r.variant ?? null,
        seller_name: r.sellerName ?? null,
        price: r.price,
        in_stock: r.inStock ?? null,
        product_url: r.productUrl ?? null,
        is_mock: r.isMock,
        fetched_at: new Date().toISOString(),
      }));
      const { error: insertError } = await supabase.from("market_prices").insert(rows);
      if (insertError) throw insertError;
    }

    return new Response(JSON.stringify({ inserted: results.length, searchKey }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "خطا در جمع‌آوری قیمت." }), { status: 500 });
  }
});
