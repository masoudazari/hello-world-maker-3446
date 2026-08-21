import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PanelShell } from "@/components/layout/PanelShell";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/auth";
import { faDate, faNumber, toman } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/supplier/offers")({
  head: () => ({
    meta: [
      { title: "پیشنهادهای من | عمده‌یار" },
      { name: "description", content: "وضعیت پیشنهادهای قیمت ارسال‌شده به خریداران عمده." },
      { property: "og:title", content: "پیشنهادهای قیمت من" },
      { property: "og:description", content: "پیگیری پذیرش یا رد پیشنهادهای ارسالی." },
    ],
  }),
  component: SupplierOffers,
});

function SupplierOffers() {
  const { data: account } = useAccount();
  const supplierId = account?.supplierId ?? null;

  const { data: offers = [] } = useQuery({
    queryKey: ["supplier-offers", supplierId],
    enabled: Boolean(supplierId),
    queryFn: async () => {
      const { data } = await supabase
        .from("supplier_offers")
        .select("id, unit_price, total_price, available_quantity, status, created_at, purchase_requests(product_name, unit, delivery_city)")
        .eq("supplier_id", supplierId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <PanelShell role="supplier" title="پیشنهادهای من" subtitle="همه پیشنهادهای قیمتی که ارسال کرده‌اید">
      {offers.length === 0 ? (
        <EmptyState title="پیشنهادی ثبت نشده" description="از بخش فرصت‌های فروش، اولین پیشنهاد خود را ارسال کنید." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-right text-sm">
            <thead className="bg-secondary/50 text-xs text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">کالا</th>
                <th className="p-3 font-medium">قیمت واحد</th>
                <th className="p-3 font-medium">مبلغ کل</th>
                <th className="p-3 font-medium">شهر تحویل</th>
                <th className="p-3 font-medium">تاریخ</th>
                <th className="p-3 font-medium">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {offers.map((o) => (
                <tr key={o.id}>
                  <td className="p-3 font-medium">{o.purchase_requests?.product_name ?? "—"}</td>
                  <td className="p-3">{toman(o.unit_price)}</td>
                  <td className="p-3">{toman(o.total_price)}</td>
                  <td className="p-3">{o.purchase_requests?.delivery_city ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{faDate(o.created_at)}</td>
                  <td className="p-3"><StatusBadge kind="offer" value={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-border p-3 text-xs text-muted-foreground">
            مجموع {faNumber(offers.length)} پیشنهاد
          </p>
        </div>
      )}
    </PanelShell>
  );
}
