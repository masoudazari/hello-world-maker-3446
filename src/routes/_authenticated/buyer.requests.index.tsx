import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PanelShell } from "@/components/layout/PanelShell";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/auth";
import { faDate, faNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/buyer/requests/")({
  head: () => ({
    meta: [
      { title: "درخواست‌های خرید من | عمده‌یار" },
      { name: "description", content: "فهرست درخواست‌های خرید عمده ثبت‌شده و پیشنهادهای دریافتی." },
      { property: "og:title", content: "درخواست‌های خرید من" },
      { property: "og:description", content: "پیگیری درخواست‌های خرید عمده در عمده‌یار." },
    ],
  }),
  component: BuyerRequests,
});

type RequestRow = {
  id: string;
  product_name: string;
  quantity: number;
  unit: string;
  delivery_city: string;
  status: string;
  offers_count: number;
  created_at: string;
  batch_id: string | null;
};

function BuyerRequests() {
  const { data: account } = useAccount();
  const userId = account?.userId ?? null;

  const { data: requests = [] } = useQuery({
    queryKey: ["buyer-requests", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data } = await supabase
        .from("purchase_requests")
        .select("id, product_name, quantity, unit, delivery_city, status, offers_count, created_at, batch_id")
        .eq("buyer_id", userId!)
        .order("created_at", { ascending: false });
      return (data ?? []) as RequestRow[];
    },
  });

  // Requests submitted together (same batch_id) are grouped into one
  // visual card; each item still links to its own independent RFQ page.
  const groups = useMemo(() => {
    const map = new Map<string, RequestRow[]>();
    const singles: RequestRow[] = [];
    for (const r of requests) {
      if (r.batch_id) {
        const arr = map.get(r.batch_id) ?? [];
        arr.push(r);
        map.set(r.batch_id, arr);
      } else {
        singles.push(r);
      }
    }
    const batchGroups = Array.from(map.entries()).map(([batch_id, items]) => ({ batch_id, items }));
    return { batchGroups, singles };
  }, [requests]);

  return (
    <PanelShell
      role="buyer"
      title="درخواست‌های خرید من"
      subtitle="هر درخواست را باز کنید تا پیشنهادهای تأمین‌کنندگان را ببینید."
      action={
        <Button asChild>
          <Link to="/buyer/requests/new">درخواست جدید</Link>
        </Button>
      }
    >
      {requests.length === 0 ? (
        <EmptyState title="درخواستی ثبت نشده است" description="اولین نیاز خرید عمده خود را ثبت کنید." />
      ) : (
        <div className="grid gap-3">
          {groups.batchGroups.map(({ batch_id, items }) => (
            <div key={batch_id} className="rounded-2xl border border-border bg-card p-4">
              <p className="mb-3 text-xs font-medium text-muted-foreground">
                سفارش ترکیبی ({faNumber(items.length)} قلم) · {faDate(items[0].created_at)}
              </p>
              <div className="grid gap-2">
                {items.map((r) => (
                  <Link
                    key={r.id}
                    to="/buyer/requests/$id"
                    params={{ id: r.id }}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-background p-3 transition hover:border-primary/40"
                  >
                    <div>
                      <p className="font-medium">{r.product_name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {faNumber(Number(r.quantity))} {r.unit} · تحویل در {r.delivery_city}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-lg bg-secondary px-2 py-1 text-xs">{faNumber(r.offers_count ?? 0)} پیشنهاد</span>
                      <StatusBadge kind="request" value={r.status} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {groups.singles.map((r) => (
            <Link
              key={r.id}
              to="/buyer/requests/$id"
              params={{ id: r.id }}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40"
            >
              <div>
                <p className="font-semibold">{r.product_name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {faNumber(Number(r.quantity))} {r.unit} · تحویل در {r.delivery_city} · {faDate(r.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-secondary px-2 py-1 text-xs">
                  {faNumber(r.offers_count ?? 0)} پیشنهاد
                </span>
                <StatusBadge kind="request" value={r.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
