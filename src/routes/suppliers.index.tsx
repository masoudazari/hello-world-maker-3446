import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listSuppliers } from "@/lib/catalog.functions";
import { PublicShell, PageHeader } from "@/components/layout/PublicShell";
import { SupplierCard } from "@/components/catalog/SupplierCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BUSINESS_TYPES, CITIES } from "@/lib/constants";
import { faNumber } from "@/lib/format";

type Search = { q?: string; city?: string; businessType?: string; verifiedOnly?: boolean };
const ALL = "__all__";

function suppliersQuery(search: Search) {
  return queryOptions({
    queryKey: ["suppliers", search],
    queryFn: () => listSuppliers({ data: search }),
  });
}

export const Route = createFileRoute("/suppliers/")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    q: (search["q"] as string) || undefined,
    city: (search["city"] as string) || undefined,
    businessType: (search["businessType"] as string) || undefined,
    verifiedOnly: search["verifiedOnly"] === true || search["verifiedOnly"] === "true" || undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    void context.queryClient.ensureQueryData(suppliersQuery(deps));
  },
  head: () => ({
    meta: [
      { title: "تأمین‌کنندگان معتبر | عمده‌یار" },
      { name: "description", content: "فهرست تولیدکنندگان، واردکنندگان، توزیع‌کنندگان و عمده‌فروشان تأییدشده به همراه امتیاز و سابقه معاملات." },
      { property: "og:title", content: "تأمین‌کنندگان معتبر | عمده‌یار" },
      { property: "og:description", content: "تأمین‌کننده مناسب کسب‌وکار خود را بر اساس شهر، نوع فعالیت و امتیاز پیدا کنید." },
    ],
  }),
  component: SuppliersPage,
});

function SuppliersPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/suppliers" });
  const { data } = useSuspenseQuery(suppliersQuery(search));
  const update = (patch: Partial<Search>) => navigate({ search: (prev) => ({ ...prev, ...patch }) });

  return (
    <PublicShell>
      <PageHeader title="تأمین‌کنندگان" subtitle={`${faNumber(data.length)} تأمین‌کننده در فهرست فعلی`} />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-4">
          <Input
            defaultValue={search.q ?? ""}
            placeholder="نام شرکت…"
            onKeyDown={(e) => {
              if (e.key === "Enter") update({ q: (e.target as HTMLInputElement).value || undefined });
            }}
          />
          <Select value={search.city ?? ALL} onValueChange={(v) => update({ city: v === ALL ? undefined : v })}>
            <SelectTrigger><SelectValue placeholder="شهر" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>همه شهرها</SelectItem>
              {CITIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={search.businessType ?? ALL}
            onValueChange={(v) => update({ businessType: v === ALL ? undefined : v })}
          >
            <SelectTrigger><SelectValue placeholder="نوع کسب‌وکار" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>همه</SelectItem>
              {BUSINESS_TYPES.map((b) => (
                <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={Boolean(search.verifiedOnly)}
              onCheckedChange={(v) => update({ verifiedOnly: v === true ? true : undefined })}
            />
            فقط تأییدشده‌ها
          </label>
        </div>

        {data.length === 0 ? (
          <EmptyState title="تأمین‌کننده‌ای یافت نشد" description="فیلترها را تغییر دهید." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.map((s) => (
              <SupplierCard key={s.id} supplier={s} />
            ))}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
