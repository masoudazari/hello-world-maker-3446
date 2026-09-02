import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ExternalLink, Search } from "lucide-react";
import { PanelShell } from "@/components/layout/PanelShell";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { getSearchVariants } from "@/lib/bilingual-search";

const DIVAR_CITIES = [
  { slug: "tehran", label: "تهران" },
  { slug: "mashhad", label: "مشهد" },
  { slug: "isfahan", label: "اصفهان" },
  { slug: "shiraz", label: "شیراز" },
  { slug: "tabriz", label: "تبریز" },
  { slug: "karaj", label: "کرج" },
  { slug: "ahvaz", label: "اهواز" },
  { slug: "qom", label: "قم" },
  { slug: "kermanshah", label: "کرمانشاه" },
  { slug: "rasht", label: "رشت" },
];
import { useAccount } from "@/lib/auth";
import { faDate, toman } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/market-prices")({
  head: () => ({
    meta: [
      { title: "مقایسه قیمت بازار | عمده‌یار" },
      { name: "description", content: "مقایسه قیمت یک محصول در منابع مختلف." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MarketPrices,
});

type MarketRow = {
  id: string;
  product_name: string;
  seller_name: string | null;
  price: number;
  in_stock: boolean | null;
  product_url: string | null;
  is_mock: boolean;
  fetched_at: string;
  price_sources: { name: string } | null;
};

function MarketPrices() {
  const { data: account } = useAccount();
  const role = account?.role ?? "buyer";
  const [query, setQuery] = useState("");
  const [searchKey, setSearchKey] = useState<string | null>(null);
  const [divarCity, setDivarCity] = useState("tehran");

  const collect = useMutation({
    mutationFn: async (q: string) => {
      const { data, error } = await supabase.functions.invoke("market-price-collector", { body: { query: q } });
      if (error) throw error;
      return data as { searchKey: string; inserted: number };
    },
  });

  function runSearch(q: string) {
    if (!q.trim()) return;
    setSearchKey(q.trim().toLowerCase());
    collect.mutate(q.trim());
  }

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["market-prices", searchKey],
    enabled: Boolean(searchKey),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_prices")
        .select("id, product_name, seller_name, price, in_stock, product_url, is_mock, fetched_at, price_sources(name)")
        .eq("search_key", searchKey!)
        .order("price", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MarketRow[];
    },
  });

  const hasMockData = rows.some((r) => r.is_mock);

  const { data: siteProducts = [], isLoading: loadingSiteProducts } = useQuery({
    queryKey: ["market-prices-own-site", searchKey],
    enabled: Boolean(searchKey),
    queryFn: async () => {
      const variants = getSearchVariants(searchKey!);
      const orClauses = variants.flatMap((term) => [`name.ilike.%${term}%`, `brand.ilike.%${term}%`]);
      const { data, error } = await supabase
        .from("products")
        .select("id, name, brand, unit, base_price, city, suppliers(company_name, rating)")
        .eq("status", "active")
        .or(orClauses.join(","))
        .order("base_price", { ascending: true })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: referencePrices = [] } = useQuery({
    queryKey: ["reference-prices", searchKey],
    enabled: Boolean(searchKey),
    queryFn: async () => {
      const variants = getSearchVariants(searchKey!);
      const orClauses = variants.flatMap((term) => [`product_name.ilike.%${term}%`, `brand.ilike.%${term}%`]);
      const { data, error } = await supabase
        .from("reference_prices")
        .select("id, product_name, brand, unit, approx_price, price_range_min, price_range_max, note, updated_at")
        .or(orClauses.join(","))
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <PanelShell role={role} title="مقایسه قیمت بازار" subtitle="جستجوی یک محصول و مقایسه قیمت آن در منابع مختلف">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="مثلاً: قهوه اسپرسو ۱ کیلویی"
          onKeyDown={(e) => e.key === "Enter" && runSearch(query)}
        />
        <Button onClick={() => runSearch(query)} disabled={collect.isPending}>
          <Search className="ml-2 h-4 w-4" />
          {collect.isPending ? "در حال جستجو…" : "جستجو"}
        </Button>
      </div>

      {query.trim() && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-secondary/20 p-3">
          <span className="text-xs text-muted-foreground">بررسی سریع در سایت‌های دیگر (بدون استخراج خودکار قیمت):</span>
          <Button variant="outline" size="sm" asChild>
            <a
              href={`https://torob.com/search/?query=${encodeURIComponent(query.trim())}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="ml-2 h-3.5 w-3.5" />
              جستجو در ترب
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a
              href={`https://www.digikala.com/search/?q=${encodeURIComponent(query.trim())}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="ml-2 h-3.5 w-3.5" />
              جستجو در دیجی‌کالا
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="https://grocery.snapp.ir/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="ml-2 h-3.5 w-3.5" />
              باز کردن اسنپ‌مارکت (نیاز به انتخاب موقعیت)
            </a>
          </Button>
          <Select value={divarCity} onValueChange={setDivarCity}>
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIVAR_CITIES.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" asChild>
            <a
              href={`https://divar.ir/s/${divarCity}?q=${encodeURIComponent(query.trim())}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="ml-2 h-3.5 w-3.5" />
              جستجو در دیوار
            </a>
          </Button>
        </div>
      )}

      {hasMockData && (
        <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-xs text-amber-700 dark:text-amber-400">
          نتایجی که برچسب <strong>Mock</strong> دارند داده نمایشی‌اند، نه قیمت واقعی بازار. اتصال مستقیم به سایت‌هایی مثل
          ترب امکان‌پذیر نیست (بدون API رسمی)؛ در عوض نتایج بدون این برچسب از Google Custom Search (رسمی) استخراج شده‌اند
          و تخمینی‌اند، نه قیمت تضمینی.
        </div>
      )}

      {searchKey && referencePrices.length > 0 && (
        <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <h2 className="mb-3 text-sm font-bold">قیمت مرجع تقریبی</h2>
          <div className="grid gap-3">
            {referencePrices.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {r.product_name} {r.brand && <span className="text-muted-foreground">({r.brand})</span>}
                  </p>
                  {r.note && <p className="mt-1 text-xs text-muted-foreground">{r.note}</p>}
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    آخرین به‌روزرسانی: {faDate(r.updated_at)} · تخمینی، نه قیمت لحظه‌ای بازار
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-lg font-bold text-primary">{toman(r.approx_price)}</p>
                  {r.price_range_min && r.price_range_max && (
                    <p className="text-xs text-muted-foreground">
                      بازه: {toman(r.price_range_min)} تا {toman(r.price_range_max)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {searchKey && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-bold">قیمت در عمده‌یار</h2>
          {loadingSiteProducts ? (
            <p className="text-sm text-muted-foreground">در حال جستجو…</p>
          ) : siteProducts.length === 0 ? (
            <EmptyState title="محصول مشابهی در فهرست عمده‌یار پیدا نشد" />
          ) : (
            <div className="grid gap-3">
              {siteProducts.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
                  <div>
                    <p className="font-medium">
                      {p.name} {p.brand && <span className="text-muted-foreground">({p.brand})</span>}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.suppliers?.company_name ?? "فروشنده"} · {p.city}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-primary">
                    {toman(p.base_price)} <span className="text-xs font-normal text-muted-foreground">/ {p.unit}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-bold">منابع بیرونی</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">در حال بارگذاری…</p>
        ) : !searchKey ? (
          <EmptyState title="یک محصول را جستجو کنید" description="نتایج از منابع فعال جمع‌آوری و در اینجا نمایش داده می‌شود." />
        ) : rows.length === 0 ? (
          <EmptyState title="نتیجه‌ای پیدا نشد" />
        ) : (
          <div className="grid gap-3">
            {rows.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
                <div>
                  <p className="font-medium">
                    {r.seller_name ?? "فروشنده نامشخص"}{" "}
                    {r.is_mock && (
                      <Badge variant="outline" className="mr-2 text-[10px]">
                        Mock
                      </Badge>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    منبع: {r.price_sources?.name ?? "—"} · بروزرسانی: {faDate(r.fetched_at)}
                    {r.in_stock === false && " · ناموجود"}
                  </p>
                </div>
                <p className="text-lg font-bold text-primary">{toman(r.price)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </PanelShell>
  );
}
