import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { CalendarClock, MapPin, MessageSquareQuote, Package } from "lucide-react";
import { getPublicRequest } from "@/lib/catalog.functions";
import { PublicShell } from "@/components/layout/PublicShell";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { faDate, faNumber, timeAgo, toman } from "@/lib/format";
import { labelOf, QUALITY_LEVELS, TIMEFRAMES } from "@/lib/constants";

function requestQuery(id: string) {
  return queryOptions({ queryKey: ["public-request", id], queryFn: () => getPublicRequest({ data: { id } }) });
}

export const Route = createFileRoute("/purchase-requests/$id")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(requestQuery(params.id));
    if (!data) throw notFound();
    return { name: data.product_name, city: data.delivery_city as string | null };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "درخواست یافت نشد | عمده‌یار" }, { name: "robots", content: "noindex" }] };
    }
    const description = `درخواست خرید عمده ${loaderData.name}${loaderData.city ? ` با تحویل در ${loaderData.city}` : ""}. تأمین‌کنندگان می‌توانند پیشنهاد قیمت ثبت کنند.`;
    return {
      meta: [
        { title: `درخواست خرید ${loaderData.name} | عمده‌یار` },
        { name: "description", content: description },
        { property: "og:title", content: `درخواست خرید ${loaderData.name} | عمده‌یار` },
        { property: "og:description", content: description },
      ],
    };
  },
  component: RequestPage,
});

function RequestPage() {
  const { id } = Route.useParams();
  const { data: request } = useSuspenseQuery(requestQuery(id));
  if (!request) return null;

  return (
    <PublicShell>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <Link to="/purchase-requests" className="text-xs text-muted-foreground hover:text-foreground">
          ← بازگشت به درخواست‌ها
        </Link>

        <div className="mt-4 rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold">{request.product_name}</h1>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarClock className="size-3.5" />
                  {timeAgo(request.created_at)}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquareQuote className="size-3.5" />
                  {faNumber(request.offers_count ?? 0)} پیشنهاد ثبت‌شده
                </span>
              </p>
            </div>
            <StatusBadge kind="request" value={request.status} />
          </div>

          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            <Row icon={<Package className="size-4" />} label="مقدار مورد نیاز" value={`${faNumber(request.quantity ?? 0)} ${request.unit ?? ""}`} />
            <Row icon={<MapPin className="size-4" />} label="شهر تحویل" value={request.delivery_city ?? "—"} />
            <Row label="کیفیت مورد انتظار" value={labelOf(QUALITY_LEVELS, request.quality)} />
            <Row label="بازه زمانی" value={labelOf(TIMEFRAMES, request.timeframe)} />
            <Row label="تاریخ نیاز" value={request.required_date ? faDate(request.required_date) : "—"} />
            <Row label="دسته‌بندی" value={request.categories?.name ?? "—"} />
            {(request.budget_min || request.budget_max) && (
              <Row
                label="بودجه"
                value={`${toman(request.budget_min)} تا ${toman(request.budget_max)}`}
              />
            )}
            <Row label="اعتبار درخواست" value={request.expires_at ? faDate(request.expires_at) : "—"} />
          </dl>

          {request.description && (
            <div className="mt-6">
              <h2 className="text-sm font-bold">توضیحات خریدار</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-7 text-muted-foreground">{request.description}</p>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3 border-t border-border pt-6">
            <Button asChild>
              <Link to="/supplier/requests">ثبت پیشنهاد قیمت (تأمین‌کننده)</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/buyer/requests/new">من هم چنین نیازی دارم</Link>
            </Button>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}

function Row({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/60 p-3">
      <dt className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold">{value}</dd>
    </div>
  );
}
