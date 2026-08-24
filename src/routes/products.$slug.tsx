import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { BadgeCheck, Building2, MapPin, Package, ShieldCheck, Star } from "lucide-react";
import { getProduct } from "@/lib/catalog.functions";
import { PublicShell } from "@/components/layout/PublicShell";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fa, faNumber, toman } from "@/lib/format";
import { BUSINESS_TYPES, labelOf } from "@/lib/constants";

function productQuery(slug: string) {
  return queryOptions({
    queryKey: ["product", slug],
    queryFn: () => getProduct({ data: { slug } }),
  });
}

export const Route = createFileRoute("/products/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(productQuery(params.slug));
    if (!data) throw notFound();
    return { name: data.product.name, description: data.product.description as string | null };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "کالا یافت نشد | عمده‌یار" }, { name: "robots", content: "noindex" }] };
    }
    const description = (loaderData.description ?? `خرید عمده ${loaderData.name} با قیمت پلکانی از تأمین‌کنندگان معتبر.`).slice(0, 155);
    return {
      meta: [
        { title: `${loaderData.name} | خرید عمده در عمده‌یار` },
        { name: "description", content: description },
        { property: "og:title", content: `${loaderData.name} | عمده‌یار` },
        { property: "og:description", content: description },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(productQuery(slug));
  if (!data) return null;
  const { product, prices, images } = data;
  const supplier = product.suppliers;
  const gallery = images.length > 0 ? images.map((i) => i.image_url) : product.image_url ? [product.image_url] : [];

  return (
    <PublicShell>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <nav className="mb-6 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">خانه</Link>
          <span className="mx-2">/</span>
          <Link to="/products" className="hover:text-foreground">محصولات</Link>
          {product.categories && (
            <>
              <span className="mx-2">/</span>
              <Link to="/products" search={{ category: product.categories.slug }} className="hover:text-foreground">
                {product.categories.name}
              </Link>
            </>
          )}
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="overflow-hidden rounded-2xl border border-border bg-secondary">
              {gallery[0] ? (
                <img src={gallery[0]} alt={product.name} className="aspect-16/10 w-full object-cover" />
              ) : (
                <div className="flex aspect-16/10 items-center justify-center text-muted-foreground">
                  <Package className="size-10" />
                </div>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {gallery.slice(0, 5).map((url) => (
                  <img key={url} src={url} alt={product.name} className="aspect-square rounded-lg object-cover" />
                ))}
              </div>
            )}

            <h1 className="mt-6 text-2xl font-extrabold">{product.name}</h1>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {product.brand && <span>برند: {product.brand}</span>}
              {product.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-4" />
                  {product.city}
                </span>
              )}
              <span>واحد: {product.unit}</span>
              <span>
                موجودی: {product.stock && product.stock > 0 ? faNumber(product.stock) : "استعلامی"}
              </span>
            </div>

            {product.description && (
              <section className="mt-8">
                <h2 className="text-lg font-bold">توضیحات کالا</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">
                  {product.description}
                </p>
              </section>
            )}

            {prices.length > 0 && (
              <section className="mt-8">
                <h2 className="text-lg font-bold">قیمت پلکانی</h2>
                <div className="mt-3 overflow-hidden rounded-2xl border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-start">تعداد</TableHead>
                        <TableHead className="text-start">قیمت هر {product.unit}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prices.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>
                            {faNumber(row.min_quantity)}
                            {row.max_quantity ? ` تا ${faNumber(row.max_quantity)}` : " به بالا"}
                          </TableCell>
                          <TableCell className="font-bold text-primary">{toman(row.unit_price)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground">قیمت پایه</p>
              <p className="mt-1 text-2xl font-extrabold text-primary">{toman(product.base_price)}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                حداقل سفارش: {faNumber(product.minimum_order)} {product.unit}
              </p>
              <Button className="mt-5 w-full" size="lg" asChild>
                <Link to="/buyer/requests/new" search={{ need: `${product.minimum_order} ${product.unit} ${product.name}` }}>
                  استعلام قیمت / ثبت درخواست
                </Link>
              </Button>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="size-4 text-primary" />
                ارتباط با تأمین‌کننده از طریق پنل کاربری انجام می‌شود.
              </p>
            </div>

            {supplier && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                    <Building2 className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 truncate text-sm font-bold">
                      {supplier.company_name}
                      {supplier.verification_status === "verified" && <BadgeCheck className="size-4 text-primary" />}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {labelOf(BUSINESS_TYPES, supplier.business_type)} · {supplier.city}
                    </p>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-secondary p-2">
                    <dt className="text-muted-foreground">امتیاز</dt>
                    <dd className="mt-1 flex items-center justify-center gap-1 font-bold">
                      <Star className="size-3.5 fill-accent text-accent" />
                      {fa((supplier.rating ?? 0).toFixed(1))}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-secondary p-2">
                    <dt className="text-muted-foreground">معاملات</dt>
                    <dd className="mt-1 font-bold">{faNumber(supplier.deals_count ?? 0)}</dd>
                  </div>
                  <div className="rounded-lg bg-secondary p-2">
                    <dt className="text-muted-foreground">اعتبار</dt>
                    <dd className="mt-1 font-bold">{faNumber(supplier.supplier_score ?? 0)}</dd>
                  </div>
                </dl>
                <Button variant="outline" className="mt-4 w-full" asChild>
                  <Link to="/suppliers/$id" params={{ id: supplier.id }}>
                    مشاهده پروفایل تأمین‌کننده
                  </Link>
                </Button>
              </div>
            )}
          </aside>
        </div>
      </div>
    </PublicShell>
  );
}
