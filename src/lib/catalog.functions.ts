import { createServerFn } from "@tanstack/react-start";

export type ProductFilters = {
  q?: string;
  category?: string;
  city?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  maxMinimumOrder?: number;
  businessType?: string;
  verifiedOnly?: boolean;
  inStockOnly?: boolean;
  officialInvoice?: boolean;
  supplierId?: string;
  page?: number;
  perPage?: number;
};

export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { publicClient } = await import("./supabase-public.server");
  const { data } = await publicClient()
    .from("categories")
    .select("id, name, slug, icon, sort_order, parent_id")
    .eq("status", "active")
    .order("sort_order");
  return data ?? [];
});

export const listProducts = createServerFn({ method: "GET" })
  .inputValidator((data: ProductFilters) => data ?? {})
  .handler(async ({ data }) => {
    const { publicClient } = await import("./supabase-public.server");
    const supabase = publicClient();
    const perPage = Math.min(data.perPage ?? 24, 60);
    const page = Math.max(data.page ?? 1, 1);

    let categoryId: string | null = null;
    if (data.category) {
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", data.category)
        .maybeSingle();
      categoryId = cat?.id ?? null;
    }

    let supplierIds: string[] | null = null;
    if (data.businessType || data.verifiedOnly || data.officialInvoice) {
      let sq = supabase.from("suppliers").select("id");
      if (data.businessType) sq = sq.eq("business_type", data.businessType);
      if (data.verifiedOnly) sq = sq.eq("verification_status", "verified");
      if (data.officialInvoice) sq = sq.eq("official_invoice", true);
      const { data: rows } = await sq.limit(500);
      supplierIds = (rows ?? []).map((r) => r.id);
      if (supplierIds.length === 0) return { items: [], total: 0, page, perPage };
    }

    let query = supabase
      .from("products")
      .select(
        "id, name, slug, brand, unit, minimum_order, stock, city, base_price, image_url, is_featured, created_at, category_id, supplier_id, suppliers(id, company_name, slug, business_type, verification_status, rating, city)",
        { count: "exact" },
      )
      .eq("status", "active");

    if (data.q) query = query.ilike("name", `%${data.q}%`);
    if (categoryId) query = query.eq("category_id", categoryId);
    if (data.city) query = query.eq("city", data.city);
    if (data.brand) query = query.eq("brand", data.brand);
    if (data.supplierId) query = query.eq("supplier_id", data.supplierId);
    if (supplierIds) query = query.in("supplier_id", supplierIds);
    if (data.minPrice) query = query.gte("base_price", data.minPrice);
    if (data.maxPrice) query = query.lte("base_price", data.maxPrice);
    if (data.maxMinimumOrder) query = query.lte("minimum_order", data.maxMinimumOrder);
    if (data.inStockOnly) query = query.gt("stock", 0);

    const from = (page - 1) * perPage;
    const { data: items, count } = await query
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, from + perPage - 1);

    return { items: items ?? [], total: count ?? 0, page, perPage };
  });

export const getProduct = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { publicClient } = await import("./supabase-public.server");
    const supabase = publicClient();
    const { data: product } = await supabase
      .from("products")
      .select(
        "*, categories(id, name, slug), suppliers(id, company_name, slug, business_type, city, verification_status, rating, reviews_count, deals_count, supplier_score, founded_year, response_rate, official_invoice)",
      )
      .eq("slug", data.slug)
      .eq("status", "active")
      .maybeSingle();
    if (!product) return null;
    const [{ data: prices }, { data: images }] = await Promise.all([
      supabase.from("product_prices").select("*").eq("product_id", product.id).order("min_quantity"),
      supabase.from("product_images").select("*").eq("product_id", product.id).order("sort_order"),
    ]);
    return { product, prices: prices ?? [], images: images ?? [] };
  });

export const listSuppliers = createServerFn({ method: "GET" })
  .inputValidator((data: { q?: string; city?: string; businessType?: string; verifiedOnly?: boolean; limit?: number }) => data ?? {})
  .handler(async ({ data }) => {
    const { publicClient } = await import("./supabase-public.server");
    let query = publicClient()
      .from("suppliers")
      .select("*")
      .order("supplier_score", { ascending: false })
      .limit(Math.min(data.limit ?? 48, 60));
    if (data.q) query = query.ilike("company_name", `%${data.q}%`);
    if (data.city) query = query.eq("city", data.city);
    if (data.businessType) query = query.eq("business_type", data.businessType);
    if (data.verifiedOnly) query = query.eq("verification_status", "verified");
    const { data: rows } = await query;
    return rows ?? [];
  });

