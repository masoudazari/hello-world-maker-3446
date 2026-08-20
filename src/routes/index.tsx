import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, ClipboardList, Handshake, Search, ShieldCheck, Sparkles } from "lucide-react";
import { getHomeData } from "@/lib/catalog.functions";
import { PublicShell } from "@/components/layout/PublicShell";
import { ProductCard } from "@/components/catalog/ProductCard";
import { SupplierCard } from "@/components/catalog/SupplierCard";
import { RequestCard } from "@/components/catalog/RequestCard";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { faNumber } from "@/lib/format";

const homeQuery = queryOptions({
  queryKey: ["home"],
  queryFn: () => getHomeData(),
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(homeQuery);
  },
  head: () => ({
    meta: [
      { title: "عمده‌یار | بازار عمده‌فروشی B2B ایران" },
      {
        name: "description",
        content:
          "درخواست خرید عمده ثبت کنید و در کمترین زمان از تولیدکنندگان، واردکنندگان و عمده‌فروشان معتبر ایران پیشنهاد قیمت بگیرید.",
      },
      { property: "og:title", content: "عمده‌یار | بازار عمده‌فروشی B2B ایران" },
      {
        property: "og:description",
        content: "اتصال مستقیم خریداران عمده به تأمین‌کنندگان معتبر، با استعلام قیمت رایگان.",
      },
    ],
  }),
  component: HomePage,
});

const STEPS = [
  { icon: ClipboardList, title: "درخواست خود را ثبت کنید", text: "کالا، تعداد، شهر تحویل و زمان مورد نیاز را وارد کنید." },
  { icon: Search, title: "تأمین‌کنندگان مطلع می‌شوند", text: "درخواست شما برای تأمین‌کنندگان فعال آن دسته ارسال می‌شود." },
  { icon: Handshake, title: "پیشنهاد بگیرید و انتخاب کنید", text: "قیمت‌ها را مقایسه و بهترین پیشنهاد را نهایی کنید." },
];

function HomePage() {
  const { data } = useSuspenseQuery(homeQuery);

  return (
    <PublicShell>
      <section className="surface-gradient text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Sparkles className="size-3.5" />
              بازار عمده‌فروشی B2B ایران
            </span>
            <h1 className="mt-5 text-3xl font-extrabold leading-tight md:text-5xl md:leading-[1.15]">
              {brand.tagline}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-primary-foreground/80 md:text-base">
              {brand.description} یک بار درخواست بدهید، چند پیشنهاد قیمت دریافت کنید.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button size="lg" variant="secondary" asChild>
                <Link to="/buyer/requests/new">
                  ثبت رایگان درخواست خرید
                  <ArrowLeft className="size-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
                asChild
              >
                <Link to="/products">مشاهده محصولات</Link>
              </Button>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 text-center">
              {[
                { label: "کالای فعال", value: data.stats.products },
                { label: "تأمین‌کننده", value: data.stats.suppliers },
                { label: "درخواست خرید", value: data.stats.requests },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-white/10 p-3">
                  <dt className="text-xs text-primary-foreground/70">{s.label}</dt>
                  <dd className="mt-1 text-lg font-extrabold">{faNumber(s.value)}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-3xl bg-white/10 p-6 backdrop-blur">
            <h2 className="text-sm font-bold">دسته‌بندی‌های پرتقاضا</h2>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {data.categories.slice(0, 9).map((c) => (
                <Link
                  key={c.id}
                  to="/products"
                  search={{ category: c.slug }}
                  className="rounded-xl bg-white/10 px-3 py-3 text-xs font-medium transition-colors hover:bg-white/20"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-center text-2xl font-extrabold">عمده‌یار چگونه کار می‌کند؟</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="rounded-2xl border border-border bg-card p-6">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-bold">
                {faNumber(i + 1)}. {s.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16">
        <SectionTitle title="محصولات منتخب" href="/products" />
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {data.products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="bg-secondary/40 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <SectionTitle title="تأمین‌کنندگان برتر" href="/suppliers" />
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {data.suppliers.map((s) => (
              <SupplierCard key={s.id} supplier={s} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <SectionTitle title="آخرین درخواست‌های خرید" href="/purchase-requests" />
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.requests.map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20">
        <div className="grid gap-4 rounded-3xl border border-border bg-card p-8 md:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "تأمین‌کنندگان احراز هویت شده", text: "مدارک شرکت‌ها پیش از فعال‌سازی بررسی می‌شود." },
            { icon: BadgeCheck, title: "امتیاز و اعتبار شفاف", text: "امتیاز هر تأمین‌کننده بر پایه معاملات و نظرات واقعی است." },
            { icon: Handshake, title: "مذاکره مستقیم", text: "پیام‌رسان داخلی برای هماهنگی سریع خریدار و فروشنده." },
          ].map((f) => (
            <div key={f.title} className="flex gap-3">
              <f.icon className="size-6 shrink-0 text-primary" />
              <div>
                <h3 className="text-sm font-bold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}

function SectionTitle({ title, href }: { title: string; href: "/products" | "/suppliers" | "/purchase-requests" }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 className="text-xl font-extrabold md:text-2xl">{title}</h2>
      <Link to={href} className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        مشاهده همه
        <ArrowLeft className="size-4" />
      </Link>
    </div>
  );
}
