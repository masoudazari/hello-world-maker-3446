import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { BadgeCheck, Building2, CalendarDays, MapPin, Percent, Star } from "lucide-react";
import { getSupplier } from "@/lib/catalog.functions";
import { PublicShell } from "@/components/layout/PublicShell";
import { ProductCard } from "@/components/catalog/ProductCard";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { BUSINESS_TYPES, labelOf } from "@/lib/constants";
import { fa, faDate, faNumber } from "@/lib/format";

function supplierQuery(id: string) {
  return queryOptions({ queryKey: ["supplier", id], queryFn: () => getSupplier({ data: { id } }) });
}

export const Route = createFileRoute("/suppliers/$id")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(supplierQuery(params.id));
    if (!data) throw notFound();
    return { name: data.supplier.company_name, city: data.supplier.city as string | null };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "تأمین‌کننده یافت نشد | عمده‌یار" }, { name: "robots", content: "noindex" }] };
    }
    const description = `پروفایل ${loaderData.name}${loaderData.city ? ` در ${loaderData.city}` : ""}: محصولات عمده، امتیاز، سابقه معاملات و نظرات خریداران.`;
    return {
      meta: [
        { title: `${loaderData.name} | تأمین‌کننده در عمده‌یار` },
        { name: "description", content: description },
        { property: "og:title", content: `${loaderData.name} | عمده‌یار` },
        { property: "og:description", content: description },
      ],
    };
  },
  component: SupplierPage,
});

function SupplierPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(supplierQuery(id));
  if (!data) return null;
  const { supplier, products, reviews } = data;

  return (
    <PublicShell>
      <div className="border-b border-border bg-secondary/30">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-5 px-4 py-10">
          <span className="flex size-20 items-center justify-center overflow-hidden rounded-2xl bg-card text-muted-foreground">
            {supplier.logo_url ? (
              <img src={supplier.logo_url} alt={supplier.company_name} className="size-full object-cover" />
            ) : (
              <Building2 className="size-8" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold">{supplier.company_name}</h1>
              {supplier.verification_status === "verified" && <BadgeCheck className="size-5 text-primary" />}
              <StatusBadge kind="verification" value={supplier.verification_status} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span>{labelOf(BUSINESS_TYPES, supplier.business_type)}</span>
              {supplier.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-4" />
                  {supplier.city}
                </span>
              )}
              {supplier.founded_year && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="size-4" />
                  تأسیس {fa(supplier.founded_year)}
                </span>
              )}
              {supplier.response_rate !== null && (
                <span className="flex items-center gap-1">
                  <Percent className="size-4" />
                  نرخ پاسخ‌گویی {fa(supplier.response_rate)}٪
                </span>
              )}
            </div>
          </div>
          <Button asChild>
            <Link to="/buyer/requests/new">درخواست قیمت</Link>
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "امتیاز", value: fa((supplier.rating ?? 0).toFixed(1)) },
            { label: "تعداد نظرات", value: faNumber(supplier.reviews_count ?? 0) },
            { label: "معاملات موفق", value: faNumber(supplier.deals_count ?? 0) },
            { label: "امتیاز اعتبار", value: faNumber(supplier.supplier_score ?? 0) },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-4 text-center">
              <dt className="text-xs text-muted-foreground">{s.label}</dt>
              <dd className="mt-1 text-lg font-extrabold">{s.value}</dd>
            </div>
          ))}
        </dl>

        {supplier.description && (
          <section className="mt-8">
            <h2 className="text-lg font-bold">درباره شرکت</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">{supplier.description}</p>
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-lg font-bold">محصولات این تأمین‌کننده</h2>
          <div className="mt-4">
            {products.length === 0 ? (
              <EmptyState title="هنوز محصولی ثبت نشده است" />
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {products.map((p) => (
                  <ProductCard key={p.id} product={{ ...p, suppliers: null }} />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-bold">نظرات خریداران</h2>
          <div className="mt-4 space-y-3">
            {reviews.length === 0 ? (
              <EmptyState title="هنوز نظری ثبت نشده است" />
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-bold text-foreground">
                      <Star className="size-3.5 fill-accent text-accent" />
                      {fa(r.overall_score)}
                    </span>
                    <span>{faDate(r.created_at)}</span>
                  </div>
                  {r.comment && <p className="mt-2 text-sm leading-6">{r.comment}</p>}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
