import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listCategories, listOpenRequests } from "@/lib/catalog.functions";
import { PublicShell, PageHeader } from "@/components/layout/PublicShell";
import { RequestCard } from "@/components/catalog/RequestCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CITIES } from "@/lib/constants";
import { faNumber } from "@/lib/format";
import { cleanSearch } from "@/lib/search";

type Search = { q?: string | undefined; city?: string | undefined; category?: string | undefined };
const ALL = "__all__";

function requestsQuery(search: Search) {
  return queryOptions({
    queryKey: ["open-requests", search],
    queryFn: () => listOpenRequests({ data: search }),
  });
}

const categoriesQuery = queryOptions({ queryKey: ["categories"], queryFn: () => listCategories() });

export const Route = createFileRoute("/purchase-requests/")({
  validateSearch: (search: Record<string, unknown>): Search =>
    cleanSearch<Search>({
      q: search["q"],
      city: search["city"],
      category: search["category"],
    }),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    void context.queryClient.ensureQueryData(requestsQuery(deps));
    void context.queryClient.ensureQueryData(categoriesQuery);
  },
  head: () => ({
    meta: [
      { title: "درخواست‌های خرید عمده | عمده‌یار" },
      { name: "description", content: "آخرین درخواست‌های خرید عمده خریداران؛ تأمین‌کنندگان می‌توانند پیشنهاد قیمت ثبت کنند." },
      { property: "og:title", content: "درخواست‌های خرید عمده | عمده‌یار" },
      { property: "og:description", content: "فرصت‌های فروش عمده را ببینید و پیشنهاد قیمت بدهید." },
    ],
  }),
  component: RequestsPage,
});

function RequestsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/purchase-requests/" });
  const { data } = useSuspenseQuery(requestsQuery(search));
  const { data: categories } = useSuspenseQuery(categoriesQuery);
  const update = (patch: { [K in keyof Search]?: Search[K] | undefined }) =>
    void navigate({ search: ((prev: Search) => cleanSearch<Search>({ ...prev, ...patch })) as never });

  return (
    <PublicShell>
      <PageHeader
        title="درخواست‌های خرید"
        subtitle={`${faNumber(data.length)} درخواست باز از خریداران عمده`}
        action={
          <Button asChild>
            <Link to="/buyer/requests/new">ثبت درخواست جدید</Link>
          </Button>
        }
      />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-3">
          <Input
            defaultValue={search.q ?? ""}
            placeholder="نام کالا…"
            onKeyDown={(e) => {
              if (e.key === "Enter") update({ q: (e.target as HTMLInputElement).value || undefined });
            }}
          />
          <Select value={search.category ?? ALL} onValueChange={(v) => update({ category: v === ALL ? undefined : v })}>
            <SelectTrigger><SelectValue placeholder="دسته‌بندی" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>همه دسته‌ها</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={search.city ?? ALL} onValueChange={(v) => update({ city: v === ALL ? undefined : v })}>
            <SelectTrigger><SelectValue placeholder="شهر تحویل" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>همه شهرها</SelectItem>
              {CITIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {data.length === 0 ? (
          <EmptyState title="درخواستی یافت نشد" description="فیلترها را تغییر دهید یا بعداً دوباره سر بزنید." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.map((r) => (
              <RequestCard key={r.id} request={r} />
            ))}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
