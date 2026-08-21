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

function BuyerRequests() {
  const { data: account } = useAccount();
  const userId = account?.userId ?? null;

  const { data: requests = [] } = useQuery({
    queryKey: ["buyer-requests", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data } = await supabase
        .from("purchase_requests")
        .select("id, product_name, quantity, unit, delivery_city, status, offers_count, created_at")
        .eq("buyer_id", userId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

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
          {requests.map((r) => (
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
