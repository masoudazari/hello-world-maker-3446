import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PanelShell } from "@/components/layout/PanelShell";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { faDate, faNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/requests")({
  head: () => ({
    meta: [
      { title: "مدیریت درخواست‌های خرید | عمده‌یار" },
      { name: "description", content: "پایش درخواست‌های خرید عمده و پیشنهادهای دریافتی." },
      { property: "og:title", content: "مدیریت درخواست‌های خرید" },
      { property: "og:description", content: "نظارت بر جریان درخواست و پیشنهاد در پلتفرم." },
    ],
  }),
  component: AdminRequests,
});

function AdminRequests() {
  const { data: requests = [] } = useQuery({
    queryKey: ["admin-requests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("purchase_requests")
        .select("id, product_name, quantity, unit, delivery_city, status, offers_count, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  return (
    <PanelShell role="admin" title="درخواست‌های خرید" subtitle={`${faNumber(requests.length)} درخواست`}>
      {requests.length === 0 ? (
        <EmptyState title="درخواستی ثبت نشده است" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-right text-sm">
            <thead className="bg-secondary/50 text-xs text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">کالا</th>
                <th className="p-3 font-medium">مقدار</th>
                <th className="p-3 font-medium">شهر تحویل</th>
                <th className="p-3 font-medium">پیشنهادها</th>
                <th className="p-3 font-medium">تاریخ</th>
                <th className="p-3 font-medium">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {requests.map((r) => (
                <tr key={r.id}>
                  <td className="p-3 font-medium">{r.product_name}</td>
                  <td className="p-3">{faNumber(Number(r.quantity))} {r.unit}</td>
                  <td className="p-3">{r.delivery_city}</td>
                  <td className="p-3">{faNumber(r.offers_count)}</td>
                  <td className="p-3 text-muted-foreground">{faDate(r.created_at)}</td>
                  <td className="p-3"><StatusBadge kind="request" value={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PanelShell>
  );
}