export const getSupplier = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { publicClient } = await import("./supabase-public.server");
    const supabase = publicClient();
    const { data: supplier } = await supabase.from("suppliers").select("*").eq("id", data.id).maybeSingle();
    if (!supplier) return null;
    const [{ data: products }, { data: reviews }] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, slug, base_price, unit, minimum_order, city, image_url, stock")
        .eq("supplier_id", supplier.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(24),
      supabase
        .from("reviews")
        .select("id, overall_score, comment, created_at")
        .eq("supplier_id", supplier.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    return { supplier, products: products ?? [], reviews: reviews ?? [] };
  });

export const listOpenRequests = createServerFn({ method: "GET" })
  .inputValidator((data: { q?: string; category?: string; city?: string; limit?: number }) => data ?? {})
  .handler(async ({ data }) => {
    const { publicClient } = await import("./supabase-public.server");
    const supabase = publicClient();
    let query = supabase
      .from("purchase_requests")
      .select("id, product_name, quantity, unit, quality, delivery_city, required_date, description, status, offers_count, created_at, expires_at, categories(name, slug)")
      .neq("status", "closed")
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 40, 60));
    if (data.q) query = query.ilike("product_name", `%${data.q}%`);
    if (data.city) query = query.eq("delivery_city", data.city);
    if (data.category) {
      const { data: cat } = await supabase.from("categories").select("id").eq("slug", data.category).maybeSingle();
      if (cat) query = query.eq("category_id", cat.id);
    }
    const { data: rows } = await query;
    return rows ?? [];
  });

export const getHomeData = createServerFn({ method: "GET" }).handler(async () => {
  const { publicClient } = await import("./supabase-public.server");
  const supabase = publicClient();
  const [categories, suppliers, products, requests, productCount, supplierCount, requestCount] =
    await Promise.all([
      supabase.from("categories").select("id, name, slug, icon").eq("status", "active").order("sort_order"),
      supabase
        .from("suppliers")
        .select("id, company_name, city, business_type, verification_status, rating, deals_count, founded_year, logo_url, supplier_score")
        .order("supplier_score", { ascending: false })
        .limit(8),
      supabase
        .from("products")
        .select("id, name, slug, base_price, unit, minimum_order, city, image_url, suppliers(company_name, verification_status)")
        .eq("status", "active")
        .order("is_featured", { ascending: false })
        .limit(8),
      supabase
        .from("purchase_requests")
        .select("id, product_name, quantity, unit, delivery_city, offers_count, created_at")
        .neq("status", "closed")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("suppliers").select("id", { count: "exact", head: true }),
      supabase.from("purchase_requests").select("id", { count: "exact", head: true }),
    ]);
  return {
    categories: categories.data ?? [],
    suppliers: suppliers.data ?? [],
    products: products.data ?? [],
    requests: requests.data ?? [],
    stats: {
      products: productCount.count ?? 0,
      suppliers: supplierCount.count ?? 0,
      requests: requestCount.count ?? 0,
    },
  };
});

export const getPublicRequest = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { publicClient } = await import("./supabase-public.server");
    const { data: row } = await publicClient()
      .from("purchase_requests")
      .select(
        "id, product_name, quantity, unit, quality, delivery_city, required_date, timeframe, description, status, offers_count, created_at, expires_at, budget_min, budget_max, categories(name, slug)",
      )
      .eq("id", data.id)
      .maybeSingle();
    return row ?? null;
  });

export const listBrands = createServerFn({ method: "GET" }).handler(async () => {
  const { publicClient } = await import("./supabase-public.server");
  const { data } = await publicClient()
    .from("products")
    .select("brand")
    .eq("status", "active")
    .not("brand", "is", null)
    .limit(1000);
  return Array.from(new Set((data ?? []).map((r) => r.brand).filter(Boolean) as string[])).sort();
});
