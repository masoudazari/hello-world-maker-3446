import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Filter } from "lucide-react";
import { listBrands, listCategories, listProducts, type ProductFilters } from "@/lib/catalog.functions";
import { PublicShell, PageHeader } from "@/components/layout/PublicShell";
import { ProductCard } from "@/components/catalog/ProductCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BUSINESS_TYPES, CITIES } from "@/lib/constants";
import { faNumber } from "@/lib/format";
import { cleanSearch } from "@/lib/search";

type Search = {
  q?: string;
  category?: string;
  city?: string;
  brand?: string;
  businessType?: string;
  minPrice?: number;
  maxPrice?: number;
  maxMinimumOrder?: number;
  verifiedOnly?: boolean;
  inStockOnly?: boolean;
  page?: number;
};

const ALL = "__all__";

export const Route = createFileRoute("/products/")({
  validateSearch: (search: Record<string, unknown>): Search =>
    cleanSearch<Search>({
    q: (search["q"] as string) || undefined,
    category: (search["category"] as string) || undefined,
    city: (search["city"] as string) || undefined,
    brand: (search["brand"] as string) || undefined,
    businessType: (search["businessType"] as string) || undefined,
    minPrice: search["minPrice"] ? Number(search["minPrice"]) : undefined,
    maxPrice: search["maxPrice"] ? Number(search["maxPrice"]) : undefined,
    maxMinimumOrder: search["maxMinimumOrder"] ? Number(search["maxMinimumOrder"]) : undefined,
    verifiedOnly: search["verifiedOnly"] === true || search["verifiedOnly"] === "true" || undefined,
    inStockOnly: search["inStockOnly"] === true || search["inStockOnly"] === "true" || undefined,
    page: search["page"] ? Number(search["page"]) : undefined,
    }),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    void context.queryClient.ensureQueryData(productsQuery(deps));
    void context.queryClient.ensureQueryData(facetsQuery);
  },
  head: () => ({
    meta: [
      { title: "محصولات عمده | عمده‌یار" },
      { name: "description", content: "جستجو و فیلتر هزاران کالای عمده از تأمین‌کنندگان معتبر ایران با قیمت پلکانی." },
      { property: "og:title", content: "محصولات عمده | عمده‌یار" },
      { property: "og:description", content: "کالای عمده مورد نیاز خود را بر اساس دسته، شهر، برند و حداقل سفارش پیدا کنید." },
    ],
  }),
  component: ProductsPage,
});

function productsQuery(filters: ProductFilters) {
  return queryOptions({
    queryKey: ["products", filters],
    queryFn: () => listProducts({ data: filters }),
  });
}

const facetsQuery = queryOptions({
  queryKey: ["product-facets"],
  queryFn: async () => ({ categories: await listCategories(), brands: await listBrands() }),
});

function ProductsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/products/" });
  const { data } = useSuspenseQuery(productsQuery(search));
  const { data: facets } = useSuspenseQuery(facetsQuery);

  const update = (patch: { [K in keyof Search]?: Search[K] | undefined }) =>
    void navigate({
      search: ((prev: Search) => cleanSearch<Search>({ ...prev, ...patch, page: patch.page ?? 1 })) as never,
    });

  const totalPages = Math.max(1, Math.ceil(data.total / data.perPage));

  return (
    <PublicShell>
      <PageHeader
        title="محصولات عمده"
        subtitle={`${faNumber(data.total)} کالا از تأمین‌کنندگان فعال پلتفرم`}
      />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-20">
          <div className="mb-4 flex items-center gap-2 text-sm font-bold">
            <Filter className="size-4" />
            فیلترها
          </div>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block text-xs">جستجو</Label>
              <Input
                defaultValue={search.q ?? ""}
                placeholder="نام کالا…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") update({ q: (e.target as HTMLInputElement).value || undefined });
                }}
              />
            </div>

            <FacetSelect
              label="دسته‌بندی"
              value={search.category}
              onChange={(v) => update({ category: v })}
              options={facets.categories.map((c) => ({ value: c.slug, label: c.name }))}
            />
            <FacetSelect
              label="شهر"
              value={search.city}
              onChange={(v) => update({ city: v })}
              options={CITIES.map((c) => ({ value: c, label: c }))}
            />
            <FacetSelect
              label="برند"
              value={search.brand}
              onChange={(v) => update({ brand: v })}
              options={facets.brands.map((b) => ({ value: b, label: b }))}
            />
            <FacetSelect
              label="نوع کسب‌وکار"
              value={search.businessType}
              onChange={(v) => update({ businessType: v })}
              options={BUSINESS_TYPES}
            />

            <div>
              <Label className="mb-2 block text-xs">محدوده قیمت (تومان)</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="از"
                  defaultValue={search.minPrice ?? ""}
                  onBlur={(e) => update({ minPrice: e.target.value ? Number(e.target.value) : undefined })}
                />
                <Input
                  type="number"
                  placeholder="تا"
                  defaultValue={search.maxPrice ?? ""}
                  onBlur={(e) => update({ maxPrice: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
            </div>

            <div>
              <Label className="mb-2 block text-xs">حداکثر حداقل سفارش</Label>
              <Input
                type="number"
                placeholder="مثلاً ۱۰۰"
                defaultValue={search.maxMinimumOrder ?? ""}
                onBlur={(e) => update({ maxMinimumOrder: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={Boolean(search.verifiedOnly)}
                onCheckedChange={(v) => update({ verifiedOnly: v === true ? true : undefined })}
              />
              فقط تأمین‌کنندگان تأییدشده
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={Boolean(search.inStockOnly)}
                onCheckedChange={(v) => update({ inStockOnly: v === true ? true : undefined })}
              />
              فقط کالاهای موجود
            </label>

            <Button variant="outline" className="w-full" onClick={() => void navigate({ search: {} as never })}>
              حذف فیلترها
            </Button>
          </div>
        </aside>

        <div>
          {data.items.length === 0 ? (
            <EmptyState
              title="کالایی با این فیلترها پیدا نشد"
              description="فیلترها را تغییر دهید یا درخواست خرید ثبت کنید تا تأمین‌کنندگان به شما پیشنهاد بدهند."
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {data.items.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    disabled={data.page <= 1}
                    onClick={() => update({ page: data.page - 1 })}
                  >
                    قبلی
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    صفحه {faNumber(data.page)} از {faNumber(totalPages)}
                  </span>
                  <Button
                    variant="outline"
                    disabled={data.page >= totalPages}
                    onClick={() => update({ page: data.page + 1 })}
                  >
                    بعدی
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PublicShell>
  );
}

function FacetSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <Label className="mb-2 block text-xs">{label}</Label>
      <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? undefined : v)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>همه</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
